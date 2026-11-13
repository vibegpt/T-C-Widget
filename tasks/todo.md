# WebMCP demo: fix 10 audit issues (Prompt 1)

Status: **implemented and verified locally on 13 Nov 2026. Not committed, not pushed, not deployed.**

## Step 0 findings

- Demo source: `public/webmcp-demo/index.html` (601 lines, one inline `<script>`). Only hit for `check_seller_policy` in the repo. No rewrite in `next.config.ts`, no `vercel.json`.
- `tasks/lessons.md` and `CLAUDE.md` don't exist in the repo. Nothing stale to flag. `tasks/` is created by this file.
- Rules source: `GoogleChromeLabs/webmcp-tools` at `a9d4cf1` (12 Nov 2026), skill `build-webmcp-tools` plus references. Types: `webmcp-types` 0.1.11.
- `/api/v1/signed-assessment` re-exports `/api/check`. It accepts `seller_url`, `url` or `policy_text`. Bad input returns 400 `{ error }`, analysis failure returns 503 `{ error }`.
- `/api/v1/verify` returns `{ valid, signature_valid, fresh, reason }`.

## Conflicts between the prompt and the references (references win)

| # | Prompt said | References say | What I'll do |
|---|---|---|---|
| C1 | Failures throw `Error` | Native `registerTool` must **resolve** `{ error, code, retryable }`. A throw reaches the agent as a generic `DOMException: UnknownError` and the message is lost. Throwing is the React `useWebMCP` rule. | Resolve structured errors with the next step in the text. Only cancellation (`AbortError`) rejects. |
| C2 | Annotations are opt-in | Same, plus: never declare `: false`. Routine mutating tools omit `annotations` entirely. | `add_to_cart` has no `annotations` key. `checkout` has only `consequentialHint: true`. |
| C3 | `navigator.modelContext` fallback | Only `document.modelContext` appears in the references and types. "Deprecated in Chrome 150" isn't confirmed or denied there. | Keep the fallback as asked, with a JSDoc cast so it type-checks. |
| C4 | Uses `navigator.modelContextTesting` | Gone. Replacement is `document.modelContext.getTools()` / `executeTool(tool, argsObject, { signal })`. | Use `getTools()` for the count. The walkthrough calls handlers directly, so `executeTool` isn't needed. |
| C5 | Return type unspecified | `execute()` returns a string or a serialisable object. No MCP-style `{ content: [...] }` wrapper in the references or types. | Return plain objects. |
| C6 | Warning copy: "Chrome version and flag the references give" | Flag `chrome://flags/#enable-webmcp-testing`. Origin trial from Chrome 149. Lighthouse and DevTools tooling need Chrome 150+. | "Chrome 150 or later" plus the flag. |
| C7 | Report `webmcp-schema-validity` | That audit checks declarative `<form toolname>` markup. | Expect N/A on this imperative-only page. Will report what it actually says. |
| C8 | Budgets list | Parameter **names** are also capped at 30 chars. | All fine already (longest is `paymentMethod`, 13). |

## Decisions (answered 13 Nov 2026)

- **Demo seller:** honest error + sample. `voltgear-demo.shop` is fictional, so with `policy_text` gone the live API can't fetch it. The registered tool returns a structured error. The walkthrough then shows the sample, labelled.
- **Type-check:** move the inline script to `public/webmcp-demo/demo.js` with `// @ts-check`.
- **Verdict copy:** neutralise in the demo. Facts only.

## Plan

### A. Structure
- [x] Move the inline script to `public/webmcp-demo/demo.js` (`// @ts-check`, `/// <reference types="webmcp-types" />`, JSDoc types). Load it with `<script src="/webmcp-demo/demo.js">` (absolute path, because the page is served without a trailing slash).
- [x] One source of truth: four handler functions `browseProducts`, `addToCart`, `checkout`, `checkSellerPolicy(input, signal)`. Registered tools and the walkthrough both call these. Delete the duplicated mock branch in `runAgent()`'s `exec()`.
- [x] `npm i -D webmcp-types`. Add script `typecheck:webmcp` (tsc `--noEmit --allowJs --checkJs --strict` over `demo.js`).

