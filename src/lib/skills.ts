import fs from 'node:fs'
import path from 'node:path'
import { config } from './config'
import type { Skill, SkillMetadata, SkillsConfig } from '@/types/skills'

/**
 * Parse frontmatter from a SKILL.md file
 */
export function parseSkillMd(content: string): SkillMetadata | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) return null

  const frontmatter = frontmatterMatch[1]
  const metadata: Partial<SkillMetadata> = {}

  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m)
  const licenseMatch = frontmatter.match(/^license:\s*(.+)$/m)

  if (nameMatch) metadata.name = nameMatch[1].trim()
  if (descMatch) metadata.description = descMatch[1].trim()
  if (licenseMatch) metadata.license = licenseMatch[1].trim()

  if (!metadata.name || !metadata.description) return null

  return metadata as SkillMetadata
}

/**
 * Discover all skills from the .claude/skills/ directory
 */
export function discoverSkills(): Skill[] {
  const skillsDir = path.join(config.claudeHome, 'skills')

  // If skills directory doesn't exist, return empty array
  if (!fs.existsSync(skillsDir)) {
    return []
  }

  const skills: Skill[] = []

  try {
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const skillPath = path.join(skillsDir, entry.name)
      const skillMdPath = path.join(skillPath, 'SKILL.md')

      // Check if SKILL.md exists
      if (!fs.existsSync(skillMdPath)) continue

      try {
        const content = fs.readFileSync(skillMdPath, 'utf-8')
        const metadata = parseSkillMd(content)

        if (metadata) {
          skills.push({
            name: metadata.name,
            description: metadata.description,
            enabled: false, // Will be set by getSkillsConfig
            path: skillPath,
          })
        }
      } catch (err) {
        // Skip skills that can't be read
        console.error(`Failed to read skill at ${skillMdPath}:`, err)
      }
    }
  } catch (err) {
    console.error('Failed to read skills directory:', err)
  }

  return skills
}

/**
 * Read skills configuration from OpenClaw config file
 */
export function getSkillsConfig(): SkillsConfig {
  try {
    if (!fs.existsSync(config.openclawConfigPath)) {
      // Default: all skills are enabled
      return { enabled: [], disabled: [] }
    }

    const content = fs.readFileSync(config.openclawConfigPath, 'utf-8')
    const openclawConfig = JSON.parse(content)

    if (!openclawConfig.skills) {
      return { enabled: [], disabled: [] }
    }

    return {
      enabled: Array.isArray(openclawConfig.skills.enabled) ? openclawConfig.skills.enabled : [],
      disabled: Array.isArray(openclawConfig.skills.disabled) ? openclawConfig.skills.disabled : [],
    }
  } catch (err) {
    console.error('Failed to read skills config:', err)
    return { enabled: [], disabled: [] }
  }
}

/**
 * Update skills configuration in OpenClaw config file
 */
export function updateSkillsConfig(updates: Record<string, boolean>): boolean {
  try {
    // Read current config
    let openclawConfig: any = {}
    if (fs.existsSync(config.openclawConfigPath)) {
      const content = fs.readFileSync(config.openclawConfigPath, 'utf-8')
      openclawConfig = JSON.parse(content)
    }

    // Initialize skills section if it doesn't exist
    if (!openclawConfig.skills) {
      openclawConfig.skills = { enabled: [], disabled: [] }
    }

    // Ensure arrays exist
    if (!Array.isArray(openclawConfig.skills.enabled)) {
      openclawConfig.skills.enabled = []
    }
    if (!Array.isArray(openclawConfig.skills.disabled)) {
      openclawConfig.skills.disabled = []
    }

    // Apply updates
    for (const [skillName, enabled] of Object.entries(updates)) {
      const enabledIndex = openclawConfig.skills.enabled.indexOf(skillName)
      const disabledIndex = openclawConfig.skills.disabled.indexOf(skillName)

      if (enabled) {
        // Add to enabled, remove from disabled
        if (enabledIndex === -1) {
          openclawConfig.skills.enabled.push(skillName)
        }
        if (disabledIndex !== -1) {
          openclawConfig.skills.disabled.splice(disabledIndex, 1)
        }
      } else {
        // Add to disabled, remove from enabled
        if (disabledIndex === -1) {
          openclawConfig.skills.disabled.push(skillName)
        }
        if (enabledIndex !== -1) {
          openclawConfig.skills.enabled.splice(enabledIndex, 1)
        }
      }
    }

    // Ensure config directory exists
    const configDir = path.dirname(config.openclawConfigPath)
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }

    // Write updated config
    fs.writeFileSync(
      config.openclawConfigPath,
      JSON.stringify(openclawConfig, null, 2),
      'utf-8'
    )

    return true
  } catch (err) {
    console.error('Failed to update skills config:', err)
    return false
  }
}

/**
 * Get all skills with their enabled/disabled state
 */
export function getAllSkills(): Skill[] {
  const discoveredSkills = discoverSkills()
  const config = getSkillsConfig()

  // If no explicit config exists, all skills are enabled by default
  const hasConfig = config.enabled.length > 0 || config.disabled.length > 0

  return discoveredSkills.map(skill => {
    let enabled = true // Default to enabled

    if (hasConfig) {
      // If skill is explicitly disabled, it's disabled
      if (config.disabled.includes(skill.name)) {
        enabled = false
      }
      // If there are enabled skills and this isn't one of them, it's disabled
      else if (config.enabled.length > 0 && !config.enabled.includes(skill.name)) {
        enabled = false
      }
    }

    return {
      ...skill,
      enabled,
    }
  })
}
