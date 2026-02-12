// @ts-check
/**
 * PolicyCheck Service Agent REST API
 * ACP-compatible REST API for policy analysis
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import {
  analyzeSellerPolicies,
  generateAgentSummary,
  parseReturnPolicy,
  parseShippingPolicy,
  parseWarrantyPolicy,
  parseTermsAndConditions
} from '../parsers/commerce-policy-parser.js';

const app = express();
const PORT = process.env.PORT || 3100;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    error: 'rate_limit_exceeded',
    message: 'Too many requests. Please wait before retrying.',
    code: 'RATE_LIMITED'
  }
});
app.use('/v1/', limiter);

// API Key validation (simple implementation)
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  // In production, validate against database
  // For now, allow requests without key in development
  if (process.env.NODE_ENV === 'production' && !apiKey) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'API key required',
      code: 'UNAUTHORIZED'
    });
  }

  next();
};

// Utility: Fetch policy from URL
async function fetchPolicyFromUrl(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PolicyCheck-Agent/1.0 (Policy Analysis Service)',
        'Accept': 'text/html,text/plain,application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    let text = await response.text();

    // Basic HTML to text conversion
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('html')) {
      text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      text = text.replace(/<[^>]+>/g, ' ');
      text = text.replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      text = text.replace(/\s+/g, ' ').trim();
    }

    return text;
  } catch (error) {
    throw new Error(`Failed to fetch: ${error.message}`);
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'policycheck-agent', version: '1.0.0' });
});

// API Info
app.get('/v1', (req, res) => {
  res.json({
    service: 'PolicyCheck Service Agent',
    version: '1.0.0',
    description: 'Policy analysis service agent for Agentic Commerce',
    endpoints: {
      comprehensive: 'POST /v1/analyze/comprehensive',
      returns: 'POST /v1/analyze/returns',
      shipping: 'POST /v1/analyze/shipping',
      warranty: 'POST /v1/analyze/warranty',
      terms: 'POST /v1/analyze/terms',
      quickCheck: 'POST /v1/quick-check',
      acpPolicyCheck: 'POST /v1/acp/policy-check'
    },
    documentation: 'https://policycheck.ai/docs/api'
  });
});

// Comprehensive analysis
app.post('/v1/analyze/comprehensive', validateApiKey, async (req, res) => {
  try {
    const {
      return_policy_url, return_policy_text,
      shipping_policy_url, shipping_policy_text,
      warranty_policy_url, warranty_policy_text,
      terms_url, terms_text
    } = req.body;

    const policies = {};

    // Fetch or use provided texts
    if (return_policy_text) {
      policies.returns = return_policy_text;
    } else if (return_policy_url) {
      policies.returns = await fetchPolicyFromUrl(return_policy_url);
    }

    if (shipping_policy_text) {
      policies.shipping = shipping_policy_text;
    } else if (shipping_policy_url) {
      policies.shipping = await fetchPolicyFromUrl(shipping_policy_url);
    }

    if (warranty_policy_text) {
      policies.warranty = warranty_policy_text;
    } else if (warranty_policy_url) {
      policies.warranty = await fetchPolicyFromUrl(warranty_policy_url);
    }

    if (terms_text) {
      policies.terms = terms_text;
    } else if (terms_url) {
      policies.terms = await fetchPolicyFromUrl(terms_url);
    }

    if (Object.keys(policies).length === 0) {
      return res.status(400).json({
        error: 'no_policies_provided',
        message: 'Please provide at least one policy URL or text'
      });
    }

    const analysis = analyzeSellerPolicies(policies);
    const summary = generateAgentSummary(analysis);

    res.json({
      success: true,
      analysis,
      humanReadableSummary: summary
    });
  } catch (error) {
    console.error('Comprehensive analysis error:', error);
    res.status(500).json({
      error: 'analysis_failed',
      message: error.message
    });
  }
});

// Return policy analysis
app.post('/v1/analyze/returns', validateApiKey, async (req, res) => {
  try {
    const { policy_url, policy_text } = req.body;

    let text = policy_text;
    if (!text && policy_url) {
      text = await fetchPolicyFromUrl(policy_url);
    }

    if (!text) {
      return res.status(400).json({
        error: 'no_policy_provided',
        message: 'Provide policy_url or policy_text'
      });
    }

    const result = parseReturnPolicy(text);
    res.json({ success: true, returnPolicy: result });
  } catch (error) {
    res.status(500).json({ error: 'analysis_failed', message: error.message });
  }
});

// Shipping policy analysis
app.post('/v1/analyze/shipping', validateApiKey, async (req, res) => {
  try {
    const { policy_url, policy_text } = req.body;

    let text = policy_text;
    if (!text && policy_url) {
      text = await fetchPolicyFromUrl(policy_url);
    }

    if (!text) {
      return res.status(400).json({
        error: 'no_policy_provided',
        message: 'Provide policy_url or policy_text'
      });
    }

    const result = parseShippingPolicy(text);
    res.json({ success: true, shippingPolicy: result });
  } catch (error) {
    res.status(500).json({ error: 'analysis_failed', message: error.message });
  }
});

// Warranty policy analysis
app.post('/v1/analyze/warranty', validateApiKey, async (req, res) => {
  try {
    const { policy_url, policy_text } = req.body;

    let text = policy_text;
    if (!text && policy_url) {
      text = await fetchPolicyFromUrl(policy_url);
    }

    if (!text) {
      return res.status(400).json({
        error: 'no_policy_provided',
        message: 'Provide policy_url or policy_text'
      });
    }

    const result = parseWarrantyPolicy(text);
    res.json({ success: true, warrantyPolicy: result });
  } catch (error) {
    res.status(500).json({ error: 'analysis_failed', message: error.message });
  }
});

// Terms analysis
app.post('/v1/analyze/terms', validateApiKey, async (req, res) => {
  try {
    const { policy_url, policy_text, terms_url, terms_text } = req.body;

    let text = policy_text || terms_text;
    if (!text && (policy_url || terms_url)) {
      text = await fetchPolicyFromUrl(policy_url || terms_url);
    }

    if (!text) {
      return res.status(400).json({
        error: 'no_terms_provided',
        message: 'Provide terms_url or terms_text'
      });
    }

    const result = parseTermsAndConditions(text);
    res.json({ success: true, termsAndConditions: result });
  } catch (error) {
    res.status(500).json({ error: 'analysis_failed', message: error.message });
  }
});

// Quick check from seller URL
app.post('/v1/quick-check', validateApiKey, async (req, res) => {
  try {
    const { seller_url } = req.body;

    if (!seller_url) {
      return res.status(400).json({
        error: 'seller_url_required',
        message: 'Provide seller_url'
      });
    }

    const baseUrl = seller_url.replace(/\/$/, '');
    const policies = {};

    // Common policy paths
    const policyPaths = {
      returns: ['/policies/refund-policy', '/pages/return-policy', '/returns'],
      shipping: ['/policies/shipping-policy', '/pages/shipping', '/shipping'],
      terms: ['/policies/terms-of-service', '/terms-of-service', '/terms']
    };

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
      return res.json({
        success: false,
        sellerUrl: baseUrl,
        error: 'no_policies_found',
        message: 'Could not automatically locate policy pages. Please provide direct URLs.'
      });
    }

    const analysis = analyzeSellerPolicies(policies);
    const summary = generateAgentSummary(analysis);

    res.json({
      success: true,
      sellerUrl: baseUrl,
      policiesFound: Object.keys(policies),
      analysis,
      humanReadableSummary: summary
    });
  } catch (error) {
    res.status(500).json({ error: 'quick_check_failed', message: error.message });
  }
});

// ACP Integration endpoint
app.post('/v1/acp/policy-check', validateApiKey, async (req, res) => {
  try {
    const { seller_id, seller_url, checkout_context, policy_urls } = req.body;

    if (!seller_id && !seller_url) {
      return res.status(400).json({
        error: 'seller_required',
        message: 'Provide seller_id or seller_url'
      });
    }

    const policies = {};

    // Use provided policy URLs or try to discover them
    if (policy_urls) {
      if (policy_urls.returns) {
        policies.returns = await fetchPolicyFromUrl(policy_urls.returns);
      }
      if (policy_urls.shipping) {
        policies.shipping = await fetchPolicyFromUrl(policy_urls.shipping);
      }
      if (policy_urls.warranty) {
        policies.warranty = await fetchPolicyFromUrl(policy_urls.warranty);
      }
      if (policy_urls.terms) {
        policies.terms = await fetchPolicyFromUrl(policy_urls.terms);
      }
    }

    // If no policies provided, try auto-discovery
    if (Object.keys(policies).length === 0 && seller_url) {
      const baseUrl = seller_url.replace(/\/$/, '');
      const policyPaths = {
        returns: ['/policies/refund-policy', '/pages/return-policy'],
        shipping: ['/policies/shipping-policy', '/pages/shipping'],
        terms: ['/policies/terms-of-service', '/terms']
      };

      for (const [policyType, paths] of Object.entries(policyPaths)) {
        for (const path of paths) {
          try {
            const text = await fetchPolicyFromUrl(baseUrl + path);
            if (text && text.length > 100) {
              policies[policyType] = text;
              break;
            }
          } catch {
            // Continue
          }
        }
      }
    }

    const analysis = Object.keys(policies).length > 0
      ? analyzeSellerPolicies(policies)
      : {
          overallRiskScore: 'unknown',
          buyerProtectionScore: null,
          recommendation: 'manual_review',
          allRiskFlags: ['no_policies_found'],
          allKeyPoints: ['Could not analyze policies - manual review recommended']
        };

    // Format response for ACP integration
    const shouldWarn = analysis.overallRiskScore === 'high' ||
                       analysis.overallRiskScore === 'critical' ||
                       analysis.buyerProtectionScore < 60;

    const warnings = [];
    if (analysis.allRiskFlags?.includes('no_returns')) {
      warnings.push('⚠️ This seller does not accept returns');
    }
    if (analysis.allRiskFlags?.includes('binding_arbitration')) {
      warnings.push('⚠️ Disputes must go through arbitration');
    }
    if (analysis.allRiskFlags?.includes('restocking_fee')) {
      warnings.push('⚠️ Returns may incur a restocking fee');
    }

    res.json({
      service_agent: 'policycheck',
      version: '1.0.0',
      assessment: {
        risk_level: analysis.overallRiskScore,
        buyer_protection_score: analysis.buyerProtectionScore,
        recommendation: analysis.recommendation,
        should_warn_user: shouldWarn
      },
      summary: analysis.allKeyPoints?.slice(0, 3).join(' ') || 'Policy analysis unavailable.',
      details: analysis,
      display: {
        title: 'Seller Policy Assessment',
        body: generateAgentSummary(analysis),
        warnings
      }
    });
  } catch (error) {
    console.error('ACP policy check error:', error);
    res.status(500).json({
      service_agent: 'policycheck',
      error: 'policy_check_failed',
      message: error.message
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'internal_error',
    message: 'An unexpected error occurred'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`PolicyCheck Service Agent API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
