// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";
import AppWebhookHandlers from "./app-webhooks.js";
import { autoScanPolicies } from "./app-webhooks.js";
import { getSettings, saveSettings, getSummaries, hasSummaries, saveSummary, getSummary } from "./db.js";
import { verifyProxySignature } from "./verify-proxy.js";
import { parseTerms, generateSummary } from "./parse-terms.js";

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// Trust Railway's proxy for proper HTTPS/OAuth handling
app.set('trust proxy', 1);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Health check endpoint for Railway
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  async (req, res, next) => {
    // Auto-scan policies after successful OAuth
    const session = res.locals.shopify.session;
    if (session && session.shop) {
      // Run auto-scan in background (don't wait)
      autoScanPolicies(session.shop).catch(err => {
        console.error(`[OAuth Callback] Auto-scan failed for ${session.shop}:`, err);
      });
    }
    next();
  },
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({
    webhookHandlers: {
      ...PrivacyWebhookHandlers,
      ...AppWebhookHandlers
    }
  })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

// App Proxy route for storefront widget configuration (authenticated via signature)
app.get("/apps/legaleasy/config", async (req, res) => {
  // Set CORS headers for App Proxy requests from Shopify storefronts
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const shop = req.query.shop;

  if (!shop) {
    return res.status(400).json({ error: "Shop parameter required" });
  }

  // Verify the App Proxy signature
  const clientSecret = process.env.SHOPIFY_API_SECRET;
  if (!verifyProxySignature(req.query, clientSecret)) {
    console.warn(`Invalid signature for shop: ${shop}`);
    return res.status(401).json({ error: "Invalid signature" });
  }

  try {
    // Fetch merchant config from database
    const settings = await getSettings(shop);

    const config = {
      enabled: settings.enabled,
      brandColor: settings.brand_color,
      brandIcon: settings.brand_icon,
      vercelApiUrl: settings.vercel_api_url || "https://policycheck.tools"
    };

    console.log(`Config request for shop: ${shop}`);
    res.json(config);
  } catch (error) {
    console.error("Error fetching config:", error);
    res.status(500).json({ error: "Failed to fetch configuration" });
  }
});

// App Proxy route for checking if summaries exist (for checkout detection)
app.get("/apps/legaleasy/summaries/status", async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const shop = req.query.shop;

  if (!shop) {
    return res.status(400).json({ error: "Shop parameter required" });
  }

  // Verify the App Proxy signature
  const clientSecret = process.env.SHOPIFY_API_SECRET;
  if (!verifyProxySignature(req.query, clientSecret)) {
    console.warn(`Invalid signature for shop: ${shop}`);
    return res.status(401).json({ error: "Invalid signature" });
  }

  try {
    const has = await hasSummaries(shop);
    const summaries = has ? await getSummaries(shop) : [];

    res.json({
      hasSummaries: has,
      availableTypes: summaries.map(s => s.policy_type)
    });
  } catch (error) {
    console.error("Error checking summaries:", error);
    res.status(500).json({ error: "Failed to check summaries" });
  }
});

// App Proxy route for fetching summaries (for checkout display)
app.get("/apps/legaleasy/summaries", async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const shop = req.query.shop;

  if (!shop) {
    return res.status(400).json({ error: "Shop parameter required" });
  }

  // Verify the App Proxy signature
  const clientSecret = process.env.SHOPIFY_API_SECRET;
  if (!verifyProxySignature(req.query, clientSecret)) {
    console.warn(`Invalid signature for shop: ${shop}`);
    return res.status(401).json({ error: "Invalid signature" });
  }

  try {
    const summaries = await getSummaries(shop);
    res.json({ summaries });
  } catch (error) {
    console.error("Error fetching summaries:", error);
    res.status(500).json({ error: "Failed to fetch summaries" });
  }
});

app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());

// Simple ping endpoint for session token validation
app.get("/api/ping", async (_req, res) => {
  console.log("Ping request received with session token");
  res.status(200).json({ success: true, message: "Authenticated" });
});

