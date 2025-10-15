# LegalEasy + ChatGPT: Quick Start Guide

## ✅ What's Been Built

Your ChatGPT Agentic Commerce integration is **complete and ready to demo**! Here's what you now have:

### 1. **Plugin Configuration Files**
- ✅ `public/.well-known/ai-plugin.json` - Plugin manifest
- ✅ `public/openapi.json` - API specification for ChatGPT

### 2. **API Endpoints**
- ✅ `POST /api/chatgpt/analyze` - Analyze pasted legal text
- ✅ `POST /api/chatgpt/analyze-url` - Fetch and analyze URLs
- ✅ CORS enabled for ChatGPT access

### 3. **Features**
- ✅ Analyzes terms of service, privacy policies, refund policies
- ✅ Identifies arbitration, liability caps, class action waivers
- ✅ Plain-English summaries with risk flags
- ✅ Works with crypto/DeFi specific clauses (auto-deleveraging, L2 bridging)

---

## 🚀 Quick Demo (Record Your Video in 5 Minutes)

### Before Recording:

**Option 1: Test Locally First**
```bash
# Start your dev server
npm run dev

# In another terminal, test the integration
./test-chatgpt-integration.sh http://localhost:3000
```

**Option 2: Deploy to Production (Recommended)**
```bash
# Deploy to Vercel
vercel --prod

# Copy the production URL (e.g., https://legal-easy.vercel.app)
# Test it:
./test-chatgpt-integration.sh https://YOUR-DOMAIN.vercel.app
```

### Create Your Custom GPT:

1. Go to: https://chat.openai.com/gpts/editor
2. Click "Create"
3. In **Configure** tab:
   - **Name**: LegalEasy
   - **Description**: "Analyze legal documents in plain English"
   - **Instructions**:
     ```
     You are LegalEasy, a legal document analyzer. When users provide legal text
     or URLs, analyze them and highlight risks like arbitration clauses, liability
     caps, data sharing, and termination rights. Be friendly and accessible.
     ```
   - **Conversation starters**:
     - "Analyze https://stripe.com/legal"
     - "What are the risks in this document?"
     - "Explain these terms in plain English"

4. In **Actions** section:
   - Click "Create new action"
   - **Import from URL**: `https://YOUR-DOMAIN.vercel.app/openapi.json`
   - Click "Import"
   - **Authentication**: None
   - Click "Save"

5. **Test it**:
   ```
   Analyze this text: "We require binding arbitration. Liability capped at $100."
   ```

6. **Save** and you're ready to record!

---

## 🎬 Video Demo Script (2 minutes)

### Scene 1: The Problem (0:00-0:20)
**Screen**: Show a long, dense terms of service page

**You say**:
> "Legal documents are confusing. Shopify merchants need to understand vendor terms,
> and customers need to understand store policies. LegalEasy solves this with ChatGPT."

### Scene 2: ChatGPT Integration (0:20-0:50)
**Screen**: ChatGPT interface

**Type in ChatGPT**:
```
Analyze Stripe's terms of service for a Shopify merchant
```

**ChatGPT responds** (using your action):
- Fetches and analyzes Stripe's terms
- Highlights arbitration requirements
- Explains liability limitations
- Summarizes refund policies

**You say**:
> "LegalEasy integrates with ChatGPT's Agentic Commerce platform. Just ask ChatGPT
> to analyze any legal document, and it gives you instant, plain-English summaries."

### Scene 3: Key Use Cases (0:50-1:20)
**Screen**: Show 3 quick examples

**Example 1**:
```
"What are the auto-deleveraging risks in Hyperliquid's terms?"
```
Shows crypto-specific clause detection

**Example 2**:
```
"Compare refund policies of Stripe vs PayPal"
```
Shows comparative analysis

**Example 3**:
```
"Analyze this privacy policy and tell me about data sharing"
```
Shows GDPR/privacy focus

**You say**:
> "Whether you're evaluating payment processors, analyzing competitor terms,
> or helping customers understand your policies, LegalEasy has you covered."

### Scene 4: Shopify Integration (1:20-1:50)
**Screen**: Show Shopify store checkout with LegalEasy widget

**You say**:
> "And it's not just for ChatGPT. Install our Shopify app to add the same
> plain-English summaries directly to your checkout page. Build trust with
> customers by making your terms transparent."

**Screen**: Show the Shopify App Store listing

**You say**:
> "Merchants get the ChatGPT integration AND the customer-facing widget.
> One app, two powerful tools for legal transparency."

### Scene 5: Call to Action (1:50-2:00)
**Screen**: LegalEasy logo + Shopify App Store button

**You say**:
> "LegalEasy: Powered by AI, integrated with ChatGPT, built for Shopify.
> Install now from the Shopify App Store."

---

## 📝 Example Prompts for Your Demo

### Merchant Use Cases:
```
Analyze the terms of service for this payment processor: [URL]
```

```
I'm considering using Shopify Payments vs. Stripe. Can you compare their
merchant agreements and highlight any differences in fees or liability?
```

```
What are the data privacy requirements in PayPal's terms that I need to
know as a Shopify merchant?
```

### Customer Use Cases (via your widget):
```
Explain this store's return policy in simple terms
```

```
What personal information does this privacy policy say they collect?
```

### Crypto/DeFi (Your Original Vision):
```
Analyze Hyperliquid's terms and find clauses about auto-deleveraging
or forced position closures
```

```
What are the withdrawal restrictions on this crypto exchange?
```

---

## 🎨 Bonus: Make It Look Professional

### Add a Simple Logo

Create `public/logo.png` (512x512) with:
- ⚖️ Scale icon (justice/legal theme)
- Simple, clean design
- Purple/blue color scheme (#7C3AED or #00B3A6)

Use Canva, Figma, or even:
```bash
# Generate a simple SVG -> PNG logo
# (You can use a free tool like https://www.namecheap.com/logo-maker/)
```

### Update Contact Info

In `public/.well-known/ai-plugin.json`, change:
```json
"contact_email": "YOUR-ACTUAL-EMAIL@example.com"
```

In `public/openapi.json`, you're good to go!

---

## ✅ Pre-Flight Checklist

Before recording your video:

- [ ] Development server running (`npm run dev`)
- [ ] Test script passes (`./test-chatgpt-integration.sh`)
- [ ] Custom GPT created in ChatGPT
- [ ] Test prompt works in ChatGPT
- [ ] Screen recording software ready (Loom, OBS, QuickTime)
- [ ] Script practiced
- [ ] Example URLs ready (Stripe, PayPal, Zora, Hyperliquid)

---

## 🚨 Troubleshooting

### "Failed to load plugin"
- Check CORS headers: `curl -I https://YOUR-DOMAIN.vercel.app/api/chatgpt/analyze`
- Verify OpenAPI spec: Paste into https://editor.swagger.io/

### "Action returned no data"
- Test endpoint directly: `curl -X POST https://YOUR-DOMAIN.vercel.app/api/chatgpt/analyze -H "Content-Type: application/json" -d '{"text":"test terms"}'`
- Check Vercel logs for errors

### ChatGPT says "I can't access that URL"
- Make sure your site is deployed and public
- Check that `.well-known/ai-plugin.json` is accessible

---

## 🎉 You're Ready!

Everything is built and tested. Just:
1. Deploy to Vercel
2. Create the Custom GPT
3. Record your demo
4. Submit to Shopify App Store

**Good luck with your video! 🎬**

For detailed step-by-step instructions, see: `CHATGPT_INTEGRATION_GUIDE.md`