### B. The 10 issues
- [x] **1. Boolean annotations.** `browse_products`: `{ readOnlyHint: true }`. `add_to_cart`: none. `checkout`: `{ consequentialHint: true }`. `check_seller_policy`: `{ readOnlyHint: true, untrustedContentHint: true }`.
- [x] **2.** `checkout` gets `consequentialHint: true`.
- [x] **3. No mock from a registered tool.** `checkSellerPolicy` returns the live response, or `{ error, code, retryable }` ("Could not fetch this seller's published terms. Tell the user the terms are unconfirmed and ask whether to continue."). `makeMockResult()` becomes `makeSampleAssessment()`, has no signature fields, and is called only from `runAgent()`.
- [x] **4. Verify step.** `valid: true` logs VALID. `valid: false` logs "Signature INVALID" with the reason in the warning style, and the walkthrough stops before checkout. Sample data logs "Verify skipped: sample data is unsigned".
- [x] **5.** `add_to_cart` unknown ID returns `{ error: 'No product with ID X. Call browse_products for valid IDs.', code: 'PRODUCT_NOT_FOUND', retryable: false }`. Also reject a non-positive quantity. `checkout` on an empty cart returns `CART_EMPTY`, and a successful checkout empties the cart.
- [x] **6. API surface.** `const mc = document.modelContext ?? navigator.modelContext`. Warning box only when both are missing. Copy: "This demo needs Chrome 150 or later with the WebMCP flag enabled." Remove every `modelContextTesting` use.
- [x] **7. Abort.** One `AbortController`; every `registerTool(tool, { signal })`; abort on `pagehide`. `execute(input, { signal })` passes `signal` to the handler and into `fetch()`.
- [x] **8.** New `check_seller_policy` description (below).
- [x] **9.** `browse_products.category`: add a `category` to each product, an `enum` (`audio`, `peripherals`, `displays`) with a description, and filter in the handler. Output gains `total_count`.
- [x] **10.** Remove `policy_text` from the tool schema, the handler and the request body. Delete the `POLICY_TEXT` constant.

### C. Walkthrough and copy
- [x] Button: "Run scripted walkthrough". Under it: "For a real agent run, use the WebMCP extension" linking https://github.com/GoogleChromeLabs/webmcp-extension. Same fonts, colours and spacing as the existing controls.
- [x] Sample assessment logged under "SAMPLE DATA, UNSIGNED".
- [x] Neutralise verdict copy: drop "hidden cost", the PayPal recommendation, "below industry average", the POSITIVES block and the warning icon on facts. Scripted agent lines state facts only.
- [x] Replace em dashes in user-facing copy (title, policy heading, log lines).
- [x] `// TODO(prompt-2)` on `checkSellerPolicy`'s return: the full response exceeds the 1,500 char output budget until the compact format ships.

### Draft tool copy and char counts

| Item | Chars | Limit |
|---|---|---|
| `browse_products` (name) | 15 | 30 |
| `add_to_cart` (name) | 11 | 30 |
| `checkout` (name) | 8 | 30 |
| `check_seller_policy` (name) | 19 | 30 |
| browse_products description | 166 | 500 |
| browse_products `category` | 61 | 150 |
| add_to_cart description | 122 | 500 |
| add_to_cart `productId` | 71 | 150 |
| add_to_cart `quantity` | 38 | 150 |
| checkout description | 152 | 500 |
| checkout `paymentMethod` | 26 | 150 |
| checkout `shippingSpeed` | 111 | 150 |
| check_seller_policy description | 229 | 500 |
| check_seller_policy `seller_url` | 90 | 150 |

- browse_products: "Lists VoltGear Electronics products with their IDs, prices and stock. Use when the user wants to see what is for sale or needs a product ID before adding to the cart."
- add_to_cart: "Adds a product to the shopping cart. Use when the user has chosen a product to buy. Product IDs come from browse_products."
- checkout: "Places the order and charges the chosen payment method for everything in the cart. Use once the user has confirmed they want to buy. The order is final."
- check_seller_policy: "Get a seller's published return, refund, shipping, warranty and dispute terms as verifiable facts. Call before checkout on any seller not yet checked this session. Standard boilerplate clauses are labelled so they can be ignored."

Counts re-measured from the shipped `demo.js`: identical to the table.

### D. Verification
- [x] `npm run typecheck:webmcp` passes.
- [x] grep for quoted `'true'` / `'false'` annotations (expect none) and for `MockSig` (expect none).
- [x] `npm run dev`, load the page in headless Chromium (no WebMCP), check console errors, run the walkthrough, paste the log.
- [x] Lighthouse `agentic-browsing` category, report `webmcp-schema-validity` and `llms-txt`.
- [x] Write the manual test steps and a review section below.

## Files

| File | Action |
|---|---|
| `public/webmcp-demo/index.html` | MODIFY: markup and copy, script tag |
| `public/webmcp-demo/demo.js` | NEW: the moved, fixed script |
| `package.json`, `package-lock.json` | MODIFY: `webmcp-types`, `typecheck:webmcp` |
| `tasks/todo.md` | MODIFY |

