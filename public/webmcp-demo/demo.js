// @ts-check
/// <reference types="webmcp-types" />

// === Architecture note ===
// In production, tools come from TWO separate sources:
//   1. SELLER TOOLS (browse_products, add_to_cart, checkout): registered by the seller's page.
//   2. POLICY TOOL (check_seller_policy): injected by the user's PolicyCheck Chrome extension.
//
// The seller has NO control over check_seller_policy. PolicyCheck fetches the
// seller's published terms from its own servers and returns signed facts the
// agent can verify. The tool never accepts policy text from the caller, so a
// seller page cannot hand it doctored text to sign.
//
// This demo co-locates all four tools in one page for simplicity.
//
// One source of truth: the handler functions below are what the registered
// WebMCP tools execute AND what the scripted walkthrough calls.

const POLICYCHECK = 'https://policycheck.tools';
// VoltGear is fictional, so voltgear-demo.shop is display text only. Its Terms of
// Sale are hosted as a real page that PolicyCheck fetches from its own servers.
const SELLER_DISPLAY = 'voltgear-demo.shop';
const SELLER_URL = `https://${SELLER_DISPLAY}`;
const DEMO_TERMS_URL = 'https://policycheck.tools/webmcp-demo/voltgear-terms.html';

/**
 * Demo-only resolution, done by the policy tool itself and never by the seller.
 * The fictional store address, or the address of this demo page, maps to the
 * hosted VoltGear terms page. Every other address passes through untouched.
 * @param {URL} target
 * @returns {URL | null} The terms page, or null when the address is not the demo's.
 */
function resolveDemoSeller(target) {
  const host = target.hostname.toLowerCase().replace(/^www\./, '');
  const demoHost = host === 'policycheck.tools' || target.origin === location.origin;
  const demoPage = demoHost && /^\/webmcp-demo(\/|\/index\.html)?$/.test(target.pathname);
  return host === SELLER_DISPLAY || demoPage ? new URL(DEMO_TERMS_URL) : null;
}
const CATEGORIES = /** @type {const} */ (['audio', 'peripherals', 'displays']);

/** @typedef {typeof CATEGORIES[number]} Category */
/** @typedef {{ name: string, price: number, stock: number, category: Category }} Product */
/** @typedef {{ productId: string, name: string, price: number, quantity: number }} CartLine */
/**
 * Failures are resolved, not thrown: a rejection from a registered tool reaches
 * the agent as a generic UnknownError and the message is lost.
 * @typedef {{ error: string, code: string, retryable: boolean }} ToolError
 */

/** @type {Record<string, Product>} */
const PRODUCTS = {
  'WH-1000': { name: 'Wireless Headphones Pro', price: 249, stock: 12, category: 'audio' },
  'KB-500':  { name: 'Mechanical Keyboard RGB', price: 179, stock: 8,  category: 'peripherals' },
  'MS-300':  { name: 'Ergonomic Mouse',         price: 89,  stock: 23, category: 'peripherals' },
  'MN-27':   { name: '4K UltraWide Monitor',    price: 599, stock: 3,  category: 'displays' },
};

/** @type {CartLine[]} */
const cart = [];

/**
 * @param {string} error
 * @param {string} code
 * @param {boolean} retryable
 * @returns {ToolError}
 */
function toolError(error, code, retryable) {
  return { error, code, retryable };
}

/**
 * @param {unknown} v
 * @returns {v is ToolError}
 */
function isToolError(v) {
  return typeof v === 'object' && v !== null && typeof (/** @type {{ error?: unknown }} */ (v)).error === 'string';
}

const cartTotal = () => cart.reduce((s, i) => s + i.price * i.quantity, 0);

// === Tool handlers ===

/** @param {{ category?: string }} input */
function browseProducts({ category }) {
  if (category !== undefined && !CATEGORIES.some(c => c === category)) {
    return toolError(
      `No category "${category}". Use one of: ${CATEGORIES.join(', ')}, or omit the filter to list every product.`,
      'UNKNOWN_CATEGORY', false);
  }
  const products = Object.entries(PRODUCTS)
    .filter(([, p]) => !category || p.category === category)
    .map(([id, p]) => ({ id, ...p }));
  return { products, total_count: products.length };
}

