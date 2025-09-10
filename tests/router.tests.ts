import { describe, it, expect } from 'vitest';
import { buildCall } from '../src/router.js';

describe('intent router', () => {
  it('maps list_physical_servers', () => {
    const { tool, input } = buildCall({ name: 'list_physical_servers', slots: { top: 10, filter: "Organization/Name eq 'Engineering'" } });
    expect(tool).toBe('intersight.get');
    expect(input.route.startsWith('/api/v1/compute/PhysicalSummaries?$top=10')).toBe(true);
  });

  it('maps patch_ucs_profile', () => {
    const { tool, input } = buildCall({ name: 'patch_ucs_profile', slots: { moid: 'xxx', body: { Description: 'Blue rack 3' } } });
    expect(tool).toBe('intersight.patch');
    expect(input.route).toBe('/api/v1/ucs/Profiles/xxx');
    expect(input.body.Description).toBe('Blue rack 3');
  });
});