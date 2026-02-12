# PolicyCheck + Agentic Commerce Protocol Integration

## Overview

This document demonstrates how PolicyCheck integrates as a **Service Agent** in the Agentic Commerce Protocol (ACP) ecosystem to provide pre-purchase policy analysis.

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER                                         │
│                    "Buy me wireless earbuds"                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PURCHASING AGENT (ChatGPT)                        │
│                                                                      │
│  1. Search product catalogs via ACP                                 │
│  2. Find matching products from sellers                             │
│  3. ─────────────────────────────────────────────────────────────   │
│     │ BEFORE CHECKOUT: Consult PolicyCheck Service Agent │          │
│     └───────────────────────────────────────────────────            │
│  4. Present findings + product to user                              │
│  5. Complete checkout via ACP if user approves                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────────────┐
│     SELLER (via ACP)      │   │   POLICYCHECK SERVICE AGENT       │
│                           │   │                                    │
│  • Product catalog        │   │  • Fetches seller policies        │
│  • Checkout API           │   │  • Analyzes return/shipping/      │
│  • Payment processing     │   │    warranty/terms                 │
│                           │   │  • Returns risk assessment        │
└───────────────────────────┘   │  • Provides recommendation        │
                                └───────────────────────────────────┘
```

## Sample Flow

### Step 1: User Intent

```
User: "Help me buy wireless earbuds under $100 from a reputable seller"
```

### Step 2: Purchasing Agent Finds Products

The purchasing agent searches ACP-enabled sellers and finds:

```json
{
  "product": {
    "name": "ProSound Wireless Earbuds",
    "price": 79.99,
    "seller": {
      "name": "TechGadgets Store",
      "url": "https://techgadgets-store.com",
      "acp_merchant_id": "merchant_abc123"
    }
  }
}
```

### Step 3: Purchasing Agent Consults PolicyCheck

Before presenting to user, the agent calls PolicyCheck:

```http
POST https://api.policycheck.ai/v1/acp/policy-check
Content-Type: application/json
X-API-Key: sk_live_xxx

{
  "seller_id": "merchant_abc123",
  "seller_url": "https://techgadgets-store.com",
  "checkout_context": {
    "cart_total": 79.99,
    "currency": "USD",
    "items": [
      {
        "name": "ProSound Wireless Earbuds",
        "quantity": 1,
        "price": 79.99
      }
    ]
  }
}
```

### Step 4: PolicyCheck Response

```json
{
  "service_agent": "policycheck",
  "version": "1.0.0",
  "assessment": {
    "risk_level": "medium",
    "buyer_protection_score": 72,
    "recommendation": "proceed_with_caution",
    "should_warn_user": true
  },
  "summary": "30-day returns with 15% restocking fee. Free shipping over $50. 1-year limited warranty.",
  "details": {
    "overallRiskScore": "medium",
    "buyerProtectionScore": 72,
    "returnPolicy": {
      "allowsReturns": true,
      "returnWindowDays": 30,
      "restockingFeePercent": 15,
      "returnShippingPaidBy": "customer",
      "keyPoints": [
        "30-day return window.",
        "15% restocking fee on returns.",
        "Customer pays return shipping."
      ]
    },
    "shippingPolicy": {
      "freeShippingAvailable": true,
      "freeShippingThreshold": 50,
      "standardShippingDays": { "min": 5, "max": 7 },
      "keyPoints": [
        "Free shipping on orders over $50.",
        "Standard shipping: 5-7 days."
      ]
    },
    "warrantyPolicy": {
      "hasWarranty": true,
      "warrantyDurationMonths": 12,
      "warrantyType": "limited",
      "exclusions": ["water damage", "accidental damage"],
      "keyPoints": [
        "Limited warranty: 12 months.",
        "Warranty excludes: water damage, accidental damage."
      ]
    }
  },
  "display": {
    "title": "Seller Policy Assessment",
    "body": "## Seller Policy Assessment\n\n**Risk Level:** MEDIUM\n**Buyer Protection Score:** 72/100\n\n### Key Points\n- 30-day return window.\n- 15% restocking fee on returns.\n- Customer pays return shipping.\n- Free shipping on orders over $50.\n- Limited warranty: 12 months.\n\n### Risk Flags\n- Restocking Fee\n- Customer Pays Return Shipping\n\n### Recommendation\nProceed with caution. Review policies before purchasing.",
    "warnings": [
      "Returns may incur a restocking fee"
    ]
  }
}
```

### Step 5: Purchasing Agent Presents to User

```
Agent: I found ProSound Wireless Earbuds for $79.99 from TechGadgets Store.

