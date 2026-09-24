# PolicyCheck

Independent, buyer-side seller policy facts for purchasing agents. Returns structured facts, matching source excerpts, retrieval provenance and an Ed25519-signed assessment. It does not issue scores, grades or purchase recommendations. A signature authenticates the issuer and payload; it does not prove that a merchant will honor a policy or that extraction is infallible.

## Inputs and interfaces

`POST /api/check` and `POST /api/v1/signed-assessment` accept JSON:

- `seller_url`: discover common policy paths on a seller's origin.
- `url`: retrieve exactly the specified policy page (redirects are disclosed).
- `policy_text` or `text`: analyze supplied text without following embedded links. An optional seller URL is a caller claim, not verified provenance.

Responses include `policies`, `clauses`, `sources`, `coverage`, `limitations`, `analysis_status`, `signed_assessment`, `signature`, and `audit_recorded`. Missing facts remain null. Source quotes are checked against retrieved text; semantic interpretation remains model-assisted. Source content hashes use SHA-256 of extracted text (supplied text is trimmed), not the original HTML bytes.

`/api/a2a` supports synchronous `message/send`. MCP: `npx -y policycheck-mcp@1.0.3`. Paid endpoint: `/api/x402/analyze` using x402 v2 on Base. OpenAPI: `public/openapi.json`; agent instructions: `public/skill.md`.

## Development and checks

Use Node 24 for release checks. Install with `npm ci`, then `npm run dev`. Run `npm run test:release`, `npm run typecheck:release`, and `npm run build`. The dependency-free release contract suite mocks external services; it does not establish live CDP settlement or model accuracy. The build's existing global type-check bypass remains; release paths have a separate strict type-check gate.

Required server environment: `OPENAI_API_KEY`, `POLICYCHECK_SIGNING_KEY` (32-byte Ed25519 seed, 64 hex characters). Preserve the existing signing seed on deployment. Audit persistence uses `KV_REST_API_URL` and `KV_REST_API_TOKEN`; failures are returned as `audit_recorded:false`.

Paid service additionally needs `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `X402_PAY_TO_ADDRESS`, `X402_NETWORK` (default `eip155:8453`), and `X402_PRICE` (default `0.03`). CDP credentials are required by default. Explicit `X402_ALLOW_NON_CDP=true` permits an alternate `X402_FACILITATOR_URL`; that configuration does not establish CDP Bazaar indexing.

Audit retrieval requires the same private, high-entropy `X-API-Key` used for requests (at least 24 characters); it is a bearer partition key. Shared anonymous audit history is not exposed.

See [release notes](RELEASE-1.0.3.md) for migration and production verification.
