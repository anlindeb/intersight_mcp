import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import pino from "pino";
import { IntersightClient } from "./intersight.js";
import { IntentSchema, buildCall } from "./router.js";
import { resolveProfileByName } from "./resolvers.js";

const log = pino({ name: "intersight-mcp" });

// Load config from env
const apiKeyId = process.env.INTERSIGHT_API_KEY_ID as string;
const privateKeyPath = process.env.INTERSIGHT_PRIVATE_KEY_PATH as string;
const baseUrl = process.env.INTERSIGHT_BASE_URL || "https://intersight.com";
const apiPrefix = process.env.INTERSIGHT_API_PREFIX || "/api/v1";

if (!apiKeyId || !privateKeyPath) {
  console.error("Missing INTERSIGHT_API_KEY_ID or INTERSIGHT_PRIVATE_KEY_PATH env vars. See .env.example");
  process.exit(1);
}

const client = new IntersightClient({ baseUrl, apiPrefix, apiKeyId, privateKeyPath });

// Create MCP server with tools
const mcp = new Server({ name: "intersight-mcp", version: "0.3.0" }, { capabilities: { tools: {} } });

mcp.tool("intersight.get", "GET from Cisco Intersight. Input: { route: string }", {
  inputSchema: { type: "object", required: ["route"], properties: { route: { type: "string" } } },
  invoke: async ({ route }) => ({ content: [{ type: "json", json: await client.get(route) }] })
});

mcp.tool("intersight.post", "POST to Cisco Intersight. Input: { route: string, body: object }", {
  inputSchema: { type: "object", required: ["route","body"], properties: { route: { type: "string" }, body: { type: "object" } } },
  invoke: async ({ route, body }) => ({ content: [{ type: "json", json: await client.post(route, body) }] })
});

mcp.tool("intersight.patch", "PATCH to Cisco Intersight. Input: { route: string, body: object }", {
  inputSchema: { type: "object", required: ["route","body"], properties: { route: { type: "string" }, body: { type: "object" } } },
  invoke: async ({ route, body }) => ({ content: [{ type: "json", json: await client.patch(route, body) }] })
});

mcp.tool("intersight.delete", "DELETE resource in Cisco Intersight. Input: { route: string }", {
  inputSchema: { type: "object", required: ["route"], properties: { route: { type: "string" } } },
  invoke: async ({ route }) => { await client.delete(route); return { content: [{ type: "text", text: "deleted" }] }; }
});

// Resolver tool: name → MOID
mcp.tool("intersight.resolve_profile", "Resolve a UCS Profile MOID by name (and optional org). Input: { name: string, org?: string }", {
  inputSchema: { type: "object", required: ["name"], properties: { name: { type: "string" }, org: { type: "string" } } },
  invoke: async ({ name, org }) => {
    const res = await resolveProfileByName(client, { name, org });
    return { content: [{ type: "json", json: res }] };
  }
});

// Intent router + safe delete
mcp.tool("intersight.intent", "Route a high-level intent. Supports safe delete. Input: { name: string, slots?: object }", {
  inputSchema: { type: "object", required: ["name"], properties: { name: { type: "string" }, slots: { type: "object" } } },
  invoke: async (raw) => {
    const intent = IntentSchema.parse(raw);

    // Special intents
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