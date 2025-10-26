// @ts-check
import crypto from "crypto";

/**
 * Verify Shopify App Proxy signature
 * https://shopify.dev/docs/apps/build/online-store/app-proxies#verify-proxy-requests
 *
 * @param {object} query - The query parameters from the request
 * @param {string} secret - The Shopify app client secret
 * @returns {boolean} - True if the signature is valid
 */
export function verifyProxySignature(query, secret) {
  const { signature, ...params } = query;

  if (!signature) {
    return false;
  }

  // Sort parameters alphabetically and create query string
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("");

  // Calculate HMAC-SHA256 signature
  const hash = crypto
    .createHmac("sha256", secret)
    .update(sortedParams)
    .digest("hex");

  return hash === signature;
}
