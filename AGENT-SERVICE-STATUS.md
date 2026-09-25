# Agent service implementation — 25 September 2026

Development base: upstream `57c0448bbac6c4102b6c5e62efa0b63dba794825`.
The existing stabilization release and npm production gates are preserved.

## Implemented

- Opt-in `/api/v1/assessments` with authenticated API keys, structured policy
  facts, signed evidence, optional source snapshots and signed billing context.
- Quote locations and hashes, explicit missing/rejected field status, numeric
  support and consistency checks. Signatures and quote presence are explicitly
  distinguished from semantic correctness or merchant compliance.
- Prepaid balance/usage endpoint, Stripe-hosted top-ups, signed webhook checks,
  session-level credit deduplication and refund/dispute suspension.
- Atomic Redis reservation/commit/release ledger with 24-hour response replay,
  per-account isolation, recovery of abandoned work, fencing, concurrency and
  attempt limits. No debit for failed, empty, unsigned or unrecorded results.
- Admin account provisioning, replacement API keys and revocation. Raw keys are
  returned once and only hashes are stored.
- MCP prepaid mode with retry keys and spending annotations; legacy A2A remains
  the default without a configured API key.
- OpenAPI schema, operator guide and ten-case synthetic extraction evaluation.

## Validation

Local validation passed: 24 existing release tests plus 45 new service tests
(69 total, zero skipped), including 14 tests against a real Redis 7.2.6 server.
Release TypeScript checks and the Next.js production build also passed.
CI provisions Redis and runs the service tests with no integration skips.
The actual Upstash SDK's automatic JSON deserialization has its own regression
test because it affects replay recovery.

Tests are reliability checks, not a claim about real-merchant extraction accuracy.
The ten-case live model evaluation requires funded OpenAI API access. A Stripe
sandbox hosted-checkout/webhook round trip and production Upstash connectivity
still need verification using the owning accounts' configuration.

## Live service status checked during this work

A fresh production `/api/check` request returned HTTP 200 with
`analysis_status: extraction_failed`, `audit_recorded: false`, and
`Extraction service failure: quota_exhausted`. The previously recorded production
blockers remain unresolved. No real payment was submitted or settled.

The new prepaid service defaults disabled. Do not call it launched, restore paid
traffic, or publish the npm release before the gates in `public/agent-service.md`
and `RELEASE-STATUS.md` pass. Production configuration was not changed in this work.

Existing legacy routes are still accessible and do not debit prepaid balances.
This is an opt-in agent-service beta, not an enforced service-wide paywall.
Refund amount reconciliation and account reinstatement remain operator tasks.
Financial ledger retention/backups must be configured before commercial launch.

## Publication status

The user explicitly authorized uploading this implementation to the public
`vibegpt/T-C-Widget` repository and opening a draft pull request on 25 September
2026. The proposed changes are prepared on `feat/agent-service-billing` for review.
See the pull request checks for GitHub CI results. Production activation remains
subject to the dependency and payment verification gates above.
