import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { logAuditEvent } from '@/lib/db'
import { mutationLimiter } from '@/lib/rate-limit'
import { getAllSkills, updateSkillsConfig } from '@/lib/skills'

/**
 * GET /api/skills - List all discovered skills with their enabled/disabled state
 */
export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'admin')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const skills = getAllSkills()
    return NextResponse.json({ skills })
  } catch (err) {
    console.error('Failed to get skills:', err)
    return NextResponse.json({ error: 'Failed to load skills' }, { status: 500 })
  }
}

/**
 * PUT /api/skills - Update enabled/disabled state for skills
 * Body: { updates: Record<string, boolean> } where key is skill name, value is enabled state
 */
export async function PUT(request: NextRequest) {
  const auth = requireRole(request, 'admin')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  // Apply rate limiting
  const rateCheck = mutationLimiter(request)
  if (rateCheck) return rateCheck

  try {
    const body = await request.json()
    const updates = body.updates as Record<string, boolean>

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const success = updateSkillsConfig(updates)

    if (!success) {
      return NextResponse.json({ error: 'Failed to update skills configuration' }, { status: 500 })
    }

    // Log audit event
    logAuditEvent({
      action: 'skill.update',
      actor: auth.user.username,
      actor_id: auth.user.id,
      detail: updates,
    })

    const count = Object.keys(updates).length
    return NextResponse.json({ ok: true, count })
  } catch (err) {
    console.error('Failed to update skills:', err)
    return NextResponse.json({ error: 'Failed to update skills' }, { status: 500 })
  }
}
