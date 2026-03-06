# Plan: Skills Management Panel

## Task Description
Add a new Skills panel to the Agent Control Room sidebar that allows users to view, enable/disable, and configure skills. The panel will discover skills from the `.claude/skills/` directory, read their enabled/disabled state from the OpenClaw configuration file (`~/.openclaw/openclaw.json`), and provide a user-friendly interface for managing them.

## Objective
Create a comprehensive skills management interface that integrates with the existing Agent Control Room architecture, allowing users to:
- View all available skills with their names and descriptions
- Toggle skills on/off (storing state in `~/.openclaw/openclaw.json`)
- Search and filter skills by name or description
- Access skill configuration options (future extensibility)
- Follow the existing panel design patterns and visual language

## Problem Statement
Currently, there is no UI for managing skills in the Agent Control Room. Skills exist in the `.claude/skills/` directory as individual `SKILL.md` files with frontmatter metadata, but there's no way to view, enable/disable, or configure them through the dashboard. Users need a centralized interface to discover available skills and control which ones are active.

## Solution Approach
We will create a new `SkillsPanel` component that:
1. Discovers skills by reading the `.claude/skills/` directory structure
2. Parses `SKILL.md` files to extract metadata (name, description)
3. Reads/writes skill enabled/disabled state from/to `~/.openclaw/openclaw.json`
4. Provides a clean, searchable UI with toggle switches for each skill
5. Follows the existing panel architecture patterns (similar to SettingsPanel and IntegrationsPanel)

The implementation will create a new `skills` section in the OpenClaw config:
```json
{
  "skills": {
    "enabled": ["frontend-design", "claude-api"],
    "disabled": ["skill-name"]
  }
}
```

## Relevant Files

### Existing Files to Reference
- **src/components/panels/settings-panel.tsx** - Reference for panel structure, state management, edit/save workflow
- **src/components/panels/integrations-panel.tsx** - Reference for category tabs, toggle states, search functionality
- **src/app/[[...panel]]/page.tsx** - Add new skills route to ContentRouter
- **src/components/layout/nav-rail.tsx** - Add Skills navigation item to sidebar
- **src/lib/config.ts** - OpenClaw config path and utilities
- **.claude/skills/frontend-design/SKILL.md** - Example skill file structure

### New Files
- **src/components/panels/skills-panel.tsx** - Main Skills panel component
- **src/app/api/skills/route.ts** - API endpoint for skills management (GET, PUT)
- **src/lib/skills.ts** - Skills discovery and config utilities
- **src/types/skills.ts** - TypeScript interfaces for skill data structures

## Implementation Phases

### Phase 1: Foundation
Set up the basic infrastructure for skill management including API endpoint, utility functions for skill discovery, and TypeScript types.

### Phase 2: Core Implementation
Build the SkillsPanel component with full CRUD operations, search/filter functionality, and integration with the OpenClaw config file.

### Phase 3: Integration & Polish
Integrate the panel into the navigation system, add error handling, loading states, and ensure consistent styling with the rest of the application.

## Step by Step Tasks

### 1. Create TypeScript Interfaces and Types
- Create `src/types/skills.ts` with interfaces for `Skill`, `SkillMetadata`, `SkillsConfig`
- Define structure for skill data: `{ name: string, description: string, enabled: boolean, path: string }`
- Define API response types for skills endpoints

### 2. Build Skills Utility Library
- Create `src/lib/skills.ts` with utility functions
- Implement `discoverSkills()` to scan `.claude/skills/` directory recursively
- Implement `parseSkillMd()` to extract frontmatter from `SKILL.md` files
- Implement `getSkillsConfig()` to read skills state from `~/.openclaw/openclaw.json`
- Implement `updateSkillsConfig()` to write skills state to OpenClaw config
- Handle file system errors and missing directories gracefully

### 3. Create Skills API Endpoint
- Create `src/app/api/skills/route.ts` with GET and PUT handlers
- **GET /api/skills**: Return list of all discovered skills with their enabled/disabled state
  - Discover skills from `.claude/skills/`
  - Read enabled/disabled state from OpenClaw config
  - Return merged data with skill metadata + state
- **PUT /api/skills**: Update enabled/disabled state for one or more skills
  - Accept `{ skillName: boolean }` map in request body
  - Update `skills.enabled` and `skills.disabled` arrays in OpenClaw config
  - Return success/failure response
- Add proper error handling and admin permission checks

### 4. Build SkillsPanel Component
- Create `src/components/panels/skills-panel.tsx` as a client component
- Implement state management: `skills`, `loading`, `error`, `searchQuery`, `toggleStates`
- Add `fetchSkills()` function to call GET /api/skills
- Implement search/filter functionality for skill names and descriptions
- Create skill card component showing: name, description, ON/OFF toggle
- Add save/discard workflow similar to SettingsPanel
- Include loading spinner and error states
- Add feedback messages for successful/failed operations

