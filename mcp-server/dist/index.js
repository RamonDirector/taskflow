#!/usr/bin/env node
/**
 * Hansei MCP Server
 *
 * Exposes Hansei's core functionality to any MCP-compatible AI agent.
 * Tools: create_task, list_tasks, complete_task, log_idea, list_ideas,
 *        log_dream, list_dreams, search_items
 * Resources: tasks://today, ideas://recent, dreams://recent
 *
 * Auth: Supabase service role key (server-to-server).
 * Each tool requires user_id to scope data.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
// --- Config ---
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
// --- Server ---
const server = new McpServer({
    name: "hansei",
    version: "0.1.0",
});
// --- Tools ---
server.tool("create_task", "Create a new task in Hansei. Use for actionable items the user wants to track.", {
    user_id: z.string().uuid().describe("The Hansei user's UUID"),
    title: z.string().min(1).describe("Task title"),
    priority: z.enum(["high", "medium", "low"]).default("medium").describe("Task priority"),
    due_today: z.boolean().default(false).describe("Whether this task is due today"),
}, async ({ user_id, title, priority, due_today }) => {
    const dueDate = due_today ? new Date().toISOString().split("T")[0] : null;
    const { data, error } = await supabase
        .from("tasks")
        .insert({
        user_id,
        title,
        type: "task",
        priority,
        completed: false,
        due_date: dueDate,
    })
        .select("id, title, priority, due_date")
        .single();
    if (error)
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: `✅ Task created: "${data.title}" (${data.priority}) [#${data.id?.slice(0, 8)}]` }] };
});
server.tool("list_tasks", "List the user's tasks. Returns incomplete tasks by default, sorted by most recent.", {
    user_id: z.string().uuid(),
    include_completed: z.boolean().default(false).describe("Include completed tasks"),
    limit: z.number().min(1).max(50).default(20).describe("Max tasks to return"),
}, async ({ user_id, include_completed, limit }) => {
    let query = supabase
        .from("tasks")
        .select("id, title, priority, completed, due_date, created_at, type")
        .eq("user_id", user_id)
        .eq("type", "task")
        .order("created_at", { ascending: false })
        .limit(limit);
    if (!include_completed) {
        query = query.eq("completed", false);
    }
    const { data, error } = await query;
    if (error)
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    if (!data?.length)
        return { content: [{ type: "text", text: "No tasks found." }] };
    const lines = data.map((t) => {
        const check = t.completed ? "✅" : "⬜";
        const pri = t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : "🟢";
        return `${check} ${pri} ${t.title} [#${t.id.slice(0, 8)}]`;
    });
    return { content: [{ type: "text", text: lines.join("\n") }] };
});
server.tool("complete_task", "Mark a task as completed.", {
    user_id: z.string().uuid(),
    task_id: z.string().uuid().describe("The task's UUID"),
}, async ({ user_id, task_id }) => {
    const { error } = await supabase
        .from("tasks")
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("id", task_id)
        .eq("user_id", user_id);
    if (error)
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: `✅ Task completed.` }] };
});
server.tool("log_idea", "Log a new idea in Hansei. Ideas are separate from tasks — they're for brainstorming, not execution.", {
    user_id: z.string().uuid(),
    title: z.string().min(1).describe("The idea title or summary"),
    body: z.string().optional().describe("Optional longer description"),
}, async ({ user_id, title, body }) => {
    const { data, error } = await supabase
        .from("tasks")
        .insert({
        user_id,
        title,
        type: "idea",
        priority: "medium",
        completed: false,
        ...(body ? { description: body } : {}),
    })
        .select("id, title")
        .single();
    if (error)
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: `💡 Idea logged: "${data.title}" [#${data.id?.slice(0, 8)}]` }] };
});
server.tool("list_ideas", "List the user's ideas, sorted by most recent.", {
    user_id: z.string().uuid(),
    limit: z.number().min(1).max(50).default(20),
}, async ({ user_id, limit }) => {
    const { data, error } = await supabase
        .from("tasks")
        .select("id, title, created_at")
        .eq("user_id", user_id)
        .eq("type", "idea")
        .order("created_at", { ascending: false })
        .limit(limit);
    if (error)
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    if (!data?.length)
        return { content: [{ type: "text", text: "No ideas found." }] };
    const lines = data.map((i) => `💡 ${i.title} [#${i.id.slice(0, 8)}]`);
    return { content: [{ type: "text", text: lines.join("\n") }] };
});
server.tool("log_dream", "Log a dream entry in Hansei for dream journaling.", {
    user_id: z.string().uuid(),
    title: z.string().min(1).describe("Brief dream title"),
    body: z.string().optional().describe("Dream description/details"),
    emotion: z.string().optional().describe("Primary emotion (e.g. anxious, peaceful, confused)"),
}, async ({ user_id, title, body, emotion }) => {
    const { data, error } = await supabase
        .from("tasks")
        .insert({
        user_id,
        title,
        type: "dream",
        priority: "medium",
        completed: false,
        ...(body ? { description: body } : {}),
        ...(emotion ? { emotion } : {}),
    })
        .select("id, title")
        .single();
    if (error)
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: `🌙 Dream logged: "${data.title}" [#${data.id?.slice(0, 8)}]` }] };
});
server.tool("search_items", "Search across all item types (tasks, ideas, dreams) by keyword.", {
    user_id: z.string().uuid(),
    query: z.string().min(1).describe("Search keyword"),
    type: z.enum(["task", "idea", "dream", "all"]).default("all").describe("Filter by type"),
    limit: z.number().min(1).max(50).default(10),
}, async ({ user_id, query, type, limit }) => {
    let q = supabase
        .from("tasks")
        .select("id, title, type, completed, created_at, priority")
        .eq("user_id", user_id)
        .ilike("title", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(limit);
    if (type !== "all")
        q = q.eq("type", type);
    const { data, error } = await q;
    if (error)
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    if (!data?.length)
        return { content: [{ type: "text", text: `No results for "${query}".` }] };
    const icons = { task: "⬜", idea: "💡", dream: "🌙" };
    const lines = data.map((i) => {
        const icon = i.completed ? "✅" : (icons[i.type] || "📄");
        return `${icon} [${i.type}] ${i.title} [#${i.id.slice(0, 8)}]`;
    });
    return { content: [{ type: "text", text: lines.join("\n") }] };
});
// --- Resources ---
server.resource("today-tasks", "tasks://today", async (uri) => {
    // Returns all incomplete tasks — useful as agent context
    const { data } = await supabase
        .from("tasks")
        .select("id, title, priority, type, completed")
        .eq("type", "task")
        .eq("completed", false)
        .order("created_at", { ascending: false })
        .limit(50);
    const text = data?.length
        ? data.map((t) => `- [${t.priority}] ${t.title}`).join("\n")
        : "No open tasks.";
    return { contents: [{ uri: uri.href, mimeType: "text/plain", text }] };
});
// --- Start ---
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Hansei MCP Server running on stdio");
}
main().catch(console.error);
