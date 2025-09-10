# Intersight MCP — Intent Playbook

Use `intersight.intent` for friendly actions:

- **Inventory**: `{ "name": "list_physical_servers", "slots": { "top": 10, "filter": "contains(Model,'M6')" } }`
- **Get by MOID**: `{ "name": "get_server_by_moid", "slots": { "moid": "<moid>" } }`
- **List UCS profiles**: `{ "name": "list_ucs_profiles", "slots": { "top": 20 } }`
- **Patch UCS profile**: `{ "name": "patch_ucs_profile", "slots": { "moid": "<moid>", "body": { "Description": "Blue rack 3" } } }`
- **Create UCS pool**: `{ "name": "create_ucs_pool", "slots": { "payload": { /* ... */ } } }`
- **Delete UCS profile**: `{ "name": "delete_ucs_profile", "slots": { "moid": "<moid>", "confirm": "DELETE" } }`
- **Resolve by name**: `{ "name": "resolve_profile_by_name", "slots": { "name": "LabProfile", "org": "Engineering" } }`

Prefer `$top` + `$filter` and confirm destructive ops.