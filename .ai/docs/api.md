# Skills Management API Documentation

## Overview

The Skills Management API provides endpoints for discovering, viewing, and managing Claude skills within the Agent Control Room. All endpoints require authentication and admin privileges.

## Base URL

```
http://localhost:3000/api
```

In production, replace with your deployed Agent Control Room URL.

## Authentication

All Skills API endpoints require authentication. Use one of the following methods:

### Session Cookie
```bash
# Login first to get session cookie
POST /api/auth/login
{
  "username": "admin",
  "password": "your-password"
}

# Cookie 'mc-session' will be set automatically
```

### API Key Header
```bash
curl -H "x-api-key: your-api-key" https://your-domain.com/api/skills
```

## Authorization

**Required Role**: `admin`

Skills management is restricted to administrators. Users with `viewer` or `operator` roles will receive a 403 Forbidden response.

## Rate Limiting

- **GET requests**: Subject to standard read rate limits
- **PUT requests**: Protected by mutation limiter (configurable via environment variables)
- **Rate limit exceeded**: Returns 429 Too Many Requests

## Endpoints

### GET `/api/skills`

List all discovered skills with their enabled/disabled state.

#### Request

```http
GET /api/skills HTTP/1.1
Host: localhost:3000
Cookie: mc-session=<session-token>
```

#### Response (Success)

**Status**: `200 OK`

```json
{
  "skills": [
    {
      "name": "frontend-design",
      "description": "Create distinctive, production-grade frontend interfaces with high design quality.",
      "enabled": true,
      "path": "/home/user/.claude/skills/frontend-design"
    },
    {
      "name": "claude-api",
      "description": "Build apps with the Claude API or Anthropic SDK.",
      "enabled": false,
      "path": "/home/user/.claude/skills/claude-api"
    },
    {
      "name": "keybindings-help",
      "description": "Customize keyboard shortcuts and keybindings.",
      "enabled": true,
      "path": "/home/user/.claude/skills/keybindings-help"
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `skills` | `Array<Skill>` | Array of all discovered skills |
| `skills[].name` | `string` | Skill identifier (matches directory name) |
| `skills[].description` | `string` | Human-readable skill description |
| `skills[].enabled` | `boolean` | Whether the skill is currently enabled |
| `skills[].path` | `string` | Absolute filesystem path to skill directory |

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden**
```json
{
  "error": "Admin access required"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to load skills"
}
```

#### Behavior

1. Scans `~/.claude/skills/` directory for skill subdirectories
2. Reads `SKILL.md` files to extract metadata
3. Reads `~/.openclaw/openclaw.json` to get enabled/disabled state
4. Merges discovery results with config state
5. Returns combined array

**Default State Logic**:
- If no config exists: all skills are enabled
- If skill is in `disabled` array: disabled
- If `enabled` array exists and skill not in it: disabled
- Otherwise: enabled

#### Example (cURL)

```bash
# With session cookie
curl -X GET http://localhost:3000/api/skills \
  -H "Cookie: mc-session=your-session-token"

# With API key
curl -X GET http://localhost:3000/api/skills \
  -H "x-api-key: your-api-key"
```

#### Example (JavaScript)

```javascript
const response = await fetch('/api/skills', {
  method: 'GET',
  credentials: 'include', // Include cookies
})

if (response.ok) {
  const { skills } = await response.json()
  console.log(`Found ${skills.length} skills`)
} else {
  const { error } = await response.json()
  console.error('Error:', error)
}
```

---

### PUT `/api/skills`

Update enabled/disabled state for one or more skills.

#### Request

```http
PUT /api/skills HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Cookie: mc-session=<session-token>

{
  "updates": {
    "frontend-design": true,
    "claude-api": false,
    "keybindings-help": true
  }
}
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `updates` | `Record<string, boolean>` | Yes | Map of skill names to their desired enabled state |

**Format**:
```typescript
{
  updates: {
    [skillName: string]: boolean  // true = enable, false = disable
  }
}
```

#### Response (Success)

**Status**: `200 OK`

```json
{
  "ok": true,
  "count": 3
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `ok` | `boolean` | Always `true` on success |
| `count` | `number` | Number of skills updated |

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Invalid request body"
}
```

