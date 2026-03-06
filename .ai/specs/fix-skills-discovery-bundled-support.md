# Plan: Fix Skills Discovery to Include Bundled Skills

## Task Description
Currently, `src/lib/skills.ts` only discovers skills from `~/.claude/skills` (workspace skills directory). This results in Agent Control Room showing only workspace skills, missing the 51 built-in skills that OPENCLAW provides. The task is to enhance the skills discovery mechanism to:

1. Scan bundled skills from `/usr/local/lib/node_modules/openclaw/skills/`
2. Read and respect `skills.load.extraDirs` configuration from `openclaw.json`
3. Support loading from `~/.openclaw/workspace/skills` if configured
4. Ensure Agent Control Room displays the same skills as the OPENCLAW app (51 built-in + workspace skills)

## Objective
Modify the skills discovery system to scan multiple skill directories (bundled, workspace, and user-configured) and merge them into a unified skill list, ensuring all available skills are discovered and displayed in the Skills Management panel.

## Problem Statement
The current implementation of `discoverSkills()` in `src/lib/skills.ts` hardcodes the skills directory path to `~/.claude/skills`, which only captures workspace-specific skills. This design fails to:

- Discover bundled skills that ship with OPENCLAW installation
- Read configuration-driven skill directories from `openclaw.json`
- Provide feature parity with the OPENCLAW application

As a result, users see an incomplete skills list, limiting functionality and creating confusion about which skills are actually available.

## Solution Approach
Enhance the skills discovery mechanism with a multi-source scanning approach:

1. **Define Skill Sources**: Establish an ordered list of directories to scan:
   - Bundled skills: `/usr/local/lib/node_modules/openclaw/skills/`
   - Workspace skills: `~/.claude/skills`
   - Extra directories from `openclaw.json`: `skills.load.extraDirs[]`

2. **Update Configuration Reading**: Extend `getSkillsConfig()` or create a new helper to read `skills.load.extraDirs` from the openclaw.json configuration file.

3. **Refactor Discovery Logic**: Modify `discoverSkills()` to:
   - Accept multiple directories to scan
   - Scan each directory using the existing SKILL.md parsing logic
   - Track the source of each skill (bundled vs workspace vs custom)
   - Handle duplicate skill names with a clear precedence rule (workspace > custom > bundled)

4. **Merge and Deduplicate**: When multiple directories contain the same skill name, use workspace skills as the override, allowing users to customize bundled skills.

5. **Preserve Backward Compatibility**: Ensure existing behavior works when no extra configuration exists.

## Relevant Files

- **src/lib/skills.ts** (lines 1-204) - Main implementation file
  - Contains `discoverSkills()` - needs enhancement to scan multiple directories
  - Contains `getSkillsConfig()` - may need extension to read `skills.load.extraDirs`
  - Contains `getAllSkills()` - main entry point, minimal changes needed

- **src/lib/config.ts** (lines 1-73) - Configuration management
  - Already has `openclawConfigPath` for reading openclaw.json
  - May need new helper to determine bundled skills directory

- **src/types/skills.ts** (lines 1-27) - Type definitions
  - May need extension to add `source` field to `Skill` interface (optional)
  - May need new type for skills load configuration

- **src/lib/__tests__/skills.test.ts** - Test file
  - Needs new tests for multi-directory scanning
  - Needs tests for skills.load.extraDirs reading
  - Needs tests for deduplication logic

### New Files
- None required - all changes are modifications to existing files

## Implementation Phases

### Phase 1: Foundation
Extend configuration reading and type definitions to support multiple skill sources. Update types to accommodate new configuration structure and skill source tracking.

### Phase 2: Core Implementation
Refactor `discoverSkills()` to scan multiple directories, implement deduplication logic, and integrate with configuration reading for dynamic directory sources.

### Phase 3: Integration & Polish
Update tests to cover new functionality, validate against OPENCLAW's skill list, and ensure backward compatibility with existing deployments.

## Step by Step Tasks

### 1. Extend Type Definitions
- Add `source?: 'bundled' | 'workspace' | 'custom'` field to `Skill` interface in `src/types/skills.ts` (optional, for debugging/display)
- Add `SkillsLoadConfig` interface with `extraDirs?: string[]` field
- Consider adding a helper type for directory configuration

### 2. Create Helper Function to Get Skill Directories
- In `src/lib/skills.ts`, create new function `getSkillDirectories(): string[]`
- Read `skills.load.extraDirs` from openclaw.json if it exists
- Return array of directories in priority order: `[workspace, ...extraDirs, bundled]`
- Handle path expansion for `~` in directory paths
- Check directory existence and filter out non-existent paths (with logging)
- Define bundled skills path constant: `/usr/local/lib/node_modules/openclaw/skills/`
- Fallback gracefully if bundled directory doesn't exist

### 3. Refactor discoverSkills() Function
- Rename current `discoverSkills()` to `discoverSkillsInDirectory(directory: string): Skill[]`
- Create new `discoverSkills()` that:
  - Calls `getSkillDirectories()` to get list of directories
  - Calls `discoverSkillsInDirectory()` for each directory
  - Merges results with deduplication (later skills override earlier ones by name)
  - Optionally tags each skill with its source directory
