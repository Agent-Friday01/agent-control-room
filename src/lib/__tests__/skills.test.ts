import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { parseSkillMd, discoverSkills, getSkillsConfig, updateSkillsConfig, getAllSkills } from '../skills'

describe('Skills Library', () => {
  let testDir: string
  let testSkillsDir: string
  let testConfigPath: string
  let originalBundledSkillsDir: string | undefined

  beforeEach(() => {
    // Create temporary test directories
    testDir = path.join(os.tmpdir(), `skills-test-${Date.now()}`)
    testSkillsDir = path.join(testDir, '.claude', 'skills')
    testConfigPath = path.join(testDir, 'openclaw.json')

    fs.mkdirSync(testSkillsDir, { recursive: true })

    // Disable bundled skills scanning during tests
    originalBundledSkillsDir = process.env.OPENCLAW_BUNDLED_SKILLS_DIR
    process.env.OPENCLAW_BUNDLED_SKILLS_DIR = ''
  })

  afterEach(() => {
    // Cleanup test directories
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }

    // Restore environment variable
    if (originalBundledSkillsDir !== undefined) {
      process.env.OPENCLAW_BUNDLED_SKILLS_DIR = originalBundledSkillsDir
    } else {
      delete process.env.OPENCLAW_BUNDLED_SKILLS_DIR
    }
  })

  describe('parseSkillMd', () => {
    it('should parse valid skill frontmatter', () => {
      const content = `---
name: test-skill
description: A test skill for unit testing
license: MIT
---

Skill content here`

      const result = parseSkillMd(content)
      expect(result).toEqual({
        name: 'test-skill',
        description: 'A test skill for unit testing',
        license: 'MIT',
      })
    })

    it('should return null for missing frontmatter', () => {
      const content = 'Just some content without frontmatter'
      const result = parseSkillMd(content)
      expect(result).toBeNull()
    })

    it('should return null for incomplete frontmatter', () => {
      const content = `---
name: test-skill
---

Missing description`

      const result = parseSkillMd(content)
      expect(result).toBeNull()
    })

    it('should handle multiline descriptions', () => {
      const content = `---
name: test-skill
description: A test skill with a description
---

Content`

      const result = parseSkillMd(content)
      expect(result?.name).toBe('test-skill')
      expect(result?.description).toBe('A test skill with a description')
    })
  })

  describe('discoverSkills', () => {
    it('should discover skills from directory', () => {
      // Create test skills
      const skill1Dir = path.join(testSkillsDir, 'skill-one')
      const skill2Dir = path.join(testSkillsDir, 'skill-two')

      fs.mkdirSync(skill1Dir, { recursive: true })
      fs.mkdirSync(skill2Dir, { recursive: true })

      fs.writeFileSync(path.join(skill1Dir, 'SKILL.md'), `---
name: skill-one
description: First test skill
---`)

      fs.writeFileSync(path.join(skill2Dir, 'SKILL.md'), `---
name: skill-two
description: Second test skill
---`)

      // Mock config.claudeHome temporarily
      const originalEnv = process.env.MC_CLAUDE_HOME
      process.env.MC_CLAUDE_HOME = path.join(testDir, '.claude')

      const skills = discoverSkills()

      // Restore env
      if (originalEnv) {
        process.env.MC_CLAUDE_HOME = originalEnv
      } else {
        delete process.env.MC_CLAUDE_HOME
      }

      expect(skills).toHaveLength(2)
      expect(skills.map(s => s.name).sort()).toEqual(['skill-one', 'skill-two'])
    })

    it('should return empty array for non-existent directory', () => {
      const originalEnv = process.env.MC_CLAUDE_HOME
      process.env.MC_CLAUDE_HOME = path.join(testDir, 'nonexistent')

      const skills = discoverSkills()

      if (originalEnv) {
        process.env.MC_CLAUDE_HOME = originalEnv
      } else {
        delete process.env.MC_CLAUDE_HOME
      }

      expect(skills).toEqual([])
    })

    it('should skip directories without SKILL.md', () => {
      const skillDir = path.join(testSkillsDir, 'incomplete-skill')
      fs.mkdirSync(skillDir, { recursive: true })
      fs.writeFileSync(path.join(skillDir, 'README.md'), 'No SKILL.md here')

      const originalEnv = process.env.MC_CLAUDE_HOME
      process.env.MC_CLAUDE_HOME = path.join(testDir, '.claude')

      const skills = discoverSkills()

      if (originalEnv) {
        process.env.MC_CLAUDE_HOME = originalEnv
      } else {
        delete process.env.MC_CLAUDE_HOME
      }

      expect(skills).toHaveLength(0)
    })

    it('should skip skills with malformed frontmatter', () => {
      const skillDir = path.join(testSkillsDir, 'bad-skill')
      fs.mkdirSync(skillDir, { recursive: true })
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), `---
name: bad-skill
---

Missing description`)

      const originalEnv = process.env.MC_CLAUDE_HOME
      process.env.MC_CLAUDE_HOME = path.join(testDir, '.claude')

      const skills = discoverSkills()

      if (originalEnv) {
        process.env.MC_CLAUDE_HOME = originalEnv
      } else {
        delete process.env.MC_CLAUDE_HOME
      }

      expect(skills).toHaveLength(0)
    })
  })

  describe('getSkillsConfig', () => {
    it('should return default config when file does not exist', () => {
      const originalEnv = process.env.OPENCLAW_CONFIG_PATH
      process.env.OPENCLAW_CONFIG_PATH = path.join(testDir, 'nonexistent.json')

      const config = getSkillsConfig()

      if (originalEnv) {
        process.env.OPENCLAW_CONFIG_PATH = originalEnv
      } else {
        delete process.env.OPENCLAW_CONFIG_PATH
      }

      expect(config).toEqual({ enabled: [], disabled: [] })
    })

    it('should read skills config from file', () => {
      fs.writeFileSync(
        testConfigPath,
        JSON.stringify({
          skills: {
            enabled: ['skill-one', 'skill-two'],
            disabled: ['skill-three'],
          },
        })
      )

      const originalEnv = process.env.OPENCLAW_CONFIG_PATH
      process.env.OPENCLAW_CONFIG_PATH = testConfigPath

      const config = getSkillsConfig()

      if (originalEnv) {
        process.env.OPENCLAW_CONFIG_PATH = originalEnv
      } else {
        delete process.env.OPENCLAW_CONFIG_PATH
      }

      expect(config).toEqual({
        enabled: ['skill-one', 'skill-two'],
        disabled: ['skill-three'],
      })
    })

    it('should handle missing skills section', () => {
      fs.writeFileSync(testConfigPath, JSON.stringify({ other: 'config' }))

      const originalEnv = process.env.OPENCLAW_CONFIG_PATH
      process.env.OPENCLAW_CONFIG_PATH = testConfigPath

      const config = getSkillsConfig()

      if (originalEnv) {
        process.env.OPENCLAW_CONFIG_PATH = originalEnv
      } else {
        delete process.env.OPENCLAW_CONFIG_PATH
      }

      expect(config).toEqual({ enabled: [], disabled: [] })
    })
  })

  describe('updateSkillsConfig', () => {
    it('should create config file and enable skill', () => {
      const originalEnv = process.env.OPENCLAW_CONFIG_PATH
      process.env.OPENCLAW_CONFIG_PATH = testConfigPath

      const success = updateSkillsConfig({ 'test-skill': true })

      if (originalEnv) {
        process.env.OPENCLAW_CONFIG_PATH = originalEnv
      } else {
        delete process.env.OPENCLAW_CONFIG_PATH
      }

      expect(success).toBe(true)
      expect(fs.existsSync(testConfigPath)).toBe(true)

      const config = JSON.parse(fs.readFileSync(testConfigPath, 'utf-8'))
      expect(config.skills.enabled).toContain('test-skill')
      expect(config.skills.disabled).not.toContain('test-skill')
    })

    it('should disable skill', () => {
      fs.writeFileSync(
        testConfigPath,
        JSON.stringify({
          skills: {
            enabled: ['test-skill'],
            disabled: [],
          },
        })
      )

      const originalEnv = process.env.OPENCLAW_CONFIG_PATH
      process.env.OPENCLAW_CONFIG_PATH = testConfigPath

      const success = updateSkillsConfig({ 'test-skill': false })

      if (originalEnv) {
        process.env.OPENCLAW_CONFIG_PATH = originalEnv
      } else {
        delete process.env.OPENCLAW_CONFIG_PATH
      }

      expect(success).toBe(true)

      const config = JSON.parse(fs.readFileSync(testConfigPath, 'utf-8'))
      expect(config.skills.enabled).not.toContain('test-skill')
      expect(config.skills.disabled).toContain('test-skill')
    })

    it('should handle multiple updates', () => {
      const originalEnv = process.env.OPENCLAW_CONFIG_PATH
      process.env.OPENCLAW_CONFIG_PATH = testConfigPath

      const success = updateSkillsConfig({
        'skill-one': true,
        'skill-two': false,
        'skill-three': true,
      })

      if (originalEnv) {
        process.env.OPENCLAW_CONFIG_PATH = originalEnv
      } else {
        delete process.env.OPENCLAW_CONFIG_PATH
      }

      expect(success).toBe(true)

      const config = JSON.parse(fs.readFileSync(testConfigPath, 'utf-8'))
      expect(config.skills.enabled).toEqual(expect.arrayContaining(['skill-one', 'skill-three']))
      expect(config.skills.disabled).toContain('skill-two')
    })
  })

  describe('getAllSkills', () => {
    it('should return all skills with default enabled state', () => {
      // Create test skills
      const skillDir = path.join(testSkillsDir, 'test-skill')
      fs.mkdirSync(skillDir, { recursive: true })
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        `---
name: test-skill
description: Test skill
---`
      )

      const originalClaudeHome = process.env.MC_CLAUDE_HOME
      const originalConfigPath = process.env.OPENCLAW_CONFIG_PATH

      process.env.MC_CLAUDE_HOME = path.join(testDir, '.claude')
      process.env.OPENCLAW_CONFIG_PATH = testConfigPath

      const skills = getAllSkills()

      if (originalClaudeHome) {
        process.env.MC_CLAUDE_HOME = originalClaudeHome
      } else {
        delete process.env.MC_CLAUDE_HOME
      }
      if (originalConfigPath) {
        process.env.OPENCLAW_CONFIG_PATH = originalConfigPath
      } else {
        delete process.env.OPENCLAW_CONFIG_PATH
      }

      expect(skills).toHaveLength(1)
      expect(skills[0].enabled).toBe(true)
    })

    it('should apply config to skills', () => {
      // Create test skills
      const skill1Dir = path.join(testSkillsDir, 'enabled-skill')
      const skill2Dir = path.join(testSkillsDir, 'disabled-skill')

      fs.mkdirSync(skill1Dir, { recursive: true })
      fs.mkdirSync(skill2Dir, { recursive: true })

      fs.writeFileSync(
        path.join(skill1Dir, 'SKILL.md'),
        `---
name: enabled-skill
description: Should be enabled
---`
      )
      fs.writeFileSync(
        path.join(skill2Dir, 'SKILL.md'),
        `---
name: disabled-skill
description: Should be disabled
---`
      )

      fs.writeFileSync(
        testConfigPath,
        JSON.stringify({
          skills: {
            enabled: ['enabled-skill'],
            disabled: ['disabled-skill'],
          },
        })
      )

      const originalClaudeHome = process.env.MC_CLAUDE_HOME
      const originalConfigPath = process.env.OPENCLAW_CONFIG_PATH

      process.env.MC_CLAUDE_HOME = path.join(testDir, '.claude')
      process.env.OPENCLAW_CONFIG_PATH = testConfigPath

      const skills = getAllSkills()

      if (originalClaudeHome) {
        process.env.MC_CLAUDE_HOME = originalClaudeHome
      } else {
        delete process.env.MC_CLAUDE_HOME
      }
      if (originalConfigPath) {
        process.env.OPENCLAW_CONFIG_PATH = originalConfigPath
      } else {
        delete process.env.OPENCLAW_CONFIG_PATH
      }

      const enabledSkill = skills.find(s => s.name === 'enabled-skill')
      const disabledSkill = skills.find(s => s.name === 'disabled-skill')

      expect(enabledSkill?.enabled).toBe(true)
      expect(disabledSkill?.enabled).toBe(false)
    })
  })
})