/** @param {{ productId: string, quantity?: number }} input */
function addToCart({ productId, quantity = 1 }) {
  const p = PRODUCTS[productId];
  if (!p) {
    return toolError(`No product with ID "${productId}". Call browse_products to get valid product IDs.`, 'PRODUCT_NOT_FOUND', false);
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return toolError('Quantity must be a whole number of 1 or more. Ask the user how many they want.', 'INVALID_QUANTITY', false);
  }
  if (quantity > p.stock) {
    return toolError(`Only ${p.stock} of ${p.name} in stock. Ask the user whether to add ${p.stock} or fewer.`, 'INSUFFICIENT_STOCK', false);
  }
  cart.push({ productId, name: p.name, price: p.price, quantity });
  return { added: p.name, quantity, cartTotal: cartTotal(), itemsInCart: cart.length };
}

/** @param {{ paymentMethod: string, shippingSpeed?: string }} input */
function checkout({ paymentMethod, shippingSpeed = 'standard' }) {
  if (cart.length === 0) {
    return toolError('The cart is empty. Call add_to_cart before checkout.', 'CART_EMPTY', false);
  }
  if (!paymentMethod) {
    return toolError('No payment method given. Ask the user how they want to pay.', 'PAYMENT_METHOD_REQUIRED', false);
  }
  const subtotal = cartTotal();
  const express  = shippingSpeed === 'express';
  const shipping = express ? 15 : (subtotal >= 100 ? 0 : 9.99);
  const order = {
    status: 'order_confirmed',
    orderId: 'VG-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
    items: cart.length, subtotal, shipping, grandTotal: subtotal + shipping,
    paymentMethod, shippingSpeed: express ? 'express' : 'standard',
    estimatedDelivery: express ? '2-3 business days' : '7-14 business days',
  };
  cart.length = 0;
  return order;
}

/**
 * Asks PolicyCheck for the seller's published terms. PolicyCheck fetches them
 * itself. This handler has no sample or fallback data: it returns the live
 * response or a structured error.
 * @param {{ seller_url: string }} input
 * @param {AbortSignal} [signal]
 */
