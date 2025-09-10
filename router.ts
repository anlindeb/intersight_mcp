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
// Actual deletion is handled in server after confirmation logic
return { tool: 'intersight.delete', input: { route: `/api/v1/ucs/Profiles/${i.slots.moid}` } };
}
default:
throw new Error(`Unknown intent: ${i.name}`);
}
}