**401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden**
```json
{
  "error": "Admin access required"
}
```

**429 Too Many Requests**
```json
{
  "error": "Rate limit exceeded"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to update skills configuration"
}
```

#### Behavior

1. Validates request body structure
2. Reads current `openclaw.json` configuration
3. Updates `skills.enabled` and `skills.disabled` arrays:
   - Enabled skills: added to `enabled[]`, removed from `disabled[]`
   - Disabled skills: added to `disabled[]`, removed from `enabled[]`
4. Writes updated configuration to disk
5. Logs audit event with actor and changes
6. Returns success with update count

**Atomic Operations**:
- All updates applied together
- Config file written once
- Failure rolls back (no partial updates)

**Audit Logging**:
```json
{
  "action": "skill.update",
  "actor": "admin",
  "actor_id": 1,
  "detail": {
    "frontend-design": true,
    "claude-api": false
  },
  "timestamp": "2026-03-06T10:30:00Z"
}
```

#### Example (cURL)

```bash
curl -X PUT http://localhost:3000/api/skills \
  -H "Content-Type: application/json" \
  -H "Cookie: mc-session=your-session-token" \
  -d '{
    "updates": {
      "frontend-design": true,
      "claude-api": false
    }
  }'
```

#### Example (JavaScript)

```javascript
const updates = {
  'frontend-design': true,
  'claude-api': false,
  'keybindings-help': true,
}

const response = await fetch('/api/skills', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({ updates }),
})

if (response.ok) {
  const { count } = await response.json()
  console.log(`Updated ${count} skill${count === 1 ? '' : 's'}`)
} else {
  const { error } = await response.json()
  console.error('Failed to update:', error)
}
```

#### Example (Python)

```python
import requests

session = requests.Session()

# Login first
session.post('http://localhost:3000/api/auth/login', json={
    'username': 'admin',
    'password': 'your-password'
})

# Update skills
response = session.put('http://localhost:3000/api/skills', json={
    'updates': {
        'frontend-design': True,
        'claude-api': False
    }
})

if response.ok:
    data = response.json()
    print(f"Updated {data['count']} skills")
else:
    print(f"Error: {response.json()['error']}")
```

---

## Common Use Cases

### 1. Enable a Single Skill

```javascript
await fetch('/api/skills', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    updates: { 'frontend-design': true }
  })
})
```

### 2. Disable Multiple Skills

```javascript
await fetch('/api/skills', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    updates: {
      'claude-api': false,
      'keybindings-help': false
    }
  })
})
```

### 3. Get Enabled Skills Count

```javascript
const { skills } = await fetch('/api/skills').then(r => r.json())
const enabledCount = skills.filter(s => s.enabled).length
console.log(`${enabledCount} of ${skills.length} skills enabled`)
```

### 4. Batch Toggle All Skills

```javascript
// Get all skills
const { skills } = await fetch('/api/skills').then(r => r.json())

// Create updates object (enable all)
const updates = Object.fromEntries(
  skills.map(skill => [skill.name, true])
)

// Apply updates
await fetch('/api/skills', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ updates })
})
```

### 5. Search for Skills by Name

```javascript
const { skills } = await fetch('/api/skills').then(r => r.json())
const apiSkills = skills.filter(s => s.name.includes('api'))
console.log('API-related skills:', apiSkills)
```

---

## OpenClaw Configuration Format

The API reads and writes to `~/.openclaw/openclaw.json`. The skills section has the following structure:

```json
{
  "skills": {
    "enabled": [
      "frontend-design",
      "keybindings-help"
    ],
    "disabled": [
      "claude-api"
    ]
  },
  // ... other OpenClaw configuration
}
```

### Configuration Rules

1. **Empty Arrays**: If both arrays are empty, all discovered skills are enabled by default
2. **Explicit Disabled**: Skills in `disabled[]` are always disabled
3. **Whitelist Mode**: If `enabled[]` has items, only those skills are enabled (unless also in `disabled[]`)
4. **Priority**: `disabled[]` takes precedence over `enabled[]`

### Example Configurations

**All enabled (default)**:
```json
{
  "skills": {
    "enabled": [],
    "disabled": []
  }
}
```

