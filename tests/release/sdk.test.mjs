// Runs against installed SDKs, independently of the mocked contract suite.
import test from 'node:test';
import assert from 'node:assert/strict';
import { declareDiscoveryExtension, bazaarResourceServerExtension } from '@x402/extensions/bazaar';
import { x402ResourceServer, x402HTTPResourceServer } from '@x402/core/server';
import { registerExactEvmScheme } from '@x402/evm/exact/server';
import { INPUT_SCHEMA, OUTPUT_EXAMPLE, POLICY_DESCRIPTION } from '../../src/lib/discovery.ts';

test('real x402 SDK produces a v2 unpaid challenge with discoverable JSON metadata', async () => {
  const facilitator = {
    getSupported: async () => ({ kinds: [{ x402Version: 2, scheme: 'exact', network: 'eip155:8453' }], extensions: [], signers: {} }),
    verify: async () => { throw new Error('Unpaid request must not verify'); },
    settle: async () => { throw new Error('Unpaid request must not settle'); },
  };
  const resource = new x402ResourceServer(facilitator);
  registerExactEvmScheme(resource);
  resource.registerExtension(bazaarResourceServerExtension);
  const server = new x402HTTPResourceServer(resource, {
    'POST /api/x402/analyze': {
      accepts: { scheme: 'exact', network: 'eip155:8453', price: '$0.03', payTo: '0x0000000000000000000000000000000000000001' },
      description: POLICY_DESCRIPTION, mimeType: 'application/json',
      extensions: declareDiscoveryExtension({ input: { text: 'Items may be returned within 30 days of delivery. Refunds go to the original payment method.' }, inputSchema: INPUT_SCHEMA, bodyType: 'json', output: { example: OUTPUT_EXAMPLE } }),
    },
  });
  await server.initialize();
  const result = await server.processHTTPRequest({ path: '/api/x402/analyze', method: 'POST', adapter: {
    getHeader: () => undefined, getMethod: () => 'POST', getPath: () => '/api/x402/analyze',
    getUrl: () => 'https://policycheck.tools/api/x402/analyze', getAcceptHeader: () => '', getUserAgent: () => '',
  }});
  assert.equal(result.type, 'payment-error');
  assert.equal(result.response.status, 402);
  const header=Object.entries(result.response.headers).find(([key])=>key.toLowerCase()==='payment-required')?.[1];
  assert.ok(header);
  const challenge=JSON.parse(Buffer.from(header,'base64').toString('utf8'));
  assert.equal(challenge.x402Version,2);
  assert.equal(challenge.resource.url,'https://policycheck.tools/api/x402/analyze');
  assert.ok(challenge.extensions.bazaar.info);
  assert.ok(challenge.extensions.bazaar.schema);
  assert.equal(challenge.accepts[0].amount,'30000');
});