async function checkSellerPolicy({ seller_url }, signal) {
  if (typeof seller_url !== 'string' || !seller_url) {
    return toolError("A seller web address is required. Pass the address of the seller's store or of one of its policy pages.", 'SELLER_URL_REQUIRED', false);
  }
  let target;
  try { target = new URL(seller_url); } catch (_) {
    return toolError(`"${seller_url}" is not a full web address. Pass one starting with https://.`, 'INVALID_SELLER_URL', false);
  }
  const demoTerms = resolveDemoSeller(target);
  if (demoTerms) {
    target = demoTerms;
    addLog('sys', 'Demo: voltgear-demo.shop is served from policycheck.tools/webmcp-demo/');
  }
  // PolicyCheck does the fetching either way. A store homepage asks it to look
  // for the seller's policy pages; a deeper address asks it to read that page.
  const body = target.pathname === '/' ? { seller_url: target.href } : { url: target.href };
  const unconfirmed = "Tell the user this seller's terms are unconfirmed and ask whether to continue.";
  let r;
  try {
    r = await fetch(`${POLICYCHECK}/api/v1/signed-assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err; // cancelled by the agent: nothing to report
    return toolError(`PolicyCheck could not be reached. Retry once. If it fails again: ${unconfirmed}`, 'SERVICE_UNREACHABLE', true);
  }
  if (r.status === 400) {
    return toolError(`PolicyCheck could not use the address "${seller_url}". Pass the seller's public store address. If that is the address: ${unconfirmed}`, 'INVALID_SELLER_URL', false);
  }
  if (!r.ok) {
    return toolError(`PolicyCheck could not fetch or read this seller's published terms (status ${r.status}). ${unconfirmed}`, 'TERMS_UNAVAILABLE', true);
  }
  // TODO(prompt-2): the full response is well over the 1,500 character output
  // budget. Return the compact format here once Prompt 2 ships it.
  return await r.json();
}

// === Tool definitions (registered only when the browser exposes WebMCP) ===

/** @type {WebMCP.ModelContext | undefined} */
const mc = document.modelContext
  ?? /** @type {{ modelContext?: WebMCP.ModelContext }} */ (/** @type {unknown} */ (navigator)).modelContext;

const registration = new AbortController();
window.addEventListener('pagehide', () => registration.abort());

/** @param {WebMCP.ModelContext} ctx */
async function registerTools(ctx) {
  const options = { signal: registration.signal };

  // ── Seller tools ──────────────────────────────────────────────────────────
  await ctx.registerTool({
    name: 'browse_products',
    description: 'Lists VoltGear Electronics products with their IDs, prices and stock. Use when the user wants to see what is for sale or needs a product ID before adding to the cart.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: CATEGORIES, description: 'Optional product category filter. Omit to list every product.' },
      },
    },
    annotations: { readOnlyHint: true },
    execute: (input) => browseProducts(input),
  }, options);

  // Routine mutation: no annotations.
  await ctx.registerTool({
    name: 'add_to_cart',
    description: 'Adds a product to the shopping cart. Use when the user has chosen a product to buy. Product IDs come from browse_products.',
    inputSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ID exactly as returned by browse_products, for example WH-1000.' },
        quantity:  { type: 'integer', minimum: 1, description: 'Number of units to add. Defaults to 1.' },
      },
      required: ['productId'],
    },
    execute: (input) => addToCart(input),
  }, options);

  await ctx.registerTool({
    name: 'checkout',
    description: 'Places the order and charges the chosen payment method for everything in the cart. Use once the user has confirmed they want to buy. The order is final.',
    inputSchema: {
      type: 'object',
      properties: {
        paymentMethod: { type: 'string', enum: ['card', 'paypal'], description: 'How the user wants to pay.' },
        shippingSpeed: { type: 'string', enum: ['standard', 'express'], description: 'Delivery speed. Standard takes 7 to 14 business days. Express takes 2 to 3 and costs $15. Defaults to standard.' },
      },
      required: ['paymentMethod'],
    },
    annotations: { consequentialHint: true },
    execute: (input) => checkout(input),
  }, options);

  // ── User-installed policy tool (PolicyCheck extension in production) ───────
  // untrustedContentHint: results contain text extracted from third-party seller sites.
  await ctx.registerTool({
    name: 'check_seller_policy',
    description: "Get a seller's published return, refund, shipping, warranty and dispute terms as verifiable facts. Call before checkout on any seller not yet checked this session. Standard boilerplate clauses are labelled so they can be ignored.",
    inputSchema: {
      type: 'object',
      properties: {
        seller_url: { type: 'string', description: "Web address of the seller's store, or of one policy page to read exactly that page." },
      },
      required: ['seller_url'],
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: (input, { signal }) => checkSellerPolicy(input, signal),
  }, options);
}

// === UI ===

