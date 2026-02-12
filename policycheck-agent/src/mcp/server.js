#!/usr/bin/env node
// @ts-check
/**
 * PolicyCheck MCP Server
 * Model Context Protocol server that provides policy analysis tools for AI agents
 *
 * This server exposes PolicyCheck's policy analysis capabilities as MCP tools
 * that can be used by AI purchasing agents in the Agentic Commerce ecosystem.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import {
  analyzeSellerPolicies,
  generateAgentSummary,
  parseReturnPolicy,
  parseShippingPolicy,
  parseWarrantyPolicy,
  parseTermsAndConditions
} from '../parsers/commerce-policy-parser.js';

// Policy fetching utility
async function fetchPolicyFromUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PolicyCheck-Agent/1.0 (Policy Analysis Service)',
        'Accept': 'text/html,text/plain,application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    let text = await response.text();

    // Basic HTML to text conversion
    if (contentType.includes('html')) {
      // Remove scripts and styles
      text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      // Remove HTML tags but keep content
      text = text.replace(/<[^>]+>/g, ' ');
      // Decode HTML entities
      text = text.replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      // Normalize whitespace
      text = text.replace(/\s+/g, ' ').trim();
    }

    return text;
  } catch (error) {
    throw new Error(`Failed to fetch policy: ${error.message}`);
  }
}

// Create server instance
const server = new Server(
  {
    name: 'policycheck-service-agent',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    },
  }
);

// Define available tools
const TOOLS = [
  {
    name: 'analyze_seller_policies',
    description: `Comprehensive policy analysis for e-commerce sellers before purchase.

Analyzes return, shipping, warranty, and terms policies to assess buyer protection.
Returns risk score, key findings, and purchase recommendation.

Use this tool when:
- A user is about to purchase from an unfamiliar seller
- You need to assess the buyer protection level of a merchant
- The user asks about return/refund policies before buying

Returns structured assessment including:
- Overall risk score (low/medium/high/critical)
- Buyer protection score (0-100)
- Key policy points in plain English
- Risk flags (arbitration, no returns, restocking fees, etc.)
- Recommendation (proceed/proceed_with_caution/review_carefully/not_recommended)`,
    inputSchema: {
      type: 'object',
      properties: {
        seller_url: {
          type: 'string',
          description: 'Base URL of the seller (e.g., https://example-store.com)'
        },
        return_policy_url: {
          type: 'string',
          description: 'URL to the return/refund policy page (optional if return_policy_text provided)'
        },
        return_policy_text: {
          type: 'string',
          description: 'Raw text of the return policy (optional if return_policy_url provided)'
        },
        shipping_policy_url: {
          type: 'string',
          description: 'URL to the shipping policy page (optional)'
        },
        shipping_policy_text: {
          type: 'string',
          description: 'Raw text of the shipping policy (optional)'
        },
        warranty_policy_url: {
          type: 'string',
          description: 'URL to the warranty policy page (optional)'
        },
        warranty_policy_text: {
          type: 'string',
          description: 'Raw text of the warranty policy (optional)'
        },
        terms_url: {
          type: 'string',
          description: 'URL to terms and conditions (optional)'
        },
        terms_text: {
          type: 'string',
          description: 'Raw text of terms and conditions (optional)'
        }
      },
      required: []
    }
  },
  {
    name: 'analyze_return_policy',
    description: `Analyze a seller's return/refund policy.

Extracts key details:
- Return window (days)
- Restocking fees
- Who pays return shipping
- Exchange-only or store credit restrictions
- Final sale items
- Condition requirements`,
    inputSchema: {
      type: 'object',
      properties: {
        policy_url: {
          type: 'string',
          description: 'URL to the return policy page'
        },
        policy_text: {
          type: 'string',
          description: 'Raw text of the return policy (if URL not provided)'
        }
      },
      required: []
    }
  },
  {
    name: 'analyze_shipping_policy',
    description: `Analyze a seller's shipping policy.

Extracts key details:
- Free shipping threshold
- Shipping timeframes (standard/expedited)
- International shipping availability
- Handling time
- Carriers used
- Tracking availability`,
    inputSchema: {
      type: 'object',
      properties: {
        policy_url: {
          type: 'string',
          description: 'URL to the shipping policy page'
        },
        policy_text: {
          type: 'string',
          description: 'Raw text of the shipping policy (if URL not provided)'
        }
      },
      required: []
    }
  },
  {
    name: 'analyze_warranty',
    description: `Analyze a product or seller warranty policy.

Extracts key details:
- Warranty duration
- Warranty type (limited/full/lifetime/manufacturer)
- Coverage (defects, accidental damage, water damage)
- Exclusions
- Claim process`,
    inputSchema: {
      type: 'object',
      properties: {
        policy_url: {
          type: 'string',
          description: 'URL to the warranty policy page'
        },
        policy_text: {
          type: 'string',
          description: 'Raw text of the warranty policy (if URL not provided)'
        }
      },
      required: []
    }
  },
  {
    name: 'analyze_terms',
    description: `Analyze terms and conditions for legal risks.

Checks for:
- Binding arbitration clauses
- Class action waivers
- Liability caps
- Termination rights
- Auto-renewal terms
- Governing law/jurisdiction`,
    inputSchema: {
      type: 'object',
      properties: {
        terms_url: {
          type: 'string',
          description: 'URL to the terms and conditions page'
        },
        terms_text: {
          type: 'string',
          description: 'Raw text of terms and conditions (if URL not provided)'
        }
      },
      required: []
    }
  },
  {
    name: 'quick_risk_check',
    description: `Quick risk assessment from a seller URL.

Attempts to automatically find and analyze common policy pages:
- /policies/refund-policy
- /policies/shipping-policy
- /pages/terms-of-service
- /pages/warranty

Returns a quick risk score and key concerns.`,
    inputSchema: {
      type: 'object',
      properties: {
        seller_url: {
          type: 'string',
          description: 'Base URL of the seller (e.g., https://example-store.com)'
        }
      },
      required: ['seller_url']
    }
  }
];

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'analyze_seller_policies': {
        const policies = {};

        // Fetch or use provided policy texts
        if (args.return_policy_text) {
          policies.returns = args.return_policy_text;
        } else if (args.return_policy_url) {
          policies.returns = await fetchPolicyFromUrl(args.return_policy_url);
        }

        if (args.shipping_policy_text) {
          policies.shipping = args.shipping_policy_text;
        } else if (args.shipping_policy_url) {
          policies.shipping = await fetchPolicyFromUrl(args.shipping_policy_url);
        }

        if (args.warranty_policy_text) {
          policies.warranty = args.warranty_policy_text;
        } else if (args.warranty_policy_url) {
          policies.warranty = await fetchPolicyFromUrl(args.warranty_policy_url);
        }

        if (args.terms_text) {
          policies.terms = args.terms_text;
        } else if (args.terms_url) {
          policies.terms = await fetchPolicyFromUrl(args.terms_url);
        }

        if (Object.keys(policies).length === 0) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'No policies provided',
                message: 'Please provide at least one policy URL or text to analyze'
              })
            }]
          };
        }

        const analysis = analyzeSellerPolicies(policies);
        const summary = generateAgentSummary(analysis);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                analysis: analysis,
                humanReadableSummary: summary
              }, null, 2)
            }
          ]
        };
      }

      case 'analyze_return_policy': {
        let policyText = args.policy_text;
        if (!policyText && args.policy_url) {
          policyText = await fetchPolicyFromUrl(args.policy_url);
        }

        if (!policyText) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ error: 'No policy text or URL provided' })
            }]
          };
        }

        const result = parseReturnPolicy(policyText);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, returnPolicy: result }, null, 2)
          }]
        };
      }

      case 'analyze_shipping_policy': {
        let policyText = args.policy_text;
        if (!policyText && args.policy_url) {
          policyText = await fetchPolicyFromUrl(args.policy_url);
        }

        if (!policyText) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ error: 'No policy text or URL provided' })
            }]
          };
        }

        const result = parseShippingPolicy(policyText);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, shippingPolicy: result }, null, 2)
          }]
        };
      }

      case 'analyze_warranty': {
        let policyText = args.policy_text;
        if (!policyText && args.policy_url) {
          policyText = await fetchPolicyFromUrl(args.policy_url);
        }

        if (!policyText) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ error: 'No policy text or URL provided' })
            }]
          };
        }

        const result = parseWarrantyPolicy(policyText);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, warrantyPolicy: result }, null, 2)
          }]
        };
      }

      case 'analyze_terms': {
        let termsText = args.terms_text;
        if (!termsText && args.terms_url) {
          termsText = await fetchPolicyFromUrl(args.terms_url);
        }

        if (!termsText) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ error: 'No terms text or URL provided' })
            }]
          };
        }

        const result = parseTermsAndConditions(termsText);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, termsAndConditions: result }, null, 2)
          }]
        };
      }

      case 'quick_risk_check': {
        const baseUrl = args.seller_url.replace(/\/$/, '');
        const policies = {};
        const errors = [];

        // Common policy URL patterns
        const policyPaths = {
          returns: [
            '/policies/refund-policy',
            '/pages/return-policy',
            '/pages/returns',
            '/refund-policy',
            '/returns'
          ],
          shipping: [
            '/policies/shipping-policy',
            '/pages/shipping',
            '/shipping-policy',
            '/shipping'
          ],
          terms: [
            '/policies/terms-of-service',
            '/pages/terms-of-service',
            '/terms-of-service',
            '/terms',
            '/tos'
          ]
        };

        // Try to fetch each policy type
        for (const [policyType, paths] of Object.entries(policyPaths)) {
          for (const path of paths) {
            try {
              const text = await fetchPolicyFromUrl(baseUrl + path);
              if (text && text.length > 100) {
                policies[policyType] = text;
                break;
              }
            } catch {
              // Try next path
            }
          }
        }

        if (Object.keys(policies).length === 0) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Could not find any policy pages',
                message: 'Unable to automatically locate policy pages. Please provide direct URLs.',
                sellerUrl: baseUrl
              })
            }]
          };
        }

        const analysis = analyzeSellerPolicies(policies);
        const summary = generateAgentSummary(analysis);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              sellerUrl: baseUrl,
              policiesFound: Object.keys(policies),
              analysis: analysis,
              humanReadableSummary: summary
            }, null, 2)
          }]
        };
      }

      default:
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: `Unknown tool: ${name}` })
          }]
        };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message,
          tool: name
        })
      }],
      isError: true
    };
  }
});

// Handle resource listing (for documentation)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'policycheck://docs/overview',
        name: 'PolicyCheck Service Agent Overview',
        description: 'Documentation for using PolicyCheck as a service agent',
        mimeType: 'text/markdown'
      },
      {
        uri: 'policycheck://docs/risk-flags',
        name: 'Risk Flag Reference',
        description: 'Complete list of risk flags and their meanings',
        mimeType: 'text/markdown'
      }
    ]
  };
});

// Handle resource reading
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'policycheck://docs/overview') {
    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: `# PolicyCheck Service Agent

PolicyCheck is a policy analysis service agent for AI-powered commerce.

## Purpose

When AI purchasing agents help users buy products, PolicyCheck provides
pre-purchase due diligence by analyzing seller policies for:

- **Return policies**: Window, fees, restrictions
- **Shipping policies**: Timeframes, costs, coverage
- **Warranty policies**: Duration, coverage, exclusions
- **Terms & Conditions**: Legal risks, arbitration, liability

## Usage

Before completing a purchase, call \`analyze_seller_policies\` with
the seller's policy URLs or text to get a risk assessment.

## Risk Scores

- **Low (80-100)**: Safe to proceed
- **Medium (60-79)**: Proceed with caution
- **High (40-59)**: Review carefully
- **Critical (0-39)**: Not recommended

## Integration

PolicyCheck integrates with the Agentic Commerce Protocol (ACP) as a
service agent that purchasing agents can consult before checkout.
`
      }]
    };
  }

  if (uri === 'policycheck://docs/risk-flags') {
    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: `# Risk Flag Reference

## Return Policy Flags

| Flag | Description | Score Impact |
|------|-------------|--------------|
| no_returns | All sales final | -30 |
| restocking_fee | Fee for returns | -10 |
| customer_pays_return_shipping | Buyer pays shipping | -5 |
| exchange_only | No refunds, only exchanges | -15 |
| store_credit_only | No cash refunds | -10 |
| short_return_window | Less than 14 days | -10 |

## Warranty Flags

| Flag | Description | Score Impact |
|------|-------------|--------------|
| no_warranty | Sold as-is | -20 |
| short_warranty | Less than 12 months | -10 |
| water_damage_excluded | Common exclusion | -5 |

## Terms & Conditions Flags

| Flag | Description | Score Impact |
|------|-------------|--------------|
| binding_arbitration | Must arbitrate disputes | -15 |
| class_action_waiver | Can't join class actions | -10 |
| termination_at_will | Account can be closed | -10 |
| liability_cap | Damages limited | -5 |
| auto_renewal | Subscription auto-renews | -5 |

## Shipping Flags

| Flag | Description | Score Impact |
|------|-------------|--------------|
| no_tracking | No shipment tracking | -15 |
| long_handling_time | Over 5 days to ship | -5 |
`
      }]
    };
  }

  throw new Error(`Resource not found: ${uri}`);
});

// Run server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('PolicyCheck MCP Server running on stdio');
}

main().catch(console.error);