Policy Check Results:

Buyer Protection: 72/100 (Medium Risk)

Key Points:
- 30-day return window
- 15% restocking fee if you return
- You pay return shipping (~$8-12)
- Free shipping (your order qualifies)
- 1-year warranty (excludes water/drop damage)

My Take: This is a decent seller. If you're confident about the
earbuds, go ahead. But if you're unsure, factor in potential return
costs of ~$20-25 if they don't work out.

Would you like to proceed with the purchase?
```

### Step 6: User Decides

```
User: "Yes, let's buy them"
```

### Step 7: Purchasing Agent Completes ACP Checkout

The agent proceeds with the standard ACP checkout flow:
1. `CreateCheckoutRequest` to seller
2. User reviews cart
3. `CompleteCheckoutRequest` with SharedPaymentToken
4. Order confirmation

---

## MCP Integration (Alternative)

For AI platforms using Model Context Protocol (MCP), PolicyCheck can be added as an MCP server:

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "policycheck": {
      "command": "npx",
      "args": ["-y", "@policycheck/service-agent"]
    }
  }
}
```

### Available MCP Tools

```
analyze_seller_policies  - Full policy analysis
analyze_return_policy    - Return policy only
analyze_shipping_policy  - Shipping policy only
analyze_warranty         - Warranty policy only
analyze_terms            - Terms & conditions only
quick_risk_check         - Auto-discover and analyze from URL
```

### Example MCP Tool Call

```json
{
  "tool": "analyze_seller_policies",
  "arguments": {
    "seller_url": "https://techgadgets-store.com",
    "return_policy_url": "https://techgadgets-store.com/policies/refund-policy",
    "shipping_policy_url": "https://techgadgets-store.com/policies/shipping-policy"
  }
}
```

---

## Integration Checklist

### For AI Platform Developers

- [ ] Add PolicyCheck API endpoint to your agent's tool/function list
- [ ] Call `/v1/acp/policy-check` before presenting purchase options
- [ ] Display `assessment.should_warn_user` warnings to users
- [ ] Include `display.body` in user-facing output
- [ ] Handle rate limits (100 req/min free tier)

### For E-commerce Platforms

- [ ] Ensure policy pages are crawlable (no heavy JS rendering)
- [ ] Use standard policy URL paths (`/policies/refund-policy`, etc.)
- [ ] Include structured policy information in page content
- [ ] Consider exposing policy data via API for faster analysis

---

## API Reference

### Endpoint: `/v1/acp/policy-check`

**Purpose**: ACP-integrated policy check for purchasing agents

**Request**:
```json
{
  "seller_id": "string",          // Required: Seller identifier
  "seller_url": "string",         // Seller website URL
  "checkout_context": {           // Optional: ACP checkout context
    "cart_total": 79.99,
    "currency": "USD",
    "items": [...]
  },
  "policy_urls": {                // Optional: Direct policy URLs
    "returns": "https://...",
    "shipping": "https://...",
    "warranty": "https://...",
    "terms": "https://..."
  }
}
```

**Response**:
```json
{
  "service_agent": "policycheck",
  "version": "1.0.0",
  "assessment": {
    "risk_level": "low|medium|high|critical",
    "buyer_protection_score": 0-100,
    "recommendation": "proceed|proceed_with_caution|review_carefully|not_recommended",
    "should_warn_user": boolean
  },
  "summary": "Brief summary for agent",
  "details": { /* Full analysis object */ },
  "display": {
    "title": "string",
    "body": "Markdown for user display",
    "warnings": ["string"]
  }
}
```

---

## Contact

- **API Support**: api@policycheck.ai
- **Partnership Inquiries**: partners@policycheck.ai
- **Documentation**: https://policycheck.ai/docs
