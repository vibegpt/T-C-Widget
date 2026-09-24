# PolicyCheck release checkpoint — 24 September 2026

## Current state: application deployed; npm publication blocked

PR #2 merged as `364618404c70a87ba41d89f80104b76cbdd79d40`. The follow-up diagnostic commit `5be205cb590d67fb925114634a0774ddd7e6dbf4` is deployed successfully on Vercel. Its CI passed 24 release tests, release TypeScript checks, the full Next.js build and MCP packaging.

- PR: https://github.com/vibegpt/T-C-Widget/pull/2
- Passing latest code checks: https://github.com/vibegpt/T-C-Widget/actions/runs/35971799577
- Production verification failure: https://github.com/vibegpt/T-C-Widget/actions/runs/35971159804
- Deployed diagnostic revision: https://vercel.com/todds-projects-d0181971/policycheck/2sqA1qN5kyL4fqqp8d9bHbepYBQZ

The production release check failed on `analysis_status: extraction_failed`, so npm publication was skipped. The npm registry was checked during this session and still reported `policycheck-mcp@1.0.2`. Do not announce 1.0.3 as published. npm publishing authentication has not yet been exercised.

## Confirmed production blockers

1. **OpenAI credit balance:** a fresh production `/api/check` response reports `Extraction service failure: quota_exhausted`. Independently, the key in the supplied project archive returned HTTP 429 with `credit_balance_exhausted` and `insufficient_quota`. Restore the credit balance/billing for the OpenAI project used by the production `OPENAI_API_KEY`.
2. **Audit storage connection:** production reports `audit_recorded: false`, and a fresh private audit-log partition request returns HTTP 503 with `storage_connection_failed`. Restore the `policycheck-kv` Upstash connection; verify the database is active and production `KV_REST_API_URL`/`KV_REST_API_TOKEN` refer to it. The exact connection failure is not yet established. A PING using the archived configuration returned HTTP 502; this alone does not identify the cause.

No secret values were printed, committed, or rotated. The connected Vercel app now exposes tools, but access to `todds-projects-d0181971` was explicitly denied (403); its team listing was empty. Direct Vercel configuration/runtime-log work requires access to that owning team. Do not repeat installation advice: the plugin is installed.

## Verified live

- The public JWKS returns HTTP 200 and preserves the existing signing identity. The earlier JWKS HTTP 500 root cause remains unconfirmed.
- Agent card 1.0.3 is deployed. Agent JSON, agent-registration JSON, JWKS, OpenAPI and skill.md return HTTP 200.
- x402 initialization succeeds in CDP mode.
- The unpaid x402 POST returns a v2 HTTP 402 challenge with the canonical resource and both `extensions.bazaar.info` and `extensions.bazaar.schema`.
- No real payment was submitted. Actual settlement, authenticated CDP validation, and Bazaar search indexing are **not verified**. A prior unauthenticated CDP validation attempt returned HTTP 405; that was not validation acceptance.
- Extractor failures return no inferred policy conclusions. Failed/empty analyses do not settle payment. Safe diagnostic categories do not expose raw provider errors.

## Resume after service restoration

Use GitHub Actions → **PolicyCheck release checks** → **Run workflow** on branch **main**. The workflow now supports manual dispatch on main. It runs the full checks, then production verification including an actual evidence-backed extraction, public-key signature verification, a successful audit write, and the unpaid x402 challenge. Only then may it publish `policycheck-mcp@1.0.3`.

If npm authentication fails, configure the package owner's npm trusted publisher or the existing `NPM_TOKEN` secret. The trusted-publisher workflow filename is `policycheck-release.yml`, owner `vibegpt`, repository `T-C-Widget`; no GitHub environment is configured. Do not weaken the production gates or claim publication without checking the registry.

After publication, complete an explicitly reviewed paid round-trip and confirm Bazaar indexing before resuming additional distribution integrations. No outreach has been sent.

## Other preserved work

- Both PR #2 review findings were fixed: `/api/check` retains its `check` audit event, and policy fetching offers every validated public DNS address to Node's connection fallback while rejecting private-address results.
- MCP advertises `check_seller_policies` with the old `quick_risk_check` callable alias retained.
- AgentKit adapter commit `4fb0c848dbf5c73e5f0f9a67b859b93618ce1a2e` remains on `vibegpt/agentkit`, branch `feat/policycheck-action-provider`. Coinbase PR #948 checks need maintainer approval. Updating its description was denied by the GitHub integration, so the old scoring description still needs correction.
