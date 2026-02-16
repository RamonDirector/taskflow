# Hansei MCP Server

Expose Hansei's core functionality (tasks, ideas, dreams) to any MCP-compatible AI agent.

## What This Does

Any AI agent that speaks MCP (Claude Desktop, OpenClaw, Cursor, etc.) can now:
- **Create tasks** → `hansei.create_task()`
- **List/complete tasks** → `hansei.list_tasks()`, `hansei.complete_task()`
- **Log ideas** → `hansei.log_idea()`
- **Log dreams** → `hansei.log_dream()`
- **Search everything** → `hansei.search_items()`

This is step 1 of positioning Hansei as **"Where your AI agents show you your life"**.

## Setup

```bash
cd mcp-server
npm install
npm run build
```

## Environment Variables

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Usage with Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hansei": {
      "command": "node",
      "args": ["/path/to/hansei/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://xxx.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJ..."
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `create_task` | Create a new task with priority and optional due date |
| `list_tasks` | List tasks (incomplete by default) |
| `complete_task` | Mark a task as done |
| `log_idea` | Log a brainstorming idea |
| `list_ideas` | List recent ideas |
| `log_dream` | Log a dream journal entry with optional emotion |
| `search_items` | Search across all types by keyword |

## Architecture

```
AI Agent (Claude, GPT, etc.)
    │
    ▼ MCP Protocol (stdio)
    │
Hansei MCP Server
    │
    ▼ Supabase Client (service role)
    │
Supabase DB (tasks table)
```

All tools require `user_id` (UUID) to scope data per user. The service role key bypasses RLS for server-to-server access.

## Next Steps

- [ ] HTTP/SSE transport (for remote agents, not just local stdio)
- [ ] AG-UI endpoint (CopilotKit compatibility)
- [ ] `set_reminder` tool
- [ ] `export_summary` tool (daily digest)
- [ ] OAuth flow for multi-user (instead of passing user_id)
