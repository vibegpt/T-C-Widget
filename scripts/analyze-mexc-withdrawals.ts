import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import { createClient } from 'next-sanity';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY?.replace(/[\u2028\u2029]/g, '').trim(),
});

const writeClient = createClient({
  projectId: 'c15x4s4x',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function analyzeWithdrawalRestrictions() {
  console.log('🔍 Fetching MEXC terms to analyze withdrawal restrictions...\n');

  const response = await fetch('https://www.mexc.com/terms');
  const html = await response.text();
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();

  console.log('🤖 Analyzing with GPT-4o-mini specifically for withdrawal/payout restrictions...\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a legal analyst specializing in cryptocurrency exchange terms. Focus EXCLUSIVELY on policies that allow the exchange to: restrict withdrawals, block payouts, freeze funds, delay transfers, suspend accounts affecting fund access, or impose withdrawal conditions. Be thorough - these are critical consumer protection issues.'
      },
      {
        role: 'user',
        content: `Analyze MEXC's terms and extract ONLY policies related to:
- Withdrawal restrictions or delays
- Payout refusals or holds
- Account freezing/suspension that blocks fund access
- Transfer limitations or conditions
- Any discretionary power to withhold user funds
- KYC/AML requirements that can block withdrawals
- Suspicious activity clauses affecting payouts
- Liquidation or seizure of funds

MEXC Terms:\n\n${text}

Format as JSON:
{
  "policies": [
    {
      "section": "trading|account|liability|other",
      "title": "Descriptive title",
      "category": "bad",
      "summary": "1-2 sentence plain English summary",
      "impact": "critical|high",
      "details": "Exact quotes from terms showing how they can block payouts"
    }
  ]
}`
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  const analysis = JSON.parse(completion.choices[0].message.content || '{}');

  console.log(`✅ Found ${analysis.policies?.length || 0} withdrawal/payout restriction policies\n`);

  if (analysis.policies && analysis.policies.length > 0) {
    console.log('📋 Policies Found:\n');
    analysis.policies.forEach((policy: any, idx: number) => {
      console.log(`${idx + 1}. ${policy.title} (${policy.impact})`);
      console.log(`   ${policy.summary}\n`);
    });

    // Fetch existing MEXC document
    const existingDoc = await writeClient.fetch(
      `*[_id == "pPkuniS6qVZF4B8OpWIemW"][0]{ _id, name, policies }`,
      {}
    );

    console.log(`\n📊 Current MEXC policies: ${existingDoc.policies?.length || 0}`);

    const convertToPortableText = (details: string) => {
      return [
        {
          _type: 'block',
          style: 'normal',
          children: [
            {
              _type: 'span',
              text: details,
              marks: [],
            },
          ],
        },
      ];
    };

    const newPolicies = analysis.policies.map((policy: any) => ({
      _type: 'policyItem',
      section: policy.section,
      title: policy.title,
      category: policy.category,
      summary: policy.summary,
      details: convertToPortableText(policy.details),
      impact: policy.impact,
    }));

    // Check for duplicates by title
    const existingTitles = new Set(existingDoc.policies?.map((p: any) => p.title.toLowerCase()) || []);
    const uniqueNewPolicies = newPolicies.filter(
      (p: any) => !existingTitles.has(p.title.toLowerCase())
    );

    if (uniqueNewPolicies.length > 0) {
      console.log(`\n➕ Adding ${uniqueNewPolicies.length} new unique policies to MEXC`);

      const combinedPolicies = [...(existingDoc.policies || []), ...uniqueNewPolicies];

      const result = await writeClient
        .patch('pPkuniS6qVZF4B8OpWIemW')
        .set({ policies: combinedPolicies })
        .commit();

      console.log(`✅ Successfully updated MEXC - now has ${combinedPolicies.length} total policies`);
    } else {
      console.log(`\n✓ All policies already exist in MEXC document`);
    }
  }
}

analyzeWithdrawalRestrictions().catch(console.error);
