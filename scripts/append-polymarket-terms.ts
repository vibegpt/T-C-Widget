import OpenAI from 'openai';
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

const TERMS_TEXT = `[Terms of Use text from previous message]`;

async function analyzeTerms() {
  console.log('🔍 Analyzing Polymarket Terms of Use...\n');

  const sanitizedText = TERMS_TEXT
    .replace(/[\u2028\u2029]/g, '\n')
    .replace(/[^\x00-\x7F\u0080-\uFFFF]/g, '');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a legal analyst specializing in prediction markets and cryptocurrency platforms. Extract 10-20 key policies that affect users. Focus on: betting/wagering restrictions, geographic restrictions, prohibited conduct, market manipulation rules, payout conditions, dispute resolution, liability limitations, regulatory compliance, account termination, and unusual restrictions. Avoid common boilerplate clauses unless they have unusual or critical implications.'
      },
      {
        role: 'user',
        content: `Analyze Polymarket's Terms of Use (Prediction Markets platform):\n\n${sanitizedText}\n\nFormat as JSON:\n{\n  "policies": [\n    {\n      "section": "account|trading|dispute|liability|fees|privacy|other",\n      "title": "string",\n      "category": "good|bad|common",\n      "summary": "string (1-2 sentences)",\n      "impact": "critical|high|medium|low",\n      "details": "string with relevant quotes"\n    }\n  ]\n}`
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

async function appendPoliciesToPolymarket() {
  console.log('📋 Fetching existing Polymarket document...\n');

  const existingDoc = await writeClient.fetch(
    `*[_id == "yoRegLyjAjsStViXmQJtiq"][0]{ _id, name, policies }`
  );

  if (!existingDoc) {
    console.error('❌ Polymarket document not found');
    return;
  }

  console.log(`✓ Found Polymarket with ${existingDoc.policies?.length || 0} existing policies\n`);

  const analysis = await analyzeTerms();

  if (!analysis.policies || analysis.policies.length === 0) {
    console.error('❌ No policies extracted from Terms of Use');
    return;
  }

  console.log(`✓ Extracted ${analysis.policies.length} new policies from Terms of Use\n`);

  const convertToPortableText = (details: string) => [{
    _type: 'block',
    style: 'normal',
    children: [{ _type: 'span', text: details, marks: [] }],
  }];

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
  const existingTitles = new Set(
    existingDoc.policies?.map((p: any) => p.title.toLowerCase()) || []
  );
  const uniqueNewPolicies = newPolicies.filter(
    (p: any) => !existingTitles.has(p.title.toLowerCase())
  );

  if (uniqueNewPolicies.length === 0) {
    console.log('✓ All policies already exist in Polymarket document');
    return;
  }

  console.log(`➕ Adding ${uniqueNewPolicies.length} new unique policies to Polymarket\n`);

  uniqueNewPolicies.forEach((policy: any, idx: number) => {
    console.log(`${idx + 1}. ${policy.title} (${policy.category}, ${policy.impact})`);
  });

  const combinedPolicies = [...(existingDoc.policies || []), ...uniqueNewPolicies];

  const result = await writeClient
    .patch('yoRegLyjAjsStViXmQJtiq')
    .set({ policies: combinedPolicies })
    .commit();

  console.log(`\n✅ Successfully updated Polymarket - now has ${combinedPolicies.length} total policies`);
}

appendPoliciesToPolymarket().catch(console.error);
