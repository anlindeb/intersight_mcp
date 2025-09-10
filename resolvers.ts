import { IntersightClient } from "./intersight.js";


export interface ResolveOpts {
name: string;
org?: string;
top?: number;
}


export interface ResolveResult {
name: string;
moid?: string;
matches: Array<{ Name: string; Moid: string; Organization?: { Name?: string } }>;
}


export async function resolveProfileByName(client: IntersightClient, opts: ResolveOpts): Promise<ResolveResult> {
const { name, org, top = 10 } = opts;
const filters: string[] = [
`Name eq '${name.replace(/'/g, "''")}'`
];
if (org) filters.push(`Organization/Name eq '${org.replace(/'/g, "''")}'`);
const filter = filters.join(" and ");
const route = `/api/v1/ucs/Profiles?$top=${top}&$filter=${encodeURIComponent(filter)}`;
const json: any = await client.get(route);
const results = (json?.Results ?? json?.items ?? json ?? []).map((r: any) => ({
Name: r.Name, Moid: r.Moid, Organization: r.Organization
}));
const moid = results.length === 1 ? results[0].Moid : undefined;
return { name, moid, matches: results };
}