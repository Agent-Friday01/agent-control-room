import { readFileSync } from 'fs'
import { join } from 'path'
import { getDatabase, db_helpers } from './db'
import { config } from './config'
import { eventBus } from './event-bus'
import { logger } from './logger'

interface OpenClawCronJob {
  id: string
  agentId: string
  name: string
  enabled: boolean
  schedule: {
    kind: string
    expr: string
    tz?: string
  }
  payload: {
    kind: string
    message?: string
    model?: string
    timeoutSeconds?: number
  }
  delivery?: {
    mode: string
    channel?: string
    to?: string
  }
  state?: {
    nextRunAtMs?: number
    lastRunAtMs?: number
    lastStatus?: string
    lastDurationMs?: number
    lastError?: string
    runningAtMs?: number
  }
}

interface CronJobsFile {
  version: number
  jobs: OpenClawCronJob[]
}

// In-memory cache of last known run timestamps per job
const lastKnownRun = new Map<string, number>()
// In-memory cache of last known runningAtMs per job (detects new runs starting)
const lastKnownRunning = new Map<string, number>()
// Track which job+runAt combos have already had their status processed
const processedStatus = new Map<string, string>()

function getCronFilePath(): string {
  const openclawStateDir = config.openclawStateDir
  if (!openclawStateDir) return ''
  return join(openclawStateDir, 'cron', 'jobs.json')
}

function loadCronJobs(): OpenClawCronJob[] {
  const filePath = getCronFilePath()
  if (!filePath) return []
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const data: CronJobsFile = JSON.parse(raw)
    return data.jobs || []
  } catch {
    return []
  }
}

function resolveProjectId(db: ReturnType<typeof getDatabase>, workspaceId: number): number {
  const row = db.prepare(
    `SELECT id FROM projects WHERE workspace_id = ? AND slug = 'general' LIMIT 1`
  ).get(workspaceId) as { id: number } | undefined
  return row?.id || 1
}

function findExistingTaskForJob(
  db: ReturnType<typeof getDatabase>,
  cronJobId: string,
  workspaceId: number
): { task_id: number; last_run_at_ms: number } | undefined {
  return db.prepare(
    `SELECT task_id, last_run_at_ms FROM cron_task_map WHERE cron_job_id = ? AND workspace_id = ?`
  ).get(cronJobId, workspaceId) as { task_id: number; last_run_at_ms: number } | undefined
}

function createTaskForCronJob(
  db: ReturnType<typeof getDatabase>,
  job: OpenClawCronJob,
  workspaceId: number
): number {
  const now = Math.floor(Date.now() / 1000)
  const projectId = resolveProjectId(db, workspaceId)

  const taskId = db.transaction(() => {
    // Increment project ticket counter
    db.prepare(
      `UPDATE projects SET ticket_counter = ticket_counter + 1, updated_at = unixepoch() WHERE id = ? AND workspace_id = ?`
    ).run(projectId, workspaceId)

    const row = db.prepare(
      `SELECT ticket_counter FROM projects WHERE id = ? AND workspace_id = ?`
    ).get(projectId, workspaceId) as { ticket_counter: number }

    const result = db.prepare(`
      INSERT INTO tasks (
        title, description, status, priority, project_id, project_ticket_no,
        assigned_to, created_by, created_at, updated_at, tags, metadata, workspace_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `${job.name} — ${new Date().toLocaleDateString('en-CA', { timeZone: job.schedule.tz || 'UTC' })}`,
      `Auto-created from cron job **${job.id}**.\n\nSchedule: \`${job.schedule.expr}\` (${job.schedule.tz || 'UTC'})\n\nAgent: ${job.agentId}\n\nMessage:\n> ${(job.payload.message || '').slice(0, 500)}`,
      'in_progress',
      'medium',
      projectId,
      row.ticket_counter,
      job.agentId,
      'cron-bridge',
      now,
      now,
      JSON.stringify(['cron', job.id, job.agentId]),
      JSON.stringify({
        cron_job_id: job.id,
        cron_agent: job.agentId,
        cron_schedule: job.schedule.expr,
        cron_run_at: job.state?.lastRunAtMs || Date.now()
      }),
      workspaceId
    )

    return Number(result.lastInsertRowid)
  })()

  // Insert mapping
  db.prepare(`
    INSERT OR REPLACE INTO cron_task_map (cron_job_id, task_id, last_run_at_ms, workspace_id)
    VALUES (?, ?, ?, ?)
  `).run(job.id, taskId, job.state?.lastRunAtMs || 0, workspaceId)

  // Log activity
  db_helpers.logActivity(
    'task_created',
    'task',
    taskId,
    'cron-bridge',
    `Task created from cron job "${job.name}" (${job.id})`,
    { cronJobId: job.id, agentId: job.agentId },
    workspaceId
  )

  // Subscribe the agent
  db_helpers.ensureTaskSubscription(taskId, job.agentId, workspaceId)

  // Create notification
  db_helpers.createNotification(
    job.agentId,
    'assignment',
    `Cron task: ${job.name}`,
    `Cron job "${job.name}" triggered and assigned to you.`,
    'task',
    taskId,
    workspaceId
  )

  // Broadcast with parsed JSON fields
  const task = db.prepare(`SELECT * FROM tasks WHERE id = ? AND workspace_id = ?`).get(taskId, workspaceId) as any
  if (task) {
    task.tags = task.tags ? JSON.parse(task.tags) : []
    task.metadata = task.metadata ? JSON.parse(task.metadata) : {}
  }
  eventBus.broadcast('task.created', task)

  return taskId
}