**Specific skills enabled**:
```json
{
  "skills": {
    "enabled": ["frontend-design", "claude-api"],
    "disabled": []
  }
}
```

**Specific skills disabled**:
```json
{
  "skills": {
    "enabled": [],
    "disabled": ["keybindings-help"]
  }
}
```

---

## Error Handling

### Client-Side Best Practices

```javascript
async function updateSkills(updates) {
  try {
    const response = await fetch('/api/skills', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ updates })
    })

    if (!response.ok) {
      const { error } = await response.json()

      switch (response.status) {
        case 400:
          console.error('Invalid request:', error)
          break
        case 401:
          console.error('Not authenticated:', error)
          // Redirect to login
          break
        case 403:
          console.error('Not authorized:', error)
          // Show permission error
          break
        case 429:
          console.error('Rate limited:', error)
          // Wait and retry
          break
        case 500:
          console.error('Server error:', error)
          // Show generic error
          break
        default:
          console.error('Unexpected error:', error)
      }

      return { success: false, error }
    }

    const data = await response.json()
    return { success: true, data }

  } catch (err) {
    console.error('Network error:', err)
    return { success: false, error: 'Network error' }
  }
}
```

---

## Webhook Integration

Skills updates trigger audit log events that can be consumed via webhooks (if configured):

```json
{
  "event": "skill.update",
  "timestamp": "2026-03-06T10:30:00Z",
  "actor": "admin",
  "actor_id": 1,
  "data": {
    "frontend-design": true,
    "claude-api": false
  }
}
```

Configure webhooks in the Integrations panel to receive skill update notifications.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MC_CLAUDE_HOME` | `~/.claude` | Base directory for Claude skills |
| `OPENCLAW_CONFIG_PATH` | `~/.openclaw/openclaw.json` | Path to OpenClaw configuration file |
| `OPENCLAW_STATE_DIR` | `~/.openclaw` | OpenClaw state directory |

---

## Security Considerations

### Input Validation

The API validates:
- Request body is valid JSON
- `updates` field is an object
- Skill names are strings
- Enabled states are booleans

### File System Safety

- Config directory created with recursive option
- Full config file replacement (atomic write)
- No path traversal vulnerabilities
- Proper error handling for permission issues

### Audit Trail

All skill updates are logged with:
- Action type (`skill.update`)
- Actor username and ID
- Timestamp (ISO 8601)
- Complete change details

View audit logs in the Audit Trail panel or via `/api/audit` endpoint.

---

## Troubleshooting

### Skills not appearing in GET response

**Possible causes**:
1. `.claude/skills/` directory doesn't exist
2. No SKILL.md files in skill directories
3. Invalid frontmatter in SKILL.md
4. Permission issues reading skills directory

**Solution**:
```bash
# Check skills directory
ls -la ~/.claude/skills/

# Verify SKILL.md exists
cat ~/.claude/skills/frontend-design/SKILL.md

# Check permissions
ls -ld ~/.claude/skills/
```

### PUT request returns 500 error

**Possible causes**:
1. No write permission to `openclaw.json`
2. Invalid JSON in config file
3. Config directory doesn't exist

**Solution**:
```bash
# Check config file permissions
ls -la ~/.openclaw/openclaw.json

# Validate JSON syntax
cat ~/.openclaw/openclaw.json | jq .

# Create directory if missing
mkdir -p ~/.openclaw
```

### Changes not persisting

**Possible causes**:
1. Multiple Agent Control Room instances running
2. External process modifying config
3. Config file on read-only filesystem

**Solution**:
- Ensure only one instance is running
- Check for conflicting automation
- Verify filesystem is writable

---

## API Versioning

**Current Version**: v1 (implicit)

The Skills API is part of Agent Control Room's REST API surface. Breaking changes will be communicated via:
- Release notes
- API documentation updates
- Deprecation warnings in responses (future)

No explicit version prefix is used in the current API design.

---

## Further Reading

- [Architecture Documentation](./architecture.md) - Detailed system architecture
- [Agent Control Room README](../../README.md) - Full project documentation
- [OpenClaw Documentation](https://github.com/openclaw/openclaw) - OpenClaw configuration reference
