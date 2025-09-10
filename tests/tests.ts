import { describe, it, expect } from 'vitest';
import { canonicalString, sha256Base64 } from '../src/auth.js';

describe('HTTP Signature canonical string', () => {
  it('builds a correct string for GET with empty body', () => {
    const date = 'Tue, 09 Sep 2025 00:00:00 GMT';
    const { signingString, digestB64 } = canonicalString('GET', '/api/v1/compute/PhysicalSummaries?$top=5', 'intersight.com', date, '');
    expect(digestB64).toEqual(sha256Base64(''));
    expect(signingString).toContain('(request-target): get /api/v1/compute/PhysicalSummaries?$top=5');
    expect(signingString).toContain('host: intersight.com');
    expect(signingString).toContain(`date: ${date}`);
    expect(signingString).toContain('digest: SHA-256=');
  });

  it('computes digest over JSON body for PATCH', () => {
    const body = JSON.stringify({ Description: 'Blue rack 3' });
    const { digestB64 } = canonicalString('PATCH', '/api/v1/ucs/Profiles/abc', 'intersight.com', 'Tue, 09 Sep 2025 00:00:00 GMT', body);
    expect(digestB64).toEqual(sha256Base64(body));
  });
});