- Keep existing SKILL.md parsing logic in the helper function

### 4. Implement Deduplication Logic
- Create `deduplicateSkills(skills: Skill[]): Skill[]` helper function
- Use a Map keyed by skill name to handle duplicates
- Later entries override earlier entries (workspace > custom > bundled)
- Log when a skill is overridden (useful for debugging)

### 5. Read skills.load.extraDirs from Config
- In `getSkillDirectories()`, read openclaw.json
- Parse `skills.load.extraDirs` array if present
- Expand paths (handle `~` and relative paths)
- Validate that paths are directories
- Return validated list of extra directories

### 6. Update Tests for Multi-Directory Discovery
- Add test case: "discovers skills from multiple directories"
- Add test case: "deduplicates skills by name (workspace wins)"
- Add test case: "reads skills.load.extraDirs from config"
- Add test case: "handles missing bundled directory gracefully"
- Add test case: "expands ~ in directory paths"
- Update existing tests to ensure backward compatibility

### 7. Add Bundled Skills Path Configuration
- In `src/lib/config.ts`, add `bundledSkillsDir` configuration
- Default to `/usr/local/lib/node_modules/openclaw/skills/`
- Allow override via `OPENCLAW_BUNDLED_SKILLS_DIR` environment variable
- Export for use in skills.ts

### 8. Validate Against OPENCLAW Skill Count
- Test the implementation to ensure it discovers 51+ skills (bundled + workspace)
- Add logging to report number of skills discovered from each source
- Verify skill names match OPENCLAW's expected list
- Document any discrepancies found

## Testing Strategy

### Unit Tests
- **Multi-directory scanning**: Create test fixture with skills in multiple directories, verify all are discovered
- **Deduplication**: Create duplicate skills across directories, verify workspace version is used
- **Config parsing**: Test reading `skills.load.extraDirs` from various openclaw.json configurations
- **Error handling**: Test behavior with non-existent directories, malformed configs, missing permissions
- **Path expansion**: Verify `~` and relative paths are correctly expanded

### Integration Tests
- **End-to-end discovery**: With real-world directory structure, verify complete skill list
- **API response**: Verify `/api/skills` returns merged skill list
- **Backward compatibility**: Verify existing deployments without config changes still work

### Edge Cases
- Empty bundled directory
- Bundled directory doesn't exist
- Invalid paths in `skills.load.extraDirs`
- Circular symlinks in skill directories
- Skills with identical names but different casing
- Permission denied on skill directories

## Acceptance Criteria

1. ✅ Skills are discovered from `/usr/local/lib/node_modules/openclaw/skills/` if it exists
2. ✅ Skills are discovered from `~/.claude/skills` (existing behavior preserved)
3. ✅ Skills are discovered from directories listed in `openclaw.json`'s `skills.load.extraDirs` array
4. ✅ When duplicate skill names exist, workspace skills take precedence over others
5. ✅ The Skills Management panel displays 51+ skills (bundled + workspace) matching OPENCLAW
6. ✅ Existing deployments without additional configuration continue to work
7. ✅ All existing tests pass
8. ✅ New tests validate multi-directory discovery and deduplication

## Validation Commands

Execute these commands to validate the task is complete:

```bash
# Run all skills-related unit tests
npm test src/lib/__tests__/skills.test.ts

# Type check the modifications
npx tsc --noEmit

# Lint the modified files
npm run lint src/lib/skills.ts src/lib/config.ts src/types/skills.ts

# Start development server and verify skills count in UI
npm run dev
# Navigate to http://localhost:3000/settings/skills
# Verify that 51+ skills are displayed

# Test API endpoint directly
curl http://localhost:3000/api/skills | jq '.skills | length'
# Should return 51 or more

# Verify no regression in build process
npm run build
```

## Notes

### Environment Variables
- `OPENCLAW_BUNDLED_SKILLS_DIR` - Override default bundled skills location (optional)
- Existing environment variables from `src/lib/config.ts` remain unchanged

### Configuration Schema
The `openclaw.json` file should support this structure:
```json
{
  "skills": {
    "enabled": ["skill1", "skill2"],
    "disabled": ["skill3"],
    "load": {
      "extraDirs": [
        "~/.openclaw/workspace/skills",
        "/custom/skills/path"
      ]
    }
  }
}
```

### Skill Precedence Rules
When the same skill name appears in multiple directories:
1. **Workspace** (`~/.claude/skills`) - Highest priority
2. **Custom** (from `extraDirs`) - Middle priority (later entries win)
3. **Bundled** (`/usr/local/lib/node_modules/openclaw/skills/`) - Lowest priority

This allows users to override bundled skills with their own implementations.

### Performance Considerations
- Directory scanning is synchronous but should be fast (< 100ms for typical setups)
- Consider caching if performance becomes an issue with many skill directories
- Log warnings for slow directory scans (> 500ms)

### Migration Path
- No breaking changes - existing deployments work without modification
- Users can gradually adopt `skills.load.extraDirs` configuration
- No database migrations required

### Dependencies
- No new external dependencies required
- Uses existing `node:fs` and `node:path` modules
