import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { getDatabase, db_helpers } from '@/lib/db'
import { eventBus } from '@/lib/event-bus'
import { requireRole } from '@/lib/auth'
import { mutationLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { config } from '@/lib/config'

/**
 * POST /api/tasks/[id]/dispatch — Send a task to an OpenClaw agent for execution.
 *
 * The agent receives the task title + description as its message.
 * The task stays in_progress until the agent finishes, then moves to review
 * (never straight to done — Aegis approval required).
 *
 * Body (optional):
 *   { message?: string }   — override the message sent to the agent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = mutationLimiter(request)
  if (rateCheck) return rateCheck

  const resolvedParams = await params
  const taskId = parseInt(resolvedParams.id)
  if (isNaN(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
  }

  const db = getDatabase()
  const workspaceId = auth.user.workspace_id ?? 1

  const task = db.prepare(`
    SELECT * FROM tasks WHERE id = ? AND workspace_id = ?
  `).get(taskId, workspaceId) as any
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  if (!task.assigned_to) {
    return NextResponse.json({ error: 'Task must be assigned to an agent before dispatching' }, { status: 400 })
  }

  if (task.status === 'done') {
    return NextResponse.json({ error: 'Cannot dispatch a completed task' }, { status: 400 })
  }

  // Parse optional body
  let customMessage: string | undefined
  try {
    const body = await request.json()
    customMessage = body?.message
  } catch {
    // No body or invalid JSON — use task content
  }

  const agentMessage = customMessage || `Task: ${task.title}\n\n${task.description || 'No description provided.'}`

  // Update task to in_progress
  const now = Math.floor(Date.now() / 1000)
  db.prepare(`UPDATE tasks SET status = 'in_progress', updated_at = ? WHERE id = ? AND workspace_id = ?`)
    .run(now, taskId, workspaceId)

  // Add dispatch comment
  db.prepare(`
    INSERT INTO comments (task_id, author, content, created_at, workspace_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(taskId, auth.user.username, `Dispatched to agent **${task.assigned_to}**.`, now, workspaceId)

  // Log activity
  db_helpers.logActivity(
    'task_dispatched',
    'task',
    taskId,
    auth.user.username,
    `Task dispatched to agent "${task.assigned_to}"`,
    { agentId: task.assigned_to },
    workspaceId
  )

  // Broadcast status change
  const updatedTask = db.prepare(`SELECT * FROM tasks WHERE id = ? AND workspace_id = ?`).get(taskId, workspaceId) as any
  if (updatedTask) {
    updatedTask.tags = updatedTask.tags ? JSON.parse(updatedTask.tags) : []
    updatedTask.metadata = updatedTask.metadata ? JSON.parse(updatedTask.metadata) : {}
  }
  eventBus.broadcast('task.updated', updatedTask)

  // Dispatch to OpenClaw agent in background
  dispatchToAgent(task.assigned_to, agentMessage, taskId, workspaceId, auth.user.username)

  return NextResponse.json({
    ok: true,
    message: `Task dispatched to agent "${task.assigned_to}"`,
    task_id: taskId,
    agent: task.assigned_to,
  })
}

/**
 * Fire-and-forget: run `openclaw agent` and update the task when it completes.
 */
function dispatchToAgent(
  agentId: string,
  message: string,
  taskId: number,
  workspaceId: number,
  actor: string
) {
  const args = ['agent', '--agent', agentId, '--message', message, '--json']
  logger.info({ agentId, taskId, bin: config.openclawBin }, 'Dispatching task to OpenClaw agent')

  const child = spawn(config.openclawBin, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 600_000, // 10 min max
  })

  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
  child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

  child.on('close', (code) => {
    const db = getDatabase()
    const now = Math.floor(Date.now() / 1000)
    const success = code === 0

    // Move to done on success, keep in_progress on failure
    const newStatus = success ? 'done' : 'in_progress'

    db.prepare(`UPDATE tasks SET status = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`)
      .run(newStatus, now, taskId, workspaceId)

    // Add result comment
    let comment = success
      ? `Agent **${agentId}** completed the task successfully.`
      : `Agent **${agentId}** finished with an error (exit code ${code}).`

    // Try to extract useful output
    if (stdout) {
      try {
        const result = JSON.parse(stdout)
        if (result.response) {
          comment += `\n\n**Agent response:**\n> ${result.response.slice(0, 1000)}`
        }
      } catch {
        const preview = stdout.slice(0, 500).trim()
        if (preview) comment += `\n\n**Output:**\n\`\`\`\n${preview}\n\`\`\``
      }
    }
    if (!success && stderr) {
      comment += `\n\n**Error:**\n\`\`\`\n${stderr.slice(0, 500)}\n\`\`\``
    }

    try {
      db.prepare(`INSERT INTO comments (task_id, author, content, created_at, workspace_id) VALUES (?, ?, ?, ?, ?)`)
        .run(taskId, 'dispatch-bridge', comment, now, workspaceId)
    } catch { /* best effort */ }

    // Log activity
    db_helpers.logActivity(
      'task_updated',
      'task',
      taskId,
      'dispatch-bridge',
      `Agent "${agentId}" ${success ? 'completed task' : 'failed'} (exit ${code})`,
      { agentId, exitCode: code, success },
      workspaceId
    )

    // Broadcast update
    const finalTask = db.prepare(`SELECT * FROM tasks WHERE id = ? AND workspace_id = ?`).get(taskId, workspaceId) as any
    if (finalTask) {
      finalTask.tags = finalTask.tags ? JSON.parse(finalTask.tags) : []
      finalTask.metadata = finalTask.metadata ? JSON.parse(finalTask.metadata) : {}
    }
    eventBus.broadcast('task.updated', finalTask)

    logger.info({ agentId, taskId, exitCode: code, success }, 'Agent dispatch completed')
  })

  child.on('error', (err) => {
    logger.error({ err, agentId, taskId }, 'Failed to spawn openclaw agent')
    const db = getDatabase()
    const now = Math.floor(Date.now() / 1000)
    try {
      db.prepare(`INSERT INTO comments (task_id, author, content, created_at, workspace_id) VALUES (?, ?, ?, ?, ?)`)
        .run(taskId, 'dispatch-bridge', `Failed to dispatch to agent **${agentId}**: ${err.message}`, now, workspaceId)
    } catch { /* best effort */ }
  })
}
