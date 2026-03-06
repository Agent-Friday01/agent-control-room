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
}

export interface SkillsConfig {
  enabled: string[]
  disabled: string[]
}

export interface SkillsApiResponse {
  skills: Skill[]
}

export interface SkillUpdateRequest {
  skillName: string
  enabled: boolean
}