function updateTaskStatus(
  db: ReturnType<typeof getDatabase>,
  taskId: number,
  job: OpenClawCronJob,
  workspaceId: number
) {
  const now = Math.floor(Date.now() / 1000)
  const status = job.state?.lastStatus

  // Map cron status to task status
  let taskStatus: string
  if (status === 'ok') {
    taskStatus = 'done'
  } else if (status === 'error') {
    taskStatus = 'in_progress' // Failed — keep in progress so it's visible
  } else {
    taskStatus = 'in_progress'
  }

  const durationStr = job.state?.lastDurationMs
    ? `${Math.round(job.state.lastDurationMs / 1000)}s`
    : 'unknown'

  let description = `Cron job **${job.id}** finished.\n\n`
  description += `- **Status:** ${status || 'unknown'}\n`
  description += `- **Duration:** ${durationStr}\n`
  if (job.state?.lastError) {
    description += `- **Error:** ${job.state.lastError}\n`
  }

  db.prepare(`
    UPDATE tasks SET status = ?, updated_at = ? WHERE id = ? AND workspace_id = ?
  `).run(taskStatus, now, taskId, workspaceId)

  // Update the mapping with latest run
  db.prepare(`
    UPDATE cron_task_map SET last_run_at_ms = ? WHERE cron_job_id = ? AND workspace_id = ?
  `).run(job.state?.lastRunAtMs || 0, job.id, workspaceId)

  // Add a comment with the result
  try {
    db.prepare(`
      INSERT INTO comments (task_id, author, content, created_at, workspace_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(taskId, 'cron-bridge', description, now, workspaceId)
  } catch {
    // Comments table might have different schema
  }

  // Log activity
  db_helpers.logActivity(
    'task_updated',
    'task',
    taskId,
    'cron-bridge',
    `Cron job "${job.name}" ${status === 'ok' ? 'completed successfully' : 'finished with error'} (${durationStr})`,
    { cronJobId: job.id, status, durationMs: job.state?.lastDurationMs, error: job.state?.lastError },
    workspaceId
  )

  // Broadcast with parsed JSON fields
  const task = db.prepare(`SELECT * FROM tasks WHERE id = ? AND workspace_id = ?`).get(taskId, workspaceId) as any
  if (task) {
    task.tags = task.tags ? JSON.parse(task.tags) : []
    task.metadata = task.metadata ? JSON.parse(task.metadata) : {}
  }
  eventBus.broadcast('task.updated', task)
}

/**
 * Main bridge function — called every 60s by the scheduler.
 * Detects new cron runs and creates/updates tasks accordingly.
 */
export async function syncCronTasks(): Promise<{ ok: boolean; message: string }> {
  try {
    const db = getDatabase()
    const workspaceId = 1
    const jobs = loadCronJobs()

    if (jobs.length === 0) {
      return { ok: true, message: 'No cron jobs configured' }
    }

    // Ensure cron_task_map table exists (defensive — migration should handle this)
    db.exec(`
      CREATE TABLE IF NOT EXISTS cron_task_map (
        cron_job_id TEXT NOT NULL,
        task_id INTEGER NOT NULL,
        last_run_at_ms INTEGER NOT NULL DEFAULT 0,
        workspace_id INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (cron_job_id, workspace_id)
      )
    `)

    let created = 0
    let updated = 0

    for (const job of jobs) {
      if (!job.enabled) continue

      const currentRunAt = job.state?.lastRunAtMs || 0
      const currentRunningAt = job.state?.runningAtMs || 0
      const cachedRunAt = lastKnownRun.get(job.id) || 0
      const cachedRunningAt = lastKnownRunning.get(job.id) || 0
      const existing = findExistingTaskForJob(db, job.id, workspaceId)
      const dbRunAt = existing?.last_run_at_ms || 0

      // Use the higher of in-memory cache and DB value
      const knownRunAt = Math.max(cachedRunAt, dbRunAt)

      // Detect a new run starting via runningAtMs (even before lastRunAtMs updates)
      const newRunDetected = currentRunningAt > cachedRunningAt && currentRunningAt > knownRunAt
      const newCompletionDetected = currentRunAt > knownRunAt

      if (newRunDetected && !newCompletionDetected && !existing) {
        // Job just started running — create task as in_progress
        const taskId = createTaskForCronJob(db, job, workspaceId)
        lastKnownRunning.set(job.id, currentRunningAt)
        // Use runningAtMs as the run key so we can match when it completes
        lastKnownRun.set(job.id, currentRunningAt)
        db.prepare(`UPDATE cron_task_map SET last_run_at_ms = ? WHERE cron_job_id = ? AND workspace_id = ?`)
          .run(currentRunningAt, job.id, workspaceId)
        created++
        logger.info({ cronJobId: job.id, taskId }, 'Cron-task bridge: created task for running job')
      } else if (newCompletionDetected) {
        if (existing) {
          // Task already exists (created when run started) — update with result
          updateTaskStatus(db, existing.task_id, job, workspaceId)
          lastKnownRun.set(job.id, currentRunAt)
          processedStatus.set(`${job.id}:${currentRunAt}`, job.state!.lastStatus || '')
          updated++
          logger.info({ cronJobId: job.id, taskId: existing.task_id, status: job.state?.lastStatus }, 'Cron-task bridge: updated task with completion')
        } else {
          // No existing task — create and immediately update with result
          const taskId = createTaskForCronJob(db, job, workspaceId)
          updateTaskStatus(db, taskId, job, workspaceId)
          lastKnownRun.set(job.id, currentRunAt)
          if (job.state?.lastStatus) {
            processedStatus.set(`${job.id}:${currentRunAt}`, job.state.lastStatus)
          }
          created++
          updated++
          logger.info({ cronJobId: job.id, taskId, status: job.state?.lastStatus }, 'Cron-task bridge: created and completed task')
        }
      } else if (existing && job.state?.lastStatus) {
        // Same run — check if status changed (e.g., was running, now completed)
        const statusKey = `${job.id}:${currentRunAt || currentRunningAt}`
        const alreadyProcessed = processedStatus.get(statusKey)

        if (alreadyProcessed !== job.state.lastStatus) {
          const task = db.prepare(`SELECT status FROM tasks WHERE id = ? AND workspace_id = ?`)
            .get(existing.task_id, workspaceId) as { status: string } | undefined

          if (task && task.status === 'in_progress') {
            updateTaskStatus(db, existing.task_id, job, workspaceId)
            processedStatus.set(statusKey, job.state.lastStatus)
            updated++
            logger.info({ cronJobId: job.id, taskId: existing.task_id, status: job.state.lastStatus }, 'Cron-task bridge: updated task status')
          }
        }
      }

      // Always update caches
      if (currentRunAt > 0) lastKnownRun.set(job.id, currentRunAt)
      if (currentRunningAt > 0) lastKnownRunning.set(job.id, currentRunningAt)
    }

    if (created === 0 && updated === 0) {
      return { ok: true, message: 'No new cron runs detected' }
    }

    return { ok: true, message: `Created ${created} task(s), updated ${updated} task(s)` }
  } catch (err: any) {
    logger.error({ err }, 'Cron-task bridge failed')
    return { ok: false, message: `Bridge failed: ${err.message}` }
  }
}
