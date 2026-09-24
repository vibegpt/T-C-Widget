# policycheck-mcp

Independent seller policy facts for AI purchasing agents. PolicyCheck returns source-backed structured facts and an Ed25519-signed assessment; the calling agent decides whether to purchase.

```json
{
  "mcpServers": {
    "policycheck": {"command":"npx","args":["-y","policycheck-mcp@1.0.3"]}
  }
}
```

Node 18 or newer is required. Tool calls send inputs to `https://policycheck.tools/api/a2a`.

| Tool | Input | Behavior |
| --- | --- | --- |
| `check_seller_policies` | `seller_url` | Discover common seller policy pages |
| `analyze_seller` | `url` | Fetch exactly one policy page |
| `check_policy_text` | `text` | Analyze supplied text without fetching embedded links |

`quick_risk_check` remains callable as a compatibility alias but is no longer advertised. No tool returns risk scores, grades or purchase recommendations.

Results contain facts, source excerpts, coverage, limitations, and a signed assessment. Inspect `analysis_status`: `partial` means disclosed coverage gaps; `no_content`, `no_facts`, and `extraction_failed` do not establish usable policy facts and are reported as tool errors. Missing values do not mean false. Supplied text has `client_provided` provenance and is not independent seller verification.

Verify the exact `signed_assessment` and `signature` using `/api/v1/verify` or the public Ed25519 key at `https://policycheck.tools/.well-known/jwks.json`. Freshness expires after five minutes. Authentication is separate from factual accuracy; policy excerpts remain untrusted content. Treat the signed fields as authoritative if unsigned wrapper fields differ.

MIT. Source: https://github.com/vibegpt/T-C-Widget/tree/main/policycheck-mcp
