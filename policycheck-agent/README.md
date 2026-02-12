# PolicyCheck Service Agent

**Pre-purchase policy analysis for AI-powered commerce**

PolicyCheck is a **Service Agent** for the [Agentic Commerce Protocol (ACP)](https://www.agenticcommerce.dev/) that helps AI purchasing agents make informed decisions by analyzing seller policies before checkout.

## 🎯 What It Does

When an AI agent helps a user buy something online, PolicyCheck provides due diligence by analyzing:

- **Return policies** - Window, fees, restrictions
- **Shipping policies** - Timeframes, costs, coverage
- **Warranty policies** - Duration, coverage, exclusions
- **Terms & conditions** - Arbitration, liability, auto-renewal

## 🔌 Integration Options

### 1. REST API (ACP-Compatible)

```bash
POST https://api.policycheck.ai/v1/acp/policy-check
```

```json
{
  "seller_url": "https://example-store.com",
  "checkout_context": {
    "cart_total": 79.99,
    "items": [{ "name": "Wireless Earbuds", "price": 79.99 }]
  }
}
```

**Response:**
```json
{
  "assessment": {
    "risk_level": "medium",
    "buyer_protection_score": 72,
    "should_warn_user": true
  },
  "summary": "30-day returns with 15% restocking fee. Free shipping over $50.",
  "display": {
    "warnings": ["⚠️ Returns may incur a restocking fee"]
  }
}
```

### 2. MCP Server (Model Context Protocol)

For Claude, ChatGPT, and other MCP-compatible AI systems:

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "policycheck": {
      "command": "npx",
      "args": ["-y", "@policycheck/service-agent", "mcp"]
    }
  }
}
```

**Available Tools:**
- `analyze_seller_policies` - Comprehensive analysis
- `analyze_return_policy` - Return policy only
- `analyze_shipping_policy` - Shipping policy only
- `analyze_warranty` - Warranty only
- `analyze_terms` - Terms & conditions only
- `quick_risk_check` - Auto-discover policies from URL

### 3. ChatGPT Custom GPT

Import `specs/chatgpt-gpt-config.json` when creating a Custom GPT.

## 🚀 Quick Start

### Run the API Server

```bash
cd policycheck-agent
npm install
npm start
# Server running on http://localhost:3100
```

### Run the MCP Server

```bash
npm run mcp
# MCP server running on stdio
```

### Test the API

```bash
curl -X POST http://localhost:3100/v1/quick-check \
  -H "Content-Type: application/json" \
  -d '{"seller_url": "https://example-store.com"}'
```

## 📊 Risk Assessment

PolicyCheck returns a **Buyer Protection Score** (0-100) based on policy analysis:

| Score | Risk Level | Recommendation |
|-------|------------|----------------|
| 80-100 | 🟢 Low | Safe to proceed |
| 60-79 | 🟡 Medium | Proceed with caution |
| 40-59 | 🟠 High | Review carefully |
| 0-39 | 🔴 Critical | Not recommended |

### Risk Flags Detected

**Returns:**
- `no_returns` - All sales final
- `restocking_fee` - Fee for returns
- `customer_pays_return_shipping`
- `exchange_only` - No refunds
- `store_credit_only` - No cash refunds
- `short_return_window` - Less than 14 days

**Terms:**
- `binding_arbitration` - Must arbitrate disputes
- `class_action_waiver` - Can't join class actions
- `termination_at_will` - Account can be closed
- `liability_cap` - Damages limited

**Shipping:**
- `no_tracking` - No shipment tracking
- `long_handling_time` - Over 5 days to ship

**Warranty:**
- `no_warranty` - Sold as-is
- `short_warranty` - Less than 12 months

## 🔗 ACP Integration Flow

```
User: "Buy me earbuds from TechStore"
         │
         ▼
┌─────────────────────────────────────┐
│    AI Purchasing Agent (ChatGPT)    │
│                                     │
│  1. Find products via ACP           │
│  2. ──────────────────────────────  │
│     │ Call PolicyCheck            │ │
│     └─────────────────────────────  │
│  3. Present findings to user        │
│  4. Complete checkout if approved   │
└─────────────────────────────────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌─────────────────┐  ┌──────────────────────┐
│  Seller (ACP)   │  │  PolicyCheck Agent   │
│  • Catalog      │  │  • Analyze policies  │
│  • Checkout     │  │  • Return risk score │
│  • Payment      │  │  • Warn if needed    │
└─────────────────┘  └──────────────────────┘
```

## 📁 Project Structure

```
policycheck-agent/
├── src/
│   ├── api/
│   │   └── server.js         # REST API server
│   ├── mcp/
│   │   └── server.js         # MCP server
│   ├── parsers/
│   │   └── commerce-policy-parser.js  # Policy analysis
│   └── utils/
├── specs/
│   ├── policycheck-acp-openapi.yaml   # OpenAPI spec
│   └── chatgpt-gpt-config.json        # GPT configuration
├── examples/
│   └── acp-integration-flow.md        # Integration guide
├── package.json
└── README.md
```

## 🔒 Security

- All policy fetches use timeouts and rate limiting
- No sensitive user data is stored
- API keys required in production
- CORS configured for approved origins

## 📖 API Documentation

Full OpenAPI specification: `specs/policycheck-acp-openapi.yaml`

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /v1/analyze/comprehensive` | Full policy analysis |
| `POST /v1/analyze/returns` | Return policy only |
| `POST /v1/analyze/shipping` | Shipping policy only |
| `POST /v1/analyze/warranty` | Warranty only |
| `POST /v1/analyze/terms` | Terms & conditions |
| `POST /v1/quick-check` | Auto-discover from URL |
| `POST /v1/acp/policy-check` | ACP-integrated check |

## ⚠️ Disclaimer

PolicyCheck provides policy analysis and recommendations for informational purposes only. It does not constitute legal advice. Always consult with a qualified professional for legal questions.

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 🔗 Links

- [Agentic Commerce Protocol](https://www.agenticcommerce.dev/)
- [Stripe Agentic Commerce](https://stripe.com/agentic-commerce)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [PolicyCheck Documentation](https://policycheck.ai/docs)
