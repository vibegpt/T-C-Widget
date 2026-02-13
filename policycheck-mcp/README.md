<!-- mcp-name: io.github.vibegpt/policycheck -->

# policycheck-mcp

MCP server for AI seller verification and policy risk analysis. Checks return policies, shipping, warranty, and terms of service for any online store.

Powered by [PolicyCheck](https://legaleasy.tools) — the policy analysis engine behind LegalEasy.

## Why use this?

AI purchasing agents and agentic commerce platforms need to verify sellers before completing transactions on behalf of users. PolicyCheck gives your agent the ability to:

- **Assess seller trustworthiness** before checkout
- **Flag risky policies** like no-refund clauses, binding arbitration, and class action waivers
- **Score buyer protection** on a 0–100 scale with factual summaries
- **Auto-discover policies** from any online store URL

Works with Claude Desktop, Claude Code, Cursor, and any MCP-compatible client.

## Tools

| Tool | Description |
|------|-------------|
| `analyze_seller` | Full risk analysis of a specific policy page URL. Returns risk level, buyer protection score, key findings, and a factual summary. |
| `quick_risk_check` | Give it a store URL and it auto-discovers return, shipping, and terms pages. Returns an overall risk score with per-policy breakdowns. |
| `check_policy_text` | Paste raw policy text and get an instant risk assessment. No URL needed — useful when text is already extracted. |

## Installation

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "policycheck": {
      "command": "npx",
      "args": ["-y", "policycheck-mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add policycheck -- npx -y policycheck-mcp
```

### Cursor

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "policycheck": {
      "command": "npx",
      "args": ["-y", "policycheck-mcp"]
    }
  }
}
```

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `POLICYCHECK_API_URL` | `https://legaleasy.tools/api/a2a` | A2A endpoint URL |

## How it works

Each tool sends a JSON-RPC 2.0 request to the PolicyCheck [A2A (Agent-to-Agent)](https://a2a-protocol.org) endpoint. The API analyzes seller policies and returns:

- **Risk level**: low / medium / high / critical
- **Buyer protection score**: 0–100
- **Key findings**: Plain-English summary of risks (arbitration clauses, no-refund policies, liability caps, etc.)
- **Summary**: Factual description of detected risk indicators and policy findings

## Example

Ask Claude: *"Get risk data for https://www.example-store.com"*

The agent calls `quick_risk_check`, gets back structured risk data, and uses it alongside purchase context to inform a decision.

## License

MIT
