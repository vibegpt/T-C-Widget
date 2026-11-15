# Lessons — PolicyCheck

## Prompt 2 (compact format + provenance)

### VoltGear clause bug — root cause
Diagnostic `[clause-raw]` showed LLM returns `clauses: []` (empty array) for the VoltGear terms page — not one misquoted clause. The "1 rejected" discarded value is `warranty.type = 'limited'` set without an evidence object (a scalar string on a boolean/null field). The LLM simply does not populate clause entries for simple single-page policy content. Fix: derive clauses deterministically from boolean facts that already pass the evidence check (`restocking_fee`, `binding_arbitration`, `class_action_waiver`), merged upstream in `deepAnalyze()` before both full and compact formats see the result. LLM clause wins on id collision.

### Compact size budget applies to the entire response body
The 1,500-char limit covers `signed_assessment` + `signature` + `signed_payload_hash` + `audit_recorded`. Drop `jwks_url` and `verification_url` from the compact body — both are static, always the same URLs, and documented. Measured at ~880 chars with 10 clauses.

### Never create or overwrite .env.local
Production env vars are stored in `.env.local` with real Vercel PRODUCTION values (Upstash + signing key). Never print/cat/echo/log/edit/overwrite it. Capture baselines by curling the live production endpoint instead.

### Redis keys written (Prompt 2)
All keys written to production Upstash must be listed here per project constraint:
- `audit:{uuid}` — existing audit records (90-day TTL). Pre-existing pattern.
- `assessment:{uuid}` — new full payload storage (7-day TTL, 604800 s). Added in Prompt 2.

### Next.js 15 dynamic route params
Route handlers receive `params` as `Promise<{id: string}>` — must `await params` before accessing the id. Test by passing `{params: Promise.resolve({id: '...'})}` from the test file.

### discovery.ts feeds the 402 payment-required header
`OUTPUT_EXAMPLE` in `src/lib/discovery.ts` is embedded verbatim into the x402 `payment-required` header via `declareDiscoveryExtension`. Any edit to that file changes the Bazaar metadata and therefore the 402 header value. Do not bump `OUTPUT_EXAMPLE.version` or add fields to it as part of a schema version bump — do it in a dedicated Bazaar session after the 402 baseline has been captured and the diff has been confirmed empty.

### checkAssessment requires provider field
`checkAssessment` checks `a.provider === 'policycheck.tools'` for `envelopeValid`. The compact envelope omits `provider` by design (saves chars). Tests that check `signature_valid` will pass; tests checking `.valid` or `.fresh` won't — use `verifySignature` directly for compact envelope tests.

### BFCache: pagehide e.persisted
`window.addEventListener('pagehide', () => registration.abort())` aborts even on BFCache freeze (browser stores the page to restore on back-nav). Fix: check `e.persisted` before aborting. Pair with `pageshow` re-registration when `e.persisted` is true.
