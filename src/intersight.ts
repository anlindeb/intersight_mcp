import { signRequest } from "./auth.js";
import fs from "fs";
import path from "path";
import fetch from "cross-fetch";

export interface IntersightConfig {
  baseUrl: string; // e.g., https://intersight.com
  apiPrefix: string; // e.g., /api/v1
  apiKeyId: string;
  privateKeyPath: string;
}

export class IntersightClient {
  cfg: IntersightConfig;
  privateKeyPem: string;

  constructor(cfg: IntersightConfig) {
    this.cfg = cfg;
    const p = path.resolve(cfg.privateKeyPath);
    if (!fs.existsSync(p)) {
      throw new Error(`Private key file not found at ${p}`);
    }
    this.privateKeyPem = fs.readFileSync(p, "utf8");
  }

  private async request(method: string, route: string, body?: any) {
    const apiPath = route.startsWith("/") ? route : `${this.cfg.apiPrefix.replace(/\/$/, "")}/${route}`;

    const url = new URL(apiPath, this.cfg.baseUrl);
    const pathWithQuery = url.pathname + (url.search || "");

    const payload = body ? JSON.stringify(body) : "";

    const headers = signRequest({
      method,
      path: pathWithQuery,
      body: payload,
      host: url.host,
      apiKeyId: this.cfg.apiKeyId,
      privateKeyPem: this.privateKeyPem,
    });

    const res = await fetch(url.toString(), {
      method,
      headers: {
        "Authorization": headers.authorization,
        "Host": headers.host,
        "Date": headers.date,
        "Digest": headers.digest,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: payload || undefined,
    });

    const text = await res.text();
    let json: any = undefined;
    try { json = text ? JSON.parse(text) : undefined; } catch { /* keep text */ }

    if (!res.ok) {
      const err = new Error(`Intersight API ${method} ${apiPath} failed: ${res.status} ${res.statusText} - ${text}`);
      (err as any).status = res.status;
      (err as any).body = text;
      throw err;
    }
    return json ?? text;
  }

  get(route: string) { return this.request("GET", route); }
  post(route: string, body: any) { return this.request("POST", route, body); }
  patch(route: string, body: any) { return this.request("PATCH", route, body); }
  delete(route: string) { return this.request("DELETE", route); }
}

// File: src/router.ts
import { z } from "zod";

export const IntentSchema = z.object({
  name: z.string(),
  slots: z.record(z.any()).default({})
});
export type Intent = z.infer<typeof IntentSchema>;

export type BuiltCall = { tool: "intersight.get"|"intersight.post"|"intersight.patch"|"intersight.delete"; input: any };

export function buildCall(i: Intent): BuiltCall {
  switch (i.name) {
    case 'list_physical_servers': {
      const top = i.slots.top ?? 20;
      const filter = i.slots.filter ? `&$filter=${encodeURIComponent(i.slots.filter)}` : '';
      return { tool: 'intersight.get', input: { route: `/api/v1/compute/PhysicalSummaries?$top=${top}${filter}` } };
    }
    case 'get_server_by_moid': {
      return { tool: 'intersight.get', input: { route: `/api/v1/compute/PhysicalSummaries/${i.slots.moid}` } };
    }
    case 'list_ucs_profiles': {
      const top = i.slots.top ?? 20;
      const filter = i.slots.filter ? `&$filter=${encodeURIComponent(i.slots.filter)}` : '';
      return { tool: 'intersight.get', input: { route: `/api/v1/ucs/Profiles?$top=${top}${filter}` } };
    }
    case 'patch_ucs_profile': {
      if (!i.slots.moid) throw new Error('Missing moid');
      const body = i.slots.body ?? i.slots.patch_ops;
      return { tool: 'intersight.patch', input: { route: `/api/v1/ucs/Profiles/${i.slots.moid}`, body } };
    }
    case 'create_ucs_pool': {
      return { tool: 'intersight.post', input: { route: `/api/v1/ucs/Pools`, body: i.slots.payload } };
    }
    case 'delete_ucs_profile': {
      if (!i.slots.moid) throw new Error('Missing moid');
      return { tool: 'intersight.delete', input: { route: `/api/v1/ucs/Profiles/${i.slots.moid}` } };
    }
    default:
      throw new Error(`Unknown intent: ${i.name}`);
  }
}