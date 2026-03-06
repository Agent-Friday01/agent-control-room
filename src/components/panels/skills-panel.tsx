'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Settings as SettingsIcon } from 'lucide-react'
import type { Skill } from '@/types/skills'

export function SkillsPanel() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Track toggle changes (skill name -> new enabled state)
  const [toggles, setToggles] = useState<Record<string, boolean>>({})

  const showFeedback = (ok: boolean, text: string) => {
    setFeedback({ ok, text })
    setTimeout(() => setFeedback(null), 3000)
  }

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch('/api/skills')
      if (res.status === 403) {
        setError('Admin access required')
        return
      }
      if (!res.ok) {
        setError('Failed to load skills')
        return
      }
      const data = await res.json()
      setSkills(data.skills || [])
    } catch {
      setError('Failed to load skills')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  const handleToggle = (skillName: string, currentEnabled: boolean) => {
    setToggles(prev => ({ ...prev, [skillName]: !currentEnabled }))
  }

  const hasChanges = Object.keys(toggles).length > 0

  const handleSave = async () => {
    if (!hasChanges) return

    setSaving(true)
    try {
      const res = await fetch('/api/skills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: toggles }),
      })
      const data = await res.json()
      if (res.ok) {
        showFeedback(true, `Updated ${data.count} skill${data.count === 1 ? '' : 's'}`)
        setToggles({})
        fetchSkills()
      } else {
        showFeedback(false, data.error || 'Failed to save')
      }
    } catch {
      showFeedback(false, 'Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setToggles({})
  }

  // Loading state
  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Loading skills...</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm">{error}</div>
      </div>
    )
  }

  // Filter skills by search query
  const filteredSkills = skills.filter(skill => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      skill.name.toLowerCase().includes(query) ||
      skill.description.toLowerCase().includes(query)
    )
  })

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Skills</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage Claude skills and capabilities
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleDiscard}
              className="px-3 py-1.5 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              Discard
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`px-4 py-1.5 text-xs rounded-md font-medium transition-colors ${
              hasChanges
                ? 'bg-violet-500 text-primary-foreground hover:bg-violet-500/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`rounded-xl p-3 text-xs font-medium ${
            feedback.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-destructive/10 text-destructive'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search skills..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm bg-card border border-border rounded-xl focus:border-primary focus:outline-none"
        />
      </div>

      {/* Skills count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filteredSkills.length === skills.length
            ? `${skills.length} skill${skills.length === 1 ? '' : 's'}`
            : `${filteredSkills.length} of ${skills.length} skills`}
        </span>
        <span>
          {skills.filter(s => {
            const enabled = toggles[s.name] !== undefined ? toggles[s.name] : s.enabled
            return enabled
          }).length}{' '}
          enabled
        </span>
      </div>

      {/* Skills list */}
      <div className="space-y-3">
        {filteredSkills.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            {searchQuery ? 'No skills found matching your search' : 'No skills available'}
          </div>
        ) : (
          filteredSkills.map(skill => {
            const currentEnabled = toggles[skill.name] !== undefined ? toggles[skill.name] : skill.enabled
            const hasChanged = toggles[skill.name] !== undefined

            return (
              <div
                key={skill.name}
                className={`bg-card border rounded-xl p-4 transition-colors ${
                  hasChanged ? 'border-primary/50' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{skill.name}</span>
                      {hasChanged && (
                        <span className="text-2xs px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-600 dark:text-violet-400">
                          modified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{skill.description}</p>
                    <p className="text-2xs text-muted-foreground/60 mt-2 font-mono">{skill.path}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Configure button (placeholder for future) */}
                    <button
                      disabled
                      title="Configuration coming soon"
                      className="p-1.5 text-muted-foreground/30 cursor-not-allowed"
                    >
                      <SettingsIcon className="w-4 h-4" />
                    </button>

                    {/* Toggle switch */}
                    <button
                      onClick={() => handleToggle(skill.name, currentEnabled)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${
                        currentEnabled ? 'bg-violet-500' : 'bg-muted'
                      }`}
                      title={currentEnabled ? 'Enabled' : 'Disabled'}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          currentEnabled ? 'left-5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Unsaved changes bar */}
      {hasChanges && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-3 z-40">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs text-foreground">
            {Object.keys(toggles).length} unsaved change{Object.keys(toggles).length === 1 ? '' : 's'}
          </span>
          <button
            onClick={handleDiscard}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 text-xs rounded-md bg-violet-500 text-primary-foreground hover:bg-violet-500/90 font-medium"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}
