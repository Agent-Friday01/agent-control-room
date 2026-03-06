# Skills Management Panel - Architecture Documentation

## Overview

The Skills Management Panel is a comprehensive UI feature that allows administrators to discover, view, and manage Claude skills within the Agent Control Room. It provides a centralized interface for enabling/disabling skills and integrates with the OpenClaw configuration system.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Skills Panel UI                          │
│  (src/components/panels/skills-panel.tsx)                      │
│                                                                  │
│  • Search & Filter Interface                                    │
│  • Skill Cards with Toggle Switches                            │
│  • Save/Discard Workflow                                       │
│  • Real-time State Management                                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ HTTP API Calls
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Skills API Endpoint                           │
│           (src/app/api/skills/route.ts)                        │
│                                                                  │
│  GET  /api/skills  → List all skills with states               │
│  PUT  /api/skills  → Update enabled/disabled states            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Function Calls
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Skills Utility Library                         │
│              (src/lib/skills.ts)                               │
│                                                                  │
│  • discoverSkills()     → Scan .claude/skills/ directory       │
│  • parseSkillMd()       → Extract frontmatter metadata         │
│  • getSkillsConfig()    → Read OpenClaw config                 │
│  • updateSkillsConfig() → Write OpenClaw config                │
│  • getAllSkills()       → Merge discovery + config             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ File System Operations
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Sources                                │
│                                                                  │
│  ~/.claude/skills/                                             │
│  ├── frontend-design/                                          │
│  │   └── SKILL.md          ← Skill metadata                    │
│  ├── claude-api/                                               │
│  │   └── SKILL.md                                              │
│  └── ...                                                        │
│                                                                  │
│  ~/.openclaw/openclaw.json  ← Config file                      │
│  {                                                              │
│    "skills": {                                                  │
│      "enabled": ["frontend-design"],                           │
│      "disabled": ["claude-api"]                                │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. UI Layer (Skills Panel)

**Location**: `src/components/panels/skills-panel.tsx`

**Purpose**: Client-side React component providing the user interface for skills management.

**Key Features**:
- Search/filter functionality with real-time filtering
- Toggle switches for enabling/disabling skills
- Pending changes tracking with save/discard workflow
- Loading and error states
- Responsive design matching existing panel patterns
- Fixed bottom bar for unsaved changes indicator

**State Management**:
```typescript
{
  skills: Skill[]           // All discovered skills with current state
  loading: boolean          // Initial load state
  error: string | null      // Error message if any
  saving: boolean           // Save operation in progress
  feedback: { ok, text }    // User feedback messages
  searchQuery: string       // Current search filter
  toggles: Record<string, boolean> // Pending toggle changes
}
```

**User Workflow**:
1. User navigates to Skills panel via sidebar
2. Panel fetches all skills from API
3. User searches/filters skills
4. User toggles skills on/off (changes tracked locally)
5. User clicks "Save Changes" (batch update)
6. Panel updates OpenClaw config and refreshes

### 2. API Layer

**Location**: `src/app/api/skills/route.ts`

**Endpoints**:

#### GET `/api/skills`
- **Auth**: Requires `admin` role
- **Returns**: List of all discovered skills with enabled/disabled state
- **Process**:
  1. Call `getAllSkills()` to discover and merge config
  2. Return JSON with skills array

#### PUT `/api/skills`
- **Auth**: Requires `admin` role
- **Rate Limit**: Applied via `mutationLimiter`
- **Body**: `{ updates: Record<string, boolean> }`
- **Process**:
  1. Validate request body
  2. Call `updateSkillsConfig(updates)`
  3. Log audit event
  4. Return success with update count

**Security**:
- Role-based access control (admin only)
- Rate limiting on mutations
- Audit logging for all changes
- Input validation

### 3. Business Logic Layer

**Location**: `src/lib/skills.ts`

**Core Functions**:

#### `discoverSkills()`
Scans the `.claude/skills/` directory to find all available skills.

**Algorithm**:
1. Read entries from `~/.claude/skills/` directory
2. For each subdirectory:
   - Check for `SKILL.md` file
   - Parse frontmatter to extract metadata
   - Create Skill object (enabled defaults to false)
3. Return array of discovered skills
4. Handle missing directories gracefully (empty array)

#### `parseSkillMd(content: string)`
Extracts metadata from SKILL.md frontmatter.

**Format**:
```markdown
---
name: skill-name
description: Skill description
license: License info (optional)
---

Skill implementation content...
```

**Returns**: `SkillMetadata | null`

#### `getSkillsConfig()`
Reads skills configuration from OpenClaw config file.

**Default Behavior**:
- If config file doesn't exist: return empty arrays (all skills enabled)
- If `skills` section missing: return empty arrays
- Otherwise: return `{ enabled: [], disabled: [] }`

#### `updateSkillsConfig(updates: Record<string, boolean>)`
Updates the skills section in OpenClaw config file.

**Algorithm**:
1. Read existing `openclaw.json` (create if missing)
2. Initialize `skills` section if needed
3. For each update:
   - If enabled: add to `enabled[]`, remove from `disabled[]`
   - If disabled: add to `disabled[]`, remove from `enabled[]`
4. Write updated config (pretty-printed JSON)
5. Return success/failure boolean

#### `getAllSkills()`
Main entry point that combines discovery and configuration.

**Logic**:
1. Discover all skills from filesystem
2. Read current config
3. Determine enabled state for each skill:
   - If no config exists: all enabled by default
   - If explicitly in `disabled[]`: disabled
   - If `enabled[]` has items and skill not in it: disabled
   - Otherwise: enabled
4. Return merged skill list

### 4. Data Layer

**Skills Directory Structure**:
```
~/.claude/skills/
├── frontend-design/
│   ├── SKILL.md           # Metadata + implementation
│   └── ...                # Additional files
├── claude-api/
│   └── SKILL.md
└── keybindings-help/
    └── SKILL.md
```

**OpenClaw Config Structure**:
```json
{
  "skills": {
    "enabled": ["frontend-design", "claude-api"],
    "disabled": []
  },
  // ... other OpenClaw config
}
```

## Type Definitions

**Location**: `src/types/skills.ts`

```typescript
// Metadata extracted from SKILL.md frontmatter
interface SkillMetadata {
  name: string
  description: string
  license?: string
}

// Complete skill object with state
interface Skill {
  name: string
  description: string
  enabled: boolean
  path: string
}

// OpenClaw config structure
interface SkillsConfig {
  enabled: string[]
  disabled: string[]
}

// API responses
interface SkillsApiResponse {
  skills: Skill[]
}

interface SkillUpdateRequest {
  skillName: string
  enabled: boolean
}
```

## Navigation Integration

### Sidebar Navigation

**Location**: `src/components/layout/nav-rail.tsx`

Added to ADMIN group:
```typescript
{
  id: 'skills',
  label: 'Skills',
  icon: <Wand2 size={ICON_SIZE} />,
  priority: false
}
```

### Routing

**Location**: `src/app/[[...panel]]/page.tsx`

Route handler:
```typescript
case 'skills':
  return <SkillsPanel />
```

URL: `/skills`

## Design Patterns

### 1. Save/Discard Workflow

Similar to SettingsPanel, changes are tracked locally before committing:
- User makes multiple changes
- Changes tracked in `toggles` state
- "Discard" resets local state
- "Save" batches updates in single API call
- Unsaved changes indicator appears at bottom

### 2. Search and Filter

Real-time client-side filtering:
- Filter by skill name (case-insensitive)
- Filter by skill description (case-insensitive)
- Shows filtered count vs total count
- "No skills found" empty state

### 3. Error Handling

Graceful degradation at each layer:
- **UI**: Loading/error states, user-friendly messages
- **API**: HTTP error codes, JSON error responses
- **Library**: Try-catch blocks, console errors, default returns
- **Filesystem**: Missing directory/file handling

### 4. Default Behavior

Skills are enabled by default when no config exists:
- Matches Claude's behavior (all skills available)
- Explicit disable required to turn off
- Empty `openclaw.json` = all enabled

## Configuration Resolution

Skills configuration is resolved from environment variables:

```typescript
// From src/lib/config.ts
claudeHome:
  process.env.MC_CLAUDE_HOME ||
  path.join(os.homedir(), '.claude')

openclawConfigPath:
  process.env.OPENCLAW_CONFIG_PATH ||
  path.join(openclawStateDir, 'openclaw.json')
```

**Priority**:
1. `MC_CLAUDE_HOME` env var → skills directory
2. Default: `~/.claude/skills/`
3. `OPENCLAW_CONFIG_PATH` env var → config file
4. Default: `~/.openclaw/openclaw.json`

## Security Considerations

### Authentication & Authorization
- All API endpoints require authentication
- Skills management requires `admin` role
- Session tokens validated via `requireRole()`

### Rate Limiting
- PUT endpoint protected by `mutationLimiter`
- Prevents abuse of config file writes

### Audit Logging
- All skill updates logged to audit trail
- Captures: actor, action, timestamp, changes

### Input Validation
- API validates request body structure
- TypeScript type checking throughout
- Filesystem paths sanitized

### File System Safety
- Config directory created with recursive option
- Atomic writes (full content replacement)
- Error handling for permission issues
- No arbitrary file path traversal

## Performance Characteristics

### Skill Discovery
- **O(n)** directory scan where n = number of skill directories
- File system operations (synchronous)
- Cached in UI after initial fetch
- Typical: < 100ms for ~10 skills

### Config Updates
- Atomic file writes
- Pretty-printed JSON (human-readable)
- Synchronous filesystem operations
- Typical: < 50ms per update

### UI Responsiveness
- Client-side filtering (instant)
- Batch updates (single API call)
- Optimistic UI updates possible
- Loading indicators for async operations

## Future Extensibility

### Planned Features (from Plan)
1. **Skill Configuration UI**: Modal/drawer for skill-specific settings
2. **Skill Installation**: Marketplace or repository integration
3. **Skill Versioning**: Update notifications and version management
4. **Usage Analytics**: Track skill invocation frequency
5. **Dependencies**: Skill dependency resolution and conflict detection
6. **Bulk Operations**: Enable/disable by category

### Extension Points

**UI Components**:
- Configure button placeholder (currently disabled)
- Modal system for skill-specific config
- Category/tag filtering

**API Endpoints**:
- `POST /api/skills/install` - Install from marketplace
- `GET /api/skills/[name]/config` - Get skill-specific config
- `PUT /api/skills/[name]/config` - Update skill config
- `GET /api/skills/analytics` - Usage statistics

**Data Model**:
- Skill categories/tags
- Skill version tracking
- Skill dependencies
- Skill-specific configuration schemas

## Testing Strategy

### Manual Testing Checklist
- [x] Skill discovery with multiple skills
- [x] Enable/disable skills and verify config updates
- [x] Search functionality with partial matches
- [x] Error states (missing directory, permission errors)
- [x] Loading indicators
- [x] Responsive design (mobile/desktop)
- [x] Save/discard workflow
- [x] State persistence across page refresh

### Edge Cases Handled
- Empty `.claude/skills/` directory → shows "No skills available"
- Missing `openclaw.json` → creates with skills section
- Malformed SKILL.md → skips skill, logs error
- Concurrent config edits → last write wins
- Network errors → shows error message with retry option
- Permission denied → user-friendly error message

### Test Files
- `src/lib/__tests__/skills.test.ts` - Unit tests for skills library
- `tests/skills-management.spec.ts` - E2E tests for full workflow

## Technology Dependencies

### Required
- **Node.js**: >= 20 (for file system operations)
- **Next.js**: 16+ (App Router API routes)
- **React**: 19+ (Client components, hooks)
- **TypeScript**: 5.7+ (Type safety)

### Internal Dependencies
- `src/lib/config.ts` - Configuration paths
- `src/lib/auth.ts` - Role-based access control
- `src/lib/db.ts` - Audit logging
- `src/lib/rate-limit.ts` - API rate limiting

### External Dependencies
None - uses only Node.js built-in modules (`fs`, `path`)

## Migration & Compatibility

### Backward Compatibility
- Works with existing OpenClaw installations
- Doesn't break if `skills` section missing in config
- Gracefully handles pre-existing config formats

### Config Migration
No migration required - adds `skills` section on first update:
```json
{
  "skills": {
    "enabled": [],
    "disabled": []
  }
}
```

### Upgrade Path
1. Deploy updated Agent Control Room
2. Navigate to Skills panel
3. Skills auto-discovered from `.claude/skills/`
4. First save creates `skills` section in config

## Troubleshooting

### Common Issues

**Skills not appearing**:
- Check `MC_CLAUDE_HOME` env var
- Verify `.claude/skills/` directory exists
- Ensure SKILL.md files have valid frontmatter

**Permission errors**:
- Check file permissions on `openclaw.json`
- Ensure user has write access to config directory

**Changes not saving**:
- Check browser console for API errors
- Verify admin role assignment
- Check rate limiting (429 status)

**Config file corruption**:
- Validate JSON syntax in `openclaw.json`
- Restore from backup if available
- Delete `skills` section to reset

### Debug Logging
- Server logs show skill discovery errors
- API errors logged to console
- Audit trail captures all updates
- Browser DevTools for UI debugging