Not touched: `/api/v1/*`, signing, JWKS, x402, pricing, Bazaar metadata, `policycheck-mcp`.

## Known limits of my verification

- This sandbox can't reach `policycheck.tools` or Google Fonts. In the headless run I'll stub those two hosts and say exactly what was stubbed. The live signed path and the VALID branch need your manual run.
- Next may not serve `public/webmcp-demo/index.html` at `/webmcp-demo` under `next dev` (production may differ). If it 404s locally I'll test at `/webmcp-demo/index.html` and report it, without adding a rewrite.
- Any failed API call shows up in the browser console as a network error line. That's the browser logging the 4xx/5xx, separate from page script errors.

## Manual test steps

1. Use Chrome 150 or later. Open `chrome://flags/#enable-webmcp-testing`, set it to Enabled, relaunch.
2. Serve the page (`npm run dev`, then http://localhost:3000/webmcp-demo/index.html, or the deployed `/webmcp-demo`).
3. Expect: no "WebMCP Not Detected" overlay, header shows `WEBMCP ACTIVE` and `4 TOOLS`.
4. DevTools > Application > WebMCP. Expect 4 tools. Check annotations:
   - `browse_products`: read-only.
   - `add_to_cart`: none.
   - `checkout`: consequential.
   - `check_seller_policy`: read-only + untrusted content. Its only parameter is `seller_url`.
5. In that pane, run by hand:
   - `add_to_cart` with `{"productId":"NOPE"}`. Expect a completed call whose result is `{ error, code: "PRODUCT_NOT_FOUND", retryable: false }`.
   - `checkout` with `{"paymentMethod":"card"}` on an empty cart. Expect `code: "CART_EMPTY"`.
   - `check_seller_policy` with `{"seller_url":"https://voltgear-demo.shop"}`. Expect a structured error and no assessment. There must be no signature in the result.
   - `check_seller_policy` with a real store URL. Expect a real signed response. This is the path I couldn't run from the sandbox.
6. Click "Run scripted walkthrough". Expect the seller policy step to log the error, then `SAMPLE DATA, UNSIGNED`, then "Verify skipped".
7. Install the WebMCP extension (https://github.com/GoogleChromeLabs/webmcp-extension), pick the on-device model, and prompt: "Buy the Wireless Headphones Pro".
   - Expected: it calls `browse_products`, `add_to_cart`, `check_seller_policy` (gets the error for the fictional seller), and **asks permission before `checkout`**.
8. Console: no script errors. One "Failed to load resource" line per failed PolicyCheck call is the browser logging the HTTP status.

## Review

### What changed
- `public/webmcp-demo/demo.js` (new): the script, moved out of the HTML, `// @ts-check` against `webmcp-types`. Four handler functions are the single source of truth for the registered tools and the walkthrough.
- `public/webmcp-demo/index.html`: 601 lines down to 188. Script tag, warning copy, button label, extension link, two em dashes replaced. Styles untouched apart from one `.ap-note` rule.
- `package.json` / `package-lock.json`: `webmcp-types` ^0.1.11 and `npm run typecheck:webmcp`.

### Acceptance criteria
- [x] No quoted `'true'` / `'false'` annotation values. `grep -nE "['\"](true|false)['\"]" public/webmcp-demo/*` returns nothing.
- [x] `checkout` has `consequentialHint: true` (and nothing else).
- [x] No path from `execute()` to mock data. `grep -rn MockSig public/webmcp-demo/` returns nothing: the mock signature is deleted. `makeSampleAssessment()` has one caller, `walkthroughSteps()`, and returns no signature fields.
- [x] Invalid signature is logged as "Signature INVALID" with the reason, and the walkthrough stops before checkout.
- [x] Char counts within limits (table above).
- [x] Zero console errors on load without WebMCP. Walkthrough runs and is labelled SAMPLE DATA, UNSIGNED.
- [x] `npm run typecheck:webmcp` passes. Negative test: a string annotation and a wrong input field both fail it.

### How it was verified
- Headless Chromium 153, no WebMCP: load, walkthrough, log captured.
- Same browser with `--enable-features=WebMCP`: real `document.modelContext`, 4 tools registered, executed through `executeTool`. Errors come back as resolved JSON, as the references say they should.
- Lighthouse 13.6.0 `agentic-browsing`: category 0.99. `webmcp-schema-validity` pass, `llms-txt` pass, `webmcp-registered-tools` lists all 4, `webmcp-form-coverage` and `ard-schema` N/A, CLS 0.082.
- Stubbed in the sandbox (it can't reach these hosts): Google Fonts (empty CSS) and `policycheck.tools` (503 for the assessment, `valid: false` for verify, plus one fake unsigned 200 to reach the verify branch).

### Not verified, needs your manual run
- A real signed response and the "Signature VALID" branch.
- The extension's permission prompt before `checkout`. Chromium 153 doesn't echo `consequentialHint` back from `getTools()`, so I could only confirm the page declares it.
- `/webmcp-demo` without `/index.html`. `next dev` returns 404 for it; `/webmcp-demo/index.html` works. The script tag uses an absolute path so both URLs load it.

### Things I added beyond the 10 issues
- `add_to_cart` rejects a non-positive quantity and a quantity above stock.
- `checkout` returns `CART_EMPTY` on an empty cart and empties the cart after an order.
- `paymentMethod` and `shippingSpeed` are now enums.
- The walkthrough gives the PolicyCheck call 20 seconds before reporting a timeout.

### Follow-ups (not done here)
- Prompt 2: compact output for `check_seller_policy` (`TODO(prompt-2)` in `demo.js`).
- The live API response still carries `positives`, `summary` and `confidence`. The demo no longer renders `positives`, but the fields exist upstream.
- The seller policy excerpt on the page highlights three clauses in red (`.rf`). That is seller-page styling, left alone as visual design. Say if you want it neutral.
- The page title still says "Trust Verification Demo".
- Decide whether to host real demo terms so a live agent run shows signed facts.

---

# Prompt 1b: real demo terms page + honest "no facts" handling

Status: **implemented and verified locally on 13 Nov 2026. Not committed, not pushed, not deployed.**

## Why
The live API returns `analysis_status: no_content`, `confidence: none`, zero clauses for the fictional `voltgear-demo.shop`. The walkthrough then said "Showing these facts to the user" with no facts.

## Fetcher check (read `src/lib/policy-input.ts`, `policy-analysis.ts`, `deepPolicyAnalyzer.ts`)
- **No guard rejects a policycheck.tools URL.** `publicUrl()` only requires http(s) with no credentials. `readPage()` refuses private and reserved IP ranges, has no hostname denylist and no self-fetch check.
- Page must be `text/html`, under 1 MB, and yield 100+ characters of text. A static `.html` in `public/` meets all three.
- `extractPolicyText()` drops `<script>`, `<style>`, `<nav>`, `<header>` and `<footer>` blocks and decodes only 6 entities. So the terms sit in `<main>` in plain ASCII.
- **Catch: `seller_url` ignores the path.** `seller_url` means discovery: it probes fixed paths on the origin (`/terms`, `/returns`, `/privacy` ...). Sent as `seller_url`, the terms page address would make PolicyCheck read policycheck.tools' own pages. Only the `url` field fetches exactly one page.
  - Fix in the demo handler, no API change: a store homepage goes out as `seller_url`, a deeper address goes out as `url`. This mirrors `inputFromMessage()` in `policy-input.ts`.
- Path contains "terms", so the source is categorised `terms_of_service`, which is what lets arbitration and liability clauses be labelled standard boilerplate.
- The signed assessment will name `policycheck.tools` as the seller domain, because that is where the page is hosted.

## Plan
- [x] `public/webmcp-demo/voltgear-terms.html`: static, semantic, no JS. Same sentences as the excerpt panel.
- [x] Excerpt panel and terms page kept identical, with a comment in both. (Rendering one from the other needs a runtime fetch and drops the panel's highlights, so identical copies it is.)
- [x] Two wording changes applied to both so extraction can quote them exactly: "7 to 14 business days" (was an en dash range) and "$100 USD" (the extractor only records explicitly USD amounts).
- [x] `SELLER_URL` points at `https://policycheck.tools/webmcp-demo/voltgear-terms.html`. `voltgear-demo.shop` stays as display text.
- [x] Handler sends `url` for a page address, `seller_url` for a homepage. Parameter description updated, still within 150 chars.
- [x] Walkthrough: a signed result with no facts gets its own agent line ("no policy facts could be retrieved ... telling the user before checkout") and its own completion line. Limitations from the response are shown.
- [x] No sample data on that path. Sample stays only for a tool error, labelled as before. Registered tools still never return it.
- [x] Verify: type-check, text identity check, extractor run over the new page, walkthrough logs for no-content and with-facts.

## Post-deploy check (yours, after the branch is deployed)

- [ ] Open https://policycheck.tools/webmcp-demo/voltgear-terms.html. Expect HTTP 200, `text/html`, the Terms of Sale visible.
- [ ] Open the demo and click "Run scripted walkthrough".
- [ ] `check_seller_policy` logs "signed facts", status COMPLETE or PARTIAL, confidence MEDIUM.
- [ ] RETURNS shows `window: 14 days` and `restocking fee: yes (20%)`.
- [ ] Clauses include the restocking fee and the 14-day return window (expected IDs `restocking_fee` and `short_return_window`; `no_refund_opened` is likely too).
- [ ] `binding_arbitration` and `liability_cap` appear under STANDARD BOILERPLATE.
- [ ] "Signature VALID".
- [ ] Agent line starts "Return window: 14 days. Restocking fee: yes." and the last line says the facts were shown to the user.
- [ ] If it still says NO_CONTENT, read the LIMITATIONS line in the log. "The requested policy page could not be retrieved" means the page isn't reachable from the API yet.
- [ ] If SHIPPING or a clause is missing, that is extraction variance (the extractor is a language model checked against source quotes). Rerun once before treating it as a bug.

## Review

### What changed
- `public/webmcp-demo/voltgear-terms.html` (new): static Terms of Sale, no JS, `noindex`.
- `public/webmcp-demo/index.html`: excerpt panel text synced with the terms page, comment added.
- `public/webmcp-demo/demo.js`: `SELLER_URL` now the terms page, `SELLER_DISPLAY` for the label, request field mapping, `hasPolicyFacts()`, honest agent and completion lines, limitations shown in the log.

### Verified locally
- `npm run typecheck:webmcp` passes.
- Excerpt text equals the terms page paragraphs, character for character (script check).
- The repo's own `extractPolicyText()` over the new page yields 678 characters containing every sentence. First attempt leaked comment text because the comment contained angle brackets; fixed and noted in the file.
- `parsePolicyInput({ url })` gives `policy_page` mode for the terms address.
- Walkthrough with a stubbed `no_content` response: logs "signed result, no policy facts", then "No policy facts could be retrieved for this seller (status: NO_CONTENT). Telling the user the seller's terms are unconfirmed before checkout." The words "showing these facts" do not appear.
- Walkthrough with a stubbed with-facts response and with a 503: both behave as before.
- Registered tool: sends `{"url": ...}` for the terms page and `{"seller_url": ...}` for a homepage, returns the `no_content` result untouched, never returns sample data.
- `seller_url` parameter description: 83 chars (limit 150).

### Not verified
- The real fetch and extraction of the new page. It 404s on production until deployed. The sandbox also can't reach policycheck.tools, so the `no_content` response here was a stub shaped from `deepPolicyAnalyzer.ts`.

### Open points
- ~~A real agent won't know the terms page address.~~ Resolved in Prompt 1c below.
- A product page address passed to `check_seller_policy` is now read as a policy page. That matches the API's own rule for bare URLs, but it gives `no_facts` for a product page.
- The signed result names `policycheck.tools` as the seller domain for this demo.
- `tasks/lessons.md` candidate: "status" in the API is lowercase (`no_content`); a 200 can be signed and empty, so check for facts before describing them.

---

# Prompt 1c: demo seller resolution inside the policy tool

Status: **implemented and verified locally on 13 Nov 2026. Not committed, not pushed, not deployed.**

Decision (yours): `browse_products` does not return a terms address. The seller must not steer the policy tool.

- [x] `resolveDemoSeller()` in `demo.js`, called only from the `check_seller_policy` handler.
- [x] Resolves to the hosted terms page when the host is `voltgear-demo.shop` (with or without `www.`, any path), or the address is the demo page itself (`/webmcp-demo`, `/webmcp-demo/`, `/webmcp-demo/index.html` on policycheck.tools or on the origin serving the page).
- [x] Logs "Demo: voltgear-demo.shop is served from policycheck.tools/webmcp-demo/" when it resolves.
- [x] Every other address passes through untouched (checked: another store homepage, another store policy page, `policycheck.tools/`, the terms page itself, and a lookalike host `notvoltgear-demo.shop.evil.com`).
- [x] Walkthrough now calls the tool with `https://voltgear-demo.shop`, the address a real agent would use, so it exercises the same resolution. My earlier "Where the terms live" log line is removed; the handler's line replaces it.
- [x] `npm run typecheck:webmcp` passes. No page errors.

Note: the handler now appends one line to the activity log while keeping `readOnlyHint: true`. The references define read-only as no change to application state or the view (navigation, tab switch, modal). A log line is neither, but it is the one UI write this tool makes.

Post-deploy check addition:
- [ ] Extension run, prompt "Buy the Wireless Headphones Pro": the log shows the "Demo:" line, then signed facts, then the permission prompt before `checkout`.
