export interface SkillMetadata {
  name: string
  description: string
  license?: string
}

export interface Skill {
  name: string
  description: string
  enabled: boolean
  path: string
  source?: 'bundled' | 'workspace' | 'custom'
}

export interface SkillsConfig {
  enabled: string[]
  disabled: string[]
}

export interface SkillsLoadConfig {
  extraDirs?: string[]
}

export interface SkillsApiResponse {
  skills: Skill[]
}

export interface SkillUpdateRequest {
  skillName: string
  enabled: boolean
}
