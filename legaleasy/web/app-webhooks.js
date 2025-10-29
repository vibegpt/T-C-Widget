// @ts-check
import { DeliveryMethod } from "@shopify/shopify-api";
import { parseTerms, generateSummary } from "./parse-terms.js";
import { saveSummary } from "./db.js";
import shopify from "./shopify.js";

/**
 * Auto-scan all policies when the app is installed
 */
async function autoScanPolicies(shop) {
  console.log(`[Auto-scan] Starting policy scan for ${shop}`);

  try {
    // Create an offline session to make API calls
    const sessionId = shopify.api.session.getOfflineId(shop);
    const session = await shopify.config.sessionStorage.loadSession(sessionId);

    if (!session) {
      console.error(`[Auto-scan] No session found for ${shop}`);
      return;
    }

    // Fetch all policies from Shopify Admin API
    const client = new shopify.api.clients.Rest({ session });
    const policies = await client.get({ path: 'policies' });

    const policyMap = {
      'terms_and_conditions': policies.body.policies.find(p => p.handle === 'terms-of-service'),
      'privacy_policy': policies.body.policies.find(p => p.handle === 'privacy-policy'),
      'refund_policy': policies.body.policies.find(p => p.handle === 'refund-policy'),
    };

    let scannedCount = 0;

    // Scan each policy
    for (const [policyType, policy] of Object.entries(policyMap)) {
      if (policy && policy.body) {
        try {
          const parsed = parseTerms(policy.body);
          const summaryText = generateSummary(parsed);

          await saveSummary(shop, policyType, {
            summary_text: summaryText,
            original_url: policy.url,
            status: 'completed',
          });

          scannedCount++;
          console.log(`[Auto-scan] ✓ Scanned ${policyType} for ${shop}`);
        } catch (error) {
          console.error(`[Auto-scan] Error scanning ${policyType} for ${shop}:`, error);

          await saveSummary(shop, policyType, {
            summary_text: null,
            original_url: null,
            status: 'failed',
            error_message: error.message,
          });
        }
      } else {
        console.log(`[Auto-scan] Policy ${policyType} not found for ${shop} (skipping)`);
      }
    }

    console.log(`[Auto-scan] Completed for ${shop}: ${scannedCount} policies scanned`);
  } catch (error) {
    console.error(`[Auto-scan] Failed for ${shop}:`, error);
  }
}

/**
 * @type {{[key: string]: import("@shopify/shopify-api").WebhookHandler}}
 */
export default {
  /**
   * App installed webhook - Auto-scan policies
   */
  APP_UNINSTALLED: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      console.log(`[Webhook] APP_UNINSTALLED received for ${shop}`);
      // Clean up will be handled by SHOP_REDACT webhook
    },
  },
};

// Export the auto-scan function for manual triggering
export { autoScanPolicies };