### 5. Integrate into Navigation
- Update `src/components/layout/nav-rail.tsx` to add Skills nav item
  - Add to the 'ADMIN' group with a Puzzle or Wand icon
  - Label: "Skills", id: "skills", priority: false
- Update `src/app/[[...panel]]/page.tsx` ContentRouter
  - Add case for 'skills': return `<SkillsPanel />`
  - Import the SkillsPanel component

### 6. Implement Search and Filter UI
- Add search input at top of SkillsPanel with real-time filtering
- Filter skills by name or description (case-insensitive)
- Show "No skills found" message when search returns empty results
- Display count of total skills and filtered results

### 7. Add Skill Configuration UI (Future Extensibility)
- Add "Configure" button to each skill card (initially disabled or hidden)
- Plan structure for skill-specific configuration options
- Add placeholder modal or expandable section for future config UI
- Document configuration structure in comments for future development

### 8. Style and Polish
- Match existing panel design patterns (rounded cards, violet accents, hover states)
- Ensure responsive layout works on mobile and desktop
- Add smooth transitions for toggle switches and state changes
- Implement proper ARIA labels and accessibility attributes
- Add keyboard navigation support

### 9. Error Handling and Edge Cases
- Handle missing `.claude/skills/` directory gracefully
- Handle malformed `SKILL.md` files (invalid frontmatter)
- Handle OpenClaw config file write errors
- Show user-friendly error messages for permission issues
- Add retry logic for failed API calls

### 10. Testing and Validation
- Test skill discovery with multiple skills in `.claude/skills/`
- Test enabling/disabling skills and verify config file updates
- Test search functionality with various queries
- Verify panel works in both expanded and collapsed sidebar states
- Test error states and loading indicators
- Validate accessibility with screen readers and keyboard navigation

## Testing Strategy

### Manual Testing
1. **Skill Discovery**: Create test skills in `.claude/skills/test-skill/SKILL.md` and verify they appear
2. **Toggle Functionality**: Enable/disable skills and verify `~/.openclaw/openclaw.json` is updated correctly
3. **Search**: Test search with partial matches, special characters, and empty results
4. **Error States**: Test with missing directories, invalid SKILL.md files, and permission errors
5. **UI/UX**: Verify responsive design, loading states, and feedback messages

### Edge Cases
- Empty `.claude/skills/` directory
- Skills with missing or malformed frontmatter
- Skills with very long names or descriptions
- Concurrent edits to OpenClaw config file
- Network errors during API calls
- Skills directory with subdirectories but no SKILL.md files

## Acceptance Criteria

1. ✅ Skills panel is accessible from the sidebar navigation under "ADMIN" section
2. ✅ Panel displays all skills from `.claude/skills/` directory with name and description
3. ✅ Each skill has an ON/OFF toggle that reflects its enabled/disabled state
4. ✅ Toggling a skill updates `~/.openclaw/openclaw.json` with the new state
5. ✅ Search input filters skills by name or description in real-time
6. ✅ Panel shows loading state while fetching skills
7. ✅ Panel shows appropriate error messages for failures
8. ✅ Save/Discard workflow allows batch updates before committing
9. ✅ Panel follows existing design patterns and visual styling
10. ✅ Configuration button is present (can be placeholder for future implementation)
11. ✅ Panel is responsive and works on mobile and desktop
12. ✅ All UI interactions provide immediate visual feedback

## Validation Commands

Execute these commands to validate the task is complete:

- `ls -la .claude/skills/` - Verify skills directory exists and contains test skills
- `cat ~/.openclaw/openclaw.json | jq '.skills'` - Verify skills config section is created
- `npm run build` - Ensure TypeScript compiles without errors
- `npm run lint` - Verify code passes linting rules
- Manual test: Navigate to `/skills` route and verify panel loads
- Manual test: Toggle a skill ON/OFF and verify config file updates
- Manual test: Search for a skill and verify filtering works
- Manual test: Refresh page and verify skill states persist correctly

## Notes

### OpenClaw Config Structure
The skills configuration will be stored in `~/.openclaw/openclaw.json` as:
```json
{
  "skills": {
    "enabled": ["frontend-design", "claude-api", "keybindings-help"],
    "disabled": []
  }
}
```

If the `skills` section doesn't exist, all discovered skills default to **enabled**.

### Skill File Structure
Skills are stored in `.claude/skills/<skill-name>/SKILL.md` with frontmatter:
```markdown
---
name: skill-name
description: Skill description here
license: Complete terms in LICENSE.txt
---

Skill implementation content...
```

### Future Enhancements
- Skill configuration UI for skill-specific settings
- Skill installation from marketplace or repository
- Skill versioning and update notifications
- Skill usage analytics (how often each skill is invoked)
- Skill dependencies and conflict detection
- Bulk enable/disable operations by category

### Dependencies
No new external dependencies required. Use existing packages:
- Node.js `fs` for file system operations
- `gray-matter` (if available) or custom frontmatter parser
- Existing UI components and patterns from other panels