// Get merchant settings
app.get("/api/settings", async (_req, res) => {
  try {
    const session = res.locals.shopify.session;
    const settings = await getSettings(session.shop);
    res.status(200).json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// Save merchant settings
app.post("/api/settings", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const { enabled, brandColor, brandIcon, vercelApiUrl } = req.body;

    const settings = await saveSettings(session.shop, {
      enabled: enabled !== undefined ? enabled : true,
      brand_color: brandColor || "#00B3A6",
      brand_icon: brandIcon || "◆",
      vercel_api_url: vercelApiUrl || null,
    });

    res.status(200).json(settings);
  } catch (error) {
    console.error("Error saving settings:", error);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// Get all summaries for the merchant
app.get("/api/summaries", async (_req, res) => {
  try {
    const session = res.locals.shopify.session;
    const summaries = await getSummaries(session.shop);
    res.status(200).json({ summaries });
  } catch (error) {
    console.error("Error fetching summaries:", error);
    res.status(500).json({ error: "Failed to fetch summaries" });
  }
});

// Scan all policies at once
app.post("/api/scan-all-policies", async (req, res) => {
  try {
    const session = res.locals.shopify.session;

    // Fetch all policies from Shopify Admin API
    const client = new shopify.api.clients.Rest({ session });
    const policies = await client.get({ path: 'policies' });

    const policyMap = {
      'terms_and_conditions': policies.body.policies.find(p => p.handle === 'terms-of-service'),
      'privacy_policy': policies.body.policies.find(p => p.handle === 'privacy-policy'),
      'refund_policy': policies.body.policies.find(p => p.handle === 'refund-policy'),
    };

    const results = [];
    const errors = [];

    // Scan each policy
    for (const [policyType, policy] of Object.entries(policyMap)) {
      if (policy && policy.body) {
        try {
          const parsed = parseTerms(policy.body);
          const summaryText = generateSummary(parsed);

          await saveSummary(session.shop, policyType, {
            summary_text: summaryText,
            original_url: policy.url,
            status: 'completed',
          });

          results.push({ policyType, success: true });
        } catch (error) {
          console.error(`Error scanning ${policyType}:`, error);
          errors.push({ policyType, error: error.message });

          await saveSummary(session.shop, policyType, {
            summary_text: null,
            original_url: null,
            status: 'failed',
            error_message: error.message,
          });
        }
      } else {
        // Policy doesn't exist - not an error, just skip
        results.push({ policyType, success: false, reason: 'Policy not found' });
      }
    }

    res.status(200).json({
      success: true,
      scanned: results.filter(r => r.success).length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error scanning all policies:", error);
    res.status(500).json({ error: "Failed to scan policies", details: error.message });
  }
});

// Scan a policy page and generate summary
app.post("/api/scan-policy", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const { policyType } = req.body; // 'terms_and_conditions', 'privacy_policy', 'refund_policy'

    if (!policyType) {
      return res.status(400).json({ error: "Policy type required" });
    }

    // Fetch the policy URL from Shopify Admin API
    const client = new shopify.api.clients.Rest({ session });
    const policies = await client.get({ path: 'policies' });

    const policyMap = {
      'terms_and_conditions': policies.body.policies.find(p => p.handle === 'terms-of-service'),
      'privacy_policy': policies.body.policies.find(p => p.handle === 'privacy-policy'),
      'refund_policy': policies.body.policies.find(p => p.handle === 'refund-policy'),
    };

    const policy = policyMap[policyType];

    if (!policy || !policy.body) {
      return res.status(404).json({
        error: "Policy not found",
        message: `No ${policyType.replace('_', ' ')} found in your store`
      });
    }

    // Parse the policy text
    const parsed = parseTerms(policy.body);
    const summaryText = generateSummary(parsed);

    // Store in database
    await saveSummary(session.shop, policyType, {
      summary_text: summaryText,
      original_url: policy.url,
      status: 'completed',
    });

    res.status(200).json({
      success: true,
      summary: summaryText,
      policyType,
    });
  } catch (error) {
    console.error("Error scanning policy:", error);

    // Store error in database
    const session = res.locals.shopify.session;
    const { policyType } = req.body;
    if (policyType) {
      await saveSummary(session.shop, policyType, {
        summary_text: null,
        original_url: null,
        status: 'failed',
        error_message: error.message,
      });
    }

    res.status(500).json({ error: "Failed to scan policy", details: error.message });
  }
});

app.get("/api/products/count", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  const countData = await client.request(`
    query shopifyProductCount {
      productsCount {
        count
      }
    }
  `);

  res.status(200).send({ count: countData.data.productsCount.count });
});

app.post("/api/products", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  try {
    const indexPath = join(STATIC_PATH, "index.html");
    console.log(`Attempting to read: ${indexPath}`);
    const html = readFileSync(indexPath)
      .toString()
      .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "");
    return res
      .status(200)
      .set("Content-Type", "text/html")
      .send(html);
  } catch (error) {
    console.error("Error reading index.html:", error);
    return res.status(500).send("Error loading app");
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT} (0.0.0.0)`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Static path: ${STATIC_PATH}`);
});
