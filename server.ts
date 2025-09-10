import "dotenv/config";


// New: intent router with safe delete confirm
mcp.tool("intersight.intent", "Route a high-level intent. Supports safe delete. Input: { name: string, slots?: object }", {
inputSchema: { type: "object", required: ["name"], properties: { name: { type: "string" }, slots: { type: "object" } } },
invoke: async (raw) => {
const intent = IntentSchema.parse(raw);


// Optional pre-hooks for special intents
if (intent.name === 'resolve_profile_by_name') {
const res = await resolveProfileByName(client, { name: intent.slots.name, org: intent.slots.org });
return { content: [{ type: "json", json: res }] };
}


if (intent.name === 'delete_ucs_profile') {
// Two-step confirmation: require slots.confirm === 'DELETE'
if (intent.slots.confirm !== 'DELETE') {
// If caller didn't supply MOID but supplied a name, try resolve
if (!intent.slots.moid && intent.slots.name) {
const r = await resolveProfileByName(client, { name: intent.slots.name, org: intent.slots.org });
if (!r.moid) {
return { content: [{ type: "json", json: { needsConfirmation: true, step: 'select', message: "Multiple or zero profiles matched; pick one MOID", matches: r.matches } }] };
}
intent.slots.moid = r.moid;
}
return { content: [{ type: "json", json: { needsConfirmation: true, step: 'confirm', message: "Type DELETE to confirm irreversible deletion", moid: intent.slots.moid } }] };
}
// confirmed path continues below via buildCall
}


const { tool, input } = buildCall(intent);
switch (tool) {
case 'intersight.get': return { content: [{ type: "json", json: await client.get(input.route) }] };
case 'intersight.post': return { content: [{ type: "json", json: await client.post(input.route, input.body) }] };
case 'intersight.patch': return { content: [{ type: "json", json: await client.patch(input.route, input.body) }] };
case 'intersight.delete': await client.delete(input.route); return { content: [{ type: "text", text: "deleted" }] };
}
}
});


mcp.tool("intersight.ping", "Ping the server and return base URL/prefix.", {
inputSchema: { type: "object", properties: {} },
invoke: async () => ({ content: [{ type: "json", json: { baseUrl, apiPrefix } }] })
});


const transport = new StdioServerTransport();
await mcp.connect(transport);
log.info(`Intersight MCP server started for ${baseUrl}${apiPrefix}`);


// File: tests/resolvers.test.ts
import { describe, it, expect, vi } from 'vitest';
import { resolveProfileByName } from '../src/resolvers.js';


// Minimal mock client
class MockClient {
async get(route: string) {
if (route.includes("Name%20eq%20'LabProfile'")) {
return { Results: [{ Name: 'LabProfile', Moid: 'abc' }] };
}
return { Results: [] };
}
}


describe('resolveProfileByName', () => {
it('returns single moid if unique', async () => {
const res: any = await resolveProfileByName(new MockClient() as any, { name: 'LabProfile' });
expect(res.moid).toBe('abc');
expect(res.matches.length).toBe(1);
});
});