/** @param {string} id */
function el(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

const TOOL_META = [
  { name: 'browse_products',     desc: 'Browse product catalog',                     type: 's', icon: '📦' },
  { name: 'add_to_cart',         desc: 'Add items to cart',                          type: 's', icon: '🛒' },
  { name: 'checkout',            desc: 'Complete purchase (asks permission)',        type: 's', icon: '💳' },
  { name: 'check_seller_policy', desc: 'Signed seller policy facts (user extension)', type: 'p', icon: '🛡️' },
];

function renderTools() {
  const seller = TOOL_META.filter(t => t.type === 's');
  const trust  = TOOL_META.filter(t => t.type === 'p');
  el('tools-ui').innerHTML =
    seller.map(t => `
      <div class="tc" id="tc-${t.name}">
        <div class="tc-icon s">${t.icon}</div>
        <div><div class="tc-name">${t.name}</div><div class="tc-desc">${t.desc}</div></div>
        <span class="tc-tag st">SELLER</span>
      </div>`).join('') +
    '<div class="tool-origin-divider">User-installed tools (PolicyCheck Extension)</div>' +
    trust.map(t => `
      <div class="tc hl" id="tc-${t.name}">
        <div class="tc-icon p">${t.icon}</div>
        <div>
          <div class="tc-name">${t.name}</div>
          <div class="tc-desc">${t.desc}</div>
          <div style="font-size:9px;color:var(--accent);margin-top:2px;font-family:var(--mono);">Independent of seller · policycheck.tools</div>
        </div>
        <span class="tc-tag tt">USER TOOL</span>
      </div>`).join('');
}

/** @param {unknown} s */
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** @type {Record<string, string>} */
const LOG_COLORS = { call: 'var(--blue)', result: 'var(--green)', pc: 'var(--accent)', verify: 'var(--green)', warn: 'var(--orange)', sys: 'var(--faint)', think: 'var(--text)' };
/** @type {Record<string, string>} */
const LOG_ICONS = { call: '→', result: '←', pc: '🛡️', verify: '✓', warn: '⚠️', sys: '·', think: '🤖' };

/**
 * @param {string} type
 * @param {string} action
 * @param {unknown} [detail] Strings are shown as is, anything else as JSON.
 */
function addLog(type, action, detail) {
  const log = el('log');
  const t = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const text = detail === undefined ? '' : (typeof detail === 'string' ? detail : JSON.stringify(detail));
  const detCls = type === 'pc' ? 'pc' : type === 'verify' ? 'ok' : '';
  const d = document.createElement('div');
  d.className = 'le';
  d.innerHTML = `<div class="le-time">${t}</div><div class="le-act" style="color:${LOG_COLORS[type] || 'var(--text)'}">${LOG_ICONS[type] || '·'} ${esc(action)}</div>${text ? `<div class="le-det ${detCls}">${esc(text)}</div>` : ''}`;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
}

// === Sample data for the scripted walkthrough ONLY ===
// Unsigned and labelled as such in the log. No registered tool returns this:
// the only caller is runWalkthrough().
function makeSampleAssessment() {
  return {
    version: '2.0',
    provider: 'policycheck.tools',
    assessment_id: 'sample-unsigned',
    timestamp: new Date().toISOString(),
    expires_at: null,
    seller: { domain: SELLER_DISPLAY, url: null },
    flags: ['restocking_fee', 'return_window', 'binding_arbitration', 'liability_cap'],
    clauses_summary: { returns: 2, legal: 2 },
    policies: {
      returns: {
        summary: '14-day return window for unopened items only. 20% restocking fee. Opened electronics non-refundable.',
        facts: { window_days: 14, return_shipping: 'customer_pays', restocking_fee: true, refund_method: 'original_payment' },
      },
      shipping: {
        summary: 'Free shipping on orders over $100. Standard delivery 7 to 14 business days.',
        facts: { free_threshold_usd: 100, estimated_days_min: 7, estimated_days_max: 14, tracking_provided: true },
      },
      legal: {
        summary: 'Binding arbitration for all disputes. Liability capped at purchase price.',
        facts: { arbitration: true, class_action_waiver: true, jurisdiction: 'Wilmington, DE' },
      },
    },
    clauses: [
      { id: 'restocking_fee',      category: 'returns', description: '20% restocking fee applies to all returns',                     found_in: 'terms_of_sale', is_standard_boilerplate: false },
      { id: 'return_window',       category: 'returns', description: '14-day return window, unopened items only',                     found_in: 'terms_of_sale', is_standard_boilerplate: false },
      { id: 'binding_arbitration', category: 'legal',   description: 'All disputes subject to binding arbitration in Wilmington, DE', found_in: 'terms_of_sale', is_standard_boilerplate: true  },
      { id: 'liability_cap',       category: 'legal',   description: 'Total liability shall not exceed the purchase price',           found_in: 'terms_of_sale', is_standard_boilerplate: true  },
    ],
    summary: 'Returns: 14 days, unopened items only, 20% restocking fee. Disputes: binding arbitration in Wilmington, DE. Liability capped at the purchase price.',
    analysis_status: 'complete',
    confidence: 'high',
  };
}

const yesNo = (/** @type {unknown} */ v) => (v ? 'yes' : 'no');
const has = (/** @type {unknown} */ v) => v !== null && v !== undefined;

/**
 * True when an assessment carries at least one clause or one non-null fact.
 * A signed result can be empty (for example status no_content).
 * @param {any} sa
 */
function hasPolicyFacts(sa) {
  if (Array.isArray(sa?.clauses) && sa.clauses.length > 0) return true;
  return Object.values(sa?.policies || {}).some(
    (/** @type {any} */ cat) => Object.values(cat?.facts || {}).some(has));
}

/**
 * Formats an assessment for the log as plain facts.
 * @param {any} sa
 * @param {string | null} signature
 */
function formatAssessment(sa, signature) {
  /** @type {any[]} */
  const clauses = sa.clauses || [];
  const boilerplate = clauses.filter(c => c.is_standard_boilerplate);
  const other       = clauses.filter(c => !c.is_standard_boilerplate);
  const p = sa.policies || {};
  let out = '';

  out += `status: ${String(sa.analysis_status).toUpperCase()}  confidence: ${String(sa.confidence).toUpperCase()}\n`;
  out += `assessment_id: ${sa.assessment_id}\n`;
  out += `expires_at:    ${sa.expires_at ?? 'n/a'}\n\n`;

  if (p.returns?.facts) {
    const f = p.returns.facts;
    out += 'RETURNS:\n';
    if (has(f.window_days))    out += `  window:          ${f.window_days} days\n`;
    if (f.return_shipping)     out += `  return shipping: ${f.return_shipping}\n`;
    if (has(f.restocking_fee)) out += `  restocking fee:  ${yesNo(f.restocking_fee)}${has(f.restocking_fee_percent) ? ` (${f.restocking_fee_percent}%)` : ''}\n`;
    if (f.refund_method)       out += `  refund method:   ${f.refund_method}\n`;
    out += '\n';
  }
  if (p.shipping?.facts) {
    const f = p.shipping.facts;
    out += 'SHIPPING:\n';
    if (has(f.free_threshold_usd)) out += `  free over:       $${f.free_threshold_usd}\n`;
    if (has(f.estimated_days_min)) out += `  delivery:        ${f.estimated_days_min} to ${f.estimated_days_max} days\n`;
    out += '\n';
  }
  if (p.legal?.facts) {
    const f = p.legal.facts;
    out += 'LEGAL:\n';
    if (has(f.arbitration))         out += `  arbitration:     ${yesNo(f.arbitration)}\n`;
    if (has(f.class_action_waiver)) out += `  class action waiver: ${yesNo(f.class_action_waiver)}\n`;
    if (f.jurisdiction)             out += `  jurisdiction:    ${f.jurisdiction}\n`;
    out += '\n';
  }

  if (other.length > 0) {
    out += `CLAUSES (${other.length}):\n`;
    other.forEach(c => { out += `  [${c.category}] ${c.id}: ${c.description}\n`; });
    out += '\n';
  }
  if (boilerplate.length > 0) {
    out += `STANDARD BOILERPLATE (${boilerplate.length}):\n`;
    boilerplate.forEach(c => { out += `  [${c.category}] ${c.id}\n`; });
    out += '\n';
  }

  if (sa.summary) out += `SUMMARY: ${sa.summary}\n\n`;
  if (Array.isArray(sa.limitations) && sa.limitations.length > 0) {
    out += 'LIMITATIONS:\n';
    sa.limitations.forEach((/** @type {unknown} */ x) => { out += `  ${x}\n`; });
    out += '\n';
  }
  out += `signature: ${signature ? signature.slice(0, 24) + '…' : 'NONE (sample data, unsigned)'}`;
  return out;
}

// === Scripted walkthrough ===
// A fixed script, with no model involved. It calls the same handler functions
// the registered tools execute.

const RUN_LABEL = '▶ Run scripted walkthrough';

async function runWalkthrough() {
  const btn = /** @type {HTMLButtonElement} */ (el('run'));
  btn.disabled = true; btn.textContent = '⏳ Running…';
  el('log').innerHTML = '';
  cart.length = 0;
  const tcEl = document.getElementById('tc-check_seller_policy');
  try {
    await walkthroughSteps(tcEl);
  } catch (err) {
    addLog('warn', 'Walkthrough stopped', err instanceof Error ? err.message : String(err));
  } finally {
    tcEl?.classList.remove('active');
    btn.disabled = false;
    btn.textContent = RUN_LABEL;
  }
}

/** @param {HTMLElement | null} tcEl */
async function walkthroughSteps(tcEl) {
  const wait = (/** @type {number} */ ms) => new Promise(r => setTimeout(r, ms));

  // 1. Discover tools
  addLog('sys', 'Scripted walkthrough', 'A fixed script, not a live agent. It calls the same handler functions the registered tools use.');
  await wait(700);
  if (mc && typeof mc.getTools === 'function') {
    const tools = await mc.getTools();
    addLog('result', `Discovered ${tools.length} registered tools`, tools.map(t => t.name).join(', '));
  } else {
    addLog('sys', 'WebMCP not available in this browser', 'No tools are registered. The walkthrough calls the handler functions directly.');
  }
  await wait(500);

  // 2. Browse products
  addLog('think', 'Agent: "User wants headphones. Listing audio products."');
  await wait(400);
  addLog('call', 'browse_products({ category: "audio" })');
  await wait(350);
  addLog('result', 'browse_products →', browseProducts({ category: 'audio' }));
  await wait(500);

  // 3. Add to cart
  addLog('think', 'Agent: "Wireless Headphones Pro, $249. Adding to cart."');
  await wait(400);
  addLog('call', 'add_to_cart({ productId: "WH-1000", quantity: 1 })');
  await wait(350);
  addLog('result', 'add_to_cart →', addToCart({ productId: 'WH-1000', quantity: 1 }));
  await wait(700);

  // 4. Seller policy facts
  tcEl?.classList.add('active');
  addLog('think', 'Agent: "Before checkout, getting VoltGear\'s published terms from my user-installed PolicyCheck tool. The seller does not control what it returns."');
  await wait(600);
  addLog('call', `check_seller_policy({ seller_url: "${SELLER_URL}" })`);
  await wait(400);

  /** @type {any} */
  let result;
  try {
    result = await checkSellerPolicy({ seller_url: SELLER_URL }, AbortSignal.timeout(20000));
  } catch (_) {
    result = toolError('PolicyCheck did not answer within 20 seconds.', 'TIMEOUT', true);
  }

  const live = !isToolError(result) && result && result.signed_assessment;
  /** @type {any} */
  let sa;
  if (live) {
    sa = result.signed_assessment;
    addLog('pc', hasPolicyFacts(sa) ? 'check_seller_policy → signed facts' : 'check_seller_policy → signed result, no policy facts', formatAssessment(sa, result.signature));
  } else {
    addLog('warn', 'check_seller_policy → error (this is what the agent receives)',
      isToolError(result) ? result : toolError('Unexpected response from PolicyCheck.', 'BAD_RESPONSE', false));
    await wait(600);
    addLog('sys', 'No live result', 'PolicyCheck returned an error, so the walkthrough continues with sample data to show the shape of a result.');
    await wait(600);
    sa = makeSampleAssessment();
    addLog('pc', 'SAMPLE DATA, UNSIGNED', formatAssessment(sa, null));
  }
  await wait(900);

  // 5. Verify signature (live results only)
  if (live) {
    addLog('think', 'Agent: "The result is signed. Checking the signature before using it."');
    await wait(500);
    addLog('call', `fetch("${POLICYCHECK}/api/v1/verify", { signed_assessment, signature })`);
    await wait(400);
    /** @type {any} */
    let vd = null;
    try {
      const vr = await fetch(`${POLICYCHECK}/api/v1/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signed_assessment: sa, signature: result.signature }),
        signal: AbortSignal.timeout(20000),
      });
      vd = await vr.json();
    } catch (_) { /* reported below */ }

    if (vd && vd.valid === true) {
      addLog('verify', 'Signature VALID', `assessment_id: ${vd.assessment_id}\nverified_at:   ${vd.verified_at}\nexpires_at:    ${vd.expires_at}`);
    } else {
      addLog('warn', vd ? 'Signature INVALID' : 'Signature NOT VERIFIED (verify service unreachable)',
        vd ? `reason: ${vd.reason || 'none given'}` : 'No answer from policycheck.tools/api/v1/verify');
      await wait(400);
      addLog('sys', 'Walkthrough stopped before checkout', 'A result that fails signature verification is discarded.');
      return;
    }
  } else {
    addLog('sys', 'Verify skipped', 'Sample data is unsigned, so there is no signature to check.');
  }
  await wait(700);

  // 6. What the agent carries forward: facts, or the plain statement that there are none
  const gotFacts = hasPolicyFacts(sa);
  if (gotFacts) {
    /** @type {any[]} */
    const clauses = sa.clauses || [];
    const boilerplateIds = clauses.filter(c => c.is_standard_boilerplate).map(c => c.id);
    const otherIds       = clauses.filter(c => !c.is_standard_boilerplate).map(c => c.id);
    const rf = sa.policies?.returns?.facts || {};
    const facts =
      (has(rf.window_days) ? `Return window: ${rf.window_days} days. ` : '') +
      (has(rf.restocking_fee) ? `Restocking fee: ${yesNo(rf.restocking_fee)}. ` : '') +
      `Clauses: [${otherIds.join(', ') || 'none'}]. ` +
      `Labelled standard boilerplate: [${boilerplateIds.join(', ') || 'none'}].`;
    addLog('think', `Agent: "${live ? '' : '(Sample data.) '}${facts} Showing these facts to the user with the checkout confirmation."`);
  } else {
    addLog('think', `Agent: "No policy facts could be retrieved for this seller (status: ${String(sa.analysis_status).toUpperCase()}). Telling the user the seller's terms are unconfirmed before checkout."`);
  }
  await wait(700);

  // 7. Checkout
  addLog('sys', 'checkout is marked consequential', 'A real agent asks the user for permission at this point. The scripted walkthrough continues without asking.');
  await wait(500);
  addLog('call', 'checkout({ paymentMethod: "card", shippingSpeed: "standard" })');
  await wait(350);
  addLog('result', 'checkout →', checkout({ paymentMethod: 'card', shippingSpeed: 'standard' }));
  await wait(400);

  addLog('sys', 'Walkthrough complete',
    !live
      ? 'This run used SAMPLE DATA, UNSIGNED for the seller policy step. With a real seller the agent receives signed facts and verifies the signature before purchase.'
      : gotFacts
        ? 'The agent fetched signed seller policy facts, verified the signature, and showed the facts to the user before purchase.'
        : 'PolicyCheck returned a signed result with no policy facts. The agent verified the signature and told the user the seller\'s terms were unconfirmed before purchase.');
}

// === Boot ===

async function init() {
  renderTools();
  el('run').addEventListener('click', runWalkthrough);
  const status = el('wm-status');

  if (!mc) {
    el('warn').style.display = 'flex';
    status.textContent = 'NO WEBMCP';
    status.className = 'tag';
    return;
  }

  try {
    await registerTools(mc);
    const count = typeof mc.getTools === 'function' ? (await mc.getTools()).length : TOOL_META.length;
    status.textContent = 'WEBMCP ACTIVE';
    status.className = 'tag on';
    el('t-count').textContent = `${count} TOOLS`;
    addLog('sys', 'WebMCP initialized', `${count} tools registered`);
  } catch (err) {
    status.textContent = 'WEBMCP ERROR';
    status.className = 'tag';
    addLog('warn', 'Tool registration failed', err instanceof Error ? err.message : String(err));
  }
}

init();
