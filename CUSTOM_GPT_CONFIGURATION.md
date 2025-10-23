# LegalEasy Custom GPT Configuration

## Step-by-Step Setup

### 1. Go to ChatGPT and Create GPT

1. Visit https://chat.openai.com/
2. Click your profile picture (bottom left)
3. Select "My GPTs"
4. Click "Create a GPT"
5. Click the **Configure** tab (skip the Create tab)

---

### 2. Basic Information

**Name:**
```
LegalEasy - Shop Smarter
```

**Description:**
```
Analyze merchant policies in plain English while shopping. Understand refunds, shipping, privacy, and terms before you buy.
```

**Instructions:**
```
You are LegalEasy, an expert at helping people understand legal policies while shopping online.

When users are shopping (via ChatGPT checkout or asking about any merchant's policies), use your actions to analyze:
- Refund policies (windows, conditions, restocking fees)
- Shipping policies (times, costs, tracking)
- Privacy policies (data collection, sharing, retention)
- Terms of service (liability, disputes, termination)

ALWAYS use your actions to fetch and analyze policies rather than making assumptions.

When presenting findings:
1. Start with the most important consumer info (refund window, shipping time, etc.)
2. Highlight any red flags (short return windows, high restocking fees, binding arbitration, liability caps)
3. Use clear, plain English - avoid legal jargon
4. Be friendly and helpful, not alarmist
5. If the policy is good for consumers, say so!

Risk flags to highlight:
⚠️ = Important limitation or requirement
✓ = Consumer-friendly provision
🔴 = Major concern (very short return window, no refunds, etc.)

Example response format:
"I analyzed their refund policy. Here's what you need to know:

**Returns:** 30-day window ✓
**Condition:** Items must be unworn with tags attached
**Restocking Fee:** 15% ⚠️
**Shipping:** Customer pays return shipping ⚠️

Overall: Standard policy, but watch out for the restocking fee on returns."

For shopping questions, ALWAYS check the actual policies before answering. Don't guess or provide generic answers.
```

**Conversation starters:**
```
What's the refund policy?
How long does shipping take?
What data does this collect?
Compare return policies for these items
```

---

### 3. Add Actions

Click **"Create new action"**

**Authentication:**
- Select: **None**

**Schema:**
- Click: **"Import from URL"**
- Enter: `https://legaleasy.tools/openapi.json`
- Click: **Import**

You should see two actions imported:
1. `analyzeLegalDocument`
2. `analyzeLegalDocumentFromURL`

**Privacy Policy:**
- Enter: `https://legaleasy.tools/legal`

---

### 4. Capabilities

Check these boxes:
- ✅ Web Browsing (in case policies aren't accessible via your API)
- ✅ Code Interpreter (optional, for data analysis)

Leave unchecked:
- ⬜ DALL·E Image Generation (not needed)

---

### 5. Additional Settings

**Profile Picture / Logo:**
- Upload your logo (512x512 PNG)
- Or use this placeholder: https://legaleasy.tools/logo.png

**Allow use of conversation data:**
- Your choice (recommended: Yes for improvement)

---

### 6. Save and Publish

1. Click **"Update"** (top right)
2. Click **"Publish"** dropdown
3. Choose:
   - **"Only me"** (for testing first) OR
   - **"Anyone with a link"** (to share before GPT Store) OR
   - **"Public"** (to submit to GPT Store immediately)

4. Click **"Confirm"**

5. Copy the GPT link (looks like: `https://chat.openai.com/g/g-XXXXXX-legaleasy`)

---

## Testing Your Custom GPT

### Test 1: Direct Text Analysis

In your new LegalEasy GPT, try:

```
Analyze this refund policy:

"All sales are final. No refunds or exchanges under any circumstances.
By purchasing, you agree to binding arbitration in Delaware."
```

**Expected response:**
- Should use your `analyzeLegalDocument` action
- Should flag: no refunds, binding arbitration
- Should warn user about restrictive policy

---

### Test 2: URL Analysis

```
Analyze Stripe's terms of service at: https://stripe.com/legal/ssa
```

**Expected response:**
- Should use your `analyzeLegalDocumentFromURL` action
- Should fetch and parse the content
- Should return structured summary with key findings

---

### Test 3: Shopping Scenario

```
I'm looking at a $200 winter jacket. Before I buy, what should I know
about the return policy? The merchant is example.com.
```

**Expected response:**
- Should ask for the refund policy URL or text
- Should analyze it
- Should highlight return window, conditions, fees

---

## Troubleshooting

### Issue: "Action failed to execute"

**Check:**
1. Is https://legaleasy.tools/openapi.json accessible?
   ```bash
   curl https://legaleasy.tools/openapi.json
   ```
2. Are your API endpoints returning proper responses?
   ```bash
   curl -X POST https://legaleasy.tools/api/chatgpt/analyze \
     -H "Content-Type: application/json" \
     -d '{"text":"test"}'
   ```

**Solution:**
- Verify Vercel deployment is live
- Check API logs for errors
- Ensure CORS is properly configured

---

### Issue: "Privacy policy required"

**Check:**
- Does https://legaleasy.tools/legal exist?

**Solution:**
- Create `/src/app/legal/page.tsx` (we'll do this next)
- Or temporarily use a different URL you control

---

### Issue: GPT doesn't use actions

**Check:**
- Instructions should explicitly tell GPT to "use your actions"
- Try being more direct: "What's the refund policy for stripe.com/legal/ssa"

**Solution:**
- Update instructions to be more directive
- Test with explicit URLs that your Action can parse

---

## After Publishing

### Share Your GPT

**Direct link:**
`https://chat.openai.com/g/g-XXXXXX-legaleasy` (replace with your actual link)

**Share on:**
- Twitter/X: "I built a ChatGPT GPT that analyzes merchant policies while you shop 🛍️"
- LinkedIn: Professional post about building AI tools for consumer protection
- Reddit: r/ChatGPT, r/OpenAI
- Product Hunt: Launch announcement

### Submit to GPT Store

1. Make sure GPT is set to "Public"
2. Go to https://chat.openai.com/gpts/discovery
3. Look for "Submit a GPT" option
4. Fill out submission form:
   - Category: Shopping, Productivity, or Research
   - Description: Copy from above
   - Tags: shopping, legal, consumer rights, policies, e-commerce

5. Wait for approval (typically 1-2 weeks)

---

## Usage Analytics

Once published, track:
- Number of conversations
- Most common questions
- Which policies are analyzed most
- User feedback/ratings

Use this data to:
- Improve instructions
- Expand parser capabilities
- Identify merchant partnership opportunities
- Refine value proposition

---

## Next Steps After Custom GPT

1. ✅ Create legal/privacy page
2. ✅ Draft OpenAI partnership proposal
3. ✅ Finish Shopify video
4. ✅ Test extensively with real shopping scenarios
5. ✅ Collect early user testimonials
6. ✅ Iterate based on feedback

---

**You're ready to create your Custom GPT! Follow the steps above and you'll be live in 15 minutes.** 🚀
