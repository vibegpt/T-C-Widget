# Release checkpoint — 24 September 2026

## Retry in progress

The live JWKS endpoint recovered to HTTP 200. The candidate signer produces the same public key as production, and its signatures verify with that live key. A fresh production v2.0 assessment also returned HTTP 200 with a valid signature. The cause of the earlier HTTP 500 is not established. A narrow diagnostic deployed on main now reports safe readiness categories if signing fails again; no private key material is returned.

The release is being reintroduced from the current main tree, retaining that diagnostic and its regression test. Production checks and npm publication still must pass before calling the release complete. The earlier checkpoint below records the rollback and access investigation.

Production was restored to the previous application source with commit `9647d2151bb4aa8b08d5106aec4ddaf659377523`. Vercel reported a successful rollback deployment, and the public agent card returned the previous version. Do not call 1.0.3 released or published.

The complete candidate is preserved on `release/policycheck-1.0.3`. The original release passed 18 tests, strict release TypeScript checks, a full Next.js build and MCP packaging in GitHub Actions. The production check then failed: `/.well-known/jwks.json` returned HTTP 500. npm publication was skipped. The old production version also returned HTTP 500 from `/api/jwks` after rollback, so the live root cause is still unknown.

An additional key-format compatibility fix trims surrounding environment whitespace while rejecting malformed seeds. Two regression tests confirm identity/signatures are unchanged for whitespace-wrapped keys and malformed key content fails closed. All 19 dependency-free local tests pass; the separate real-SDK test runs in CI with dependencies installed. This fix is not yet a confirmed resolution of the production failure.

## Next required work

1. Use the authorized Vercel integration to inspect project `policycheck` in `todds-projects-d0181971` (GitHub-linked deployment URLs identify this project). Inspect runtime logs for `/api/jwks`; check the presence and production scope of `POLICYCHECK_SIGNING_KEY` or compatibility alias `POLICYCHECK_TAP_SIGNING_KEY`. Do not print secret values or generate a replacement identity without checking the existing key.
2. The user installed and authorized Vercel, and plugin discovery confirms it is installed. The session that wrote this checkpoint did not expose Vercel API tools. Browser Google sign-in failed with a 502 connection error. Do not ask the user to install or authorize Vercel again solely from this historical blocker.
3. Resolve the actual signing error and verify the candidate against the deployed key, including public-key verification and expiry. Validate CDP credentials, the unpaid 402 challenge, and Bazaar metadata. No real payment has been submitted by this release process.
4. Restore the candidate with a new commit based on the current main branch after checks pass; the rollback means blindly merging the old release history is insufficient. Preserve any newer user changes. Re-run production checks before npm publication.
5. The candidate's CI contains a one-shot production/publish path selected by `[release-1.0.3]` in a main-branch push commit message. It needs successful core checks and the unpaid x402 challenge. npm authentication or trusted publishing has not yet been tested because production checks blocked the publish job.

AgentKit adapter code was updated on `vibegpt/agentkit`, branch `feat/policycheck-action-provider`, commit `4fb0c848dbf5c73e5f0f9a67b859b93618ce1a2e`. It preserves facts, provenance and signatures and removes legacy score mapping. Coinbase PR #948 checks require maintainer approval. Updating the upstream PR description was denied by the GitHub integration (403), so its body still needs correction. No outreach messages were sent.
