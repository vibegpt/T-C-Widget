import test from 'node:test';
import assert from 'node:assert/strict';
import { getJwks, signPayload } from '../../src/lib/signing.ts';

test('environment whitespace preserves the existing signing identity', () => {
  const original = process.env.POLICYCHECK_SIGNING_KEY;
  try {
    const seed = '12'.repeat(32); // Public test fixture, never a production key.
    process.env.POLICYCHECK_SIGNING_KEY = seed;
    const keys = getJwks();
    const signed = signPayload({ fixture: 'key-format-compatibility' });
    process.env.POLICYCHECK_SIGNING_KEY = ` \n${seed}\r\n`;
    assert.deepEqual(getJwks(), keys);
    assert.deepEqual(signPayload({ fixture: 'key-format-compatibility' }), signed);
  } finally {
    if (original === undefined) delete process.env.POLICYCHECK_SIGNING_KEY;
    else process.env.POLICYCHECK_SIGNING_KEY = original;
  }
});

test('malformed key content still fails closed', () => {
  const original = process.env.POLICYCHECK_SIGNING_KEY;
  try {
    for (const value of [' ', '12'.repeat(31), '12'.repeat(32) + 'not-hex']) {
      process.env.POLICYCHECK_SIGNING_KEY = value;
      assert.throws(() => getJwks(), /not configured correctly/);
      assert.throws(() => signPayload({ fixture: true }), /not configured correctly/);
    }
  } finally {
    if (original === undefined) delete process.env.POLICYCHECK_SIGNING_KEY;
    else process.env.POLICYCHECK_SIGNING_KEY = original;
  }
});
