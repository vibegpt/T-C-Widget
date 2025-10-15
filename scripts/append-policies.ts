import OpenAI from 'openai';
import { createClient } from 'next-sanity';
import * as cheerio from 'cheerio';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY?.replace(/[\u2028\u2029]/g, '').trim(),
});

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'c15x4s4x',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

interface AppendRequest {
  documentId: string;
  documentUrl: string;
  documentType: 'privacy' | 'terms' | 'aup' | 'other';
  name: string;
  type: string;
}

async function fetchTermsFromUrl(url: string): Promise<string> {
  console.log(`Fetching document from: ${url}`);
  const response = await fetch(url);
  const html = await response.text();

  const $ = cheerio.load(html);

  // Remove script and style tags
  $('script, style, nav, header, footer').remove();

  // Get the text content
  const text = $('body').text()
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

async function analyzeDocument(text: string, name: string, type: string, documentType: string) {
  console.log(`Analyzing ${documentType} for ${name}...`);

  const sanitizedText = text
    .replace(/[\u2028\u2029]/g, '\n')
    .replace(/[^\x00-\x7F\u0080-\uFFFF]/g, '');

  const sanitizePrompt = (str: string) => str.replace(/[\u2028\u2029]/g, '\n');

  const systemPrompt = sanitizePrompt(`You are a legal analyst specializing in cryptocurrency exchange and app policies. Analyze the provided ${documentType} document and extract key policies that affect users. Categorize each policy as: "good" (user-friendly, protective of users), "bad" (risky, favors company over users), "common" (standard industry practice). Rate the impact as: "critical" (can lose all funds/major privacy breach), "high" (significant restrictions/data sharing), "medium" (notable limitations), "low" (minor inconvenience). Provide detailed analysis for each policy.`);

  const userPrompt = sanitizePrompt(`Analyze this ${documentType} document for ${name} (${type}):

${sanitizedText}

Please provide:
1. 5-10 key policies with:
   - Section (account/trading/dispute/liability/fees/privacy/other)
   - Title (short, descriptive)
   - Category (good/bad/common)
   - Summary (1-2 sentences, plain English)
   - Impact level (critical/high/medium/low)
   - Detailed explanation with relevant quotes

AUTO-CATEGORIZE policies into sections:
- account: Account management, freezing, suspension, KYC, verification
- trading: Trading rules, liquidation, margin, withdrawals, deposits
- dispute: Arbitration, complaints, class actions, legal recourse
- liability: Insurance, loss protection, custody, liability limits
- fees: Trading fees, withdrawal fees, hidden costs
- privacy: Data sharing, tracking, security, surveillance, cookies, analytics
- other: Anything else

Format as JSON with this structure:
{
  "policies": [
    {
      "section": "account|trading|dispute|liability|fees|privacy|other",
      "title": "string",
      "category": "good|bad|common",
      "summary": "string",
      "impact": "critical|high|medium|low",
      "details": "string with quotes from document"
    }
  ]
}`);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

async function appendPoliciesToSanity(request: AppendRequest, analysis: any) {
  console.log(`Fetching existing document: ${request.documentId}`);

  // Fetch existing document
  const existingDoc = await writeClient.fetch(
    `*[_id == $id][0]{ _id, name, policies }`,
    { id: request.documentId }
  );

  if (!existingDoc) {
    throw new Error(`Document with ID ${request.documentId} not found`);
  }

  console.log(`Found existing document: ${existingDoc.name}`);
  console.log(`Current policies count: ${existingDoc.policies?.length || 0}`);

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

  const newPolicies = analysis.policies?.map((policy: any) => ({
    _type: 'policyItem',
    section: policy.section,
    title: policy.title,
    category: policy.category,
    summary: policy.summary,
    details: convertToPortableText(policy.details),
    impact: policy.impact,
  })) || [];

  console.log(`Adding ${newPolicies.length} new policies`);

  // Combine existing and new policies
  const combinedPolicies = [...(existingDoc.policies || []), ...newPolicies];

  console.log(`Total policies after merge: ${combinedPolicies.length}`);

  // Update the document
  const result = await writeClient
    .patch(request.documentId)
    .set({
      policies: combinedPolicies,
    })
    .commit();

  console.log(`✅ Successfully updated ${existingDoc.name} with ID: ${result._id}`);
  return result;
}

export async function appendPolicies(requests: AppendRequest[]) {
  console.log(`\n🚀 Starting policy append for ${requests.length} documents...\n`);

  for (const request of requests) {
    try {
      console.log(`\n📋 Processing: ${request.name} - ${request.documentType}`);

      // Fetch document
      const documentText = await fetchTermsFromUrl(request.documentUrl);

      // Analyze
      const analysis = await analyzeDocument(
        documentText,
        request.name,
        request.type,
        request.documentType
      );

      // Append to Sanity
      await appendPoliciesToSanity(request, analysis);

      console.log(`✅ ${request.name} - ${request.documentType} completed successfully\n`);

    } catch (error) {
      console.error(`❌ Error processing ${request.name}:`, error);
      console.log(`Skipping to next...\n`);
    }
  }

  console.log(`\n🎉 Policy append complete!`);
}

// MEXC Additional Policies
const appendRequests: AppendRequest[] = [
  {
    documentId: 'pPkuniS6qVZF4B8OpWIemW',
    documentUrl: 'https://www.mexc.com/privacypolicy',
    documentType: 'privacy',
    name: 'MEXC',
    type: 'CEX',
  },
  {
    documentId: 'pPkuniS6qVZF4B8OpWIemW',
    documentUrl: 'https://www.mexc.com/risk',
    documentType: 'other',
    name: 'MEXC',
    type: 'CEX',
  },
  {
    documentId: 'pPkuniS6qVZF4B8OpWIemW',
    documentUrl: 'https://www.mexc.com/support/requests/legal',
    documentType: 'other',
    name: 'MEXC',
    type: 'CEX',
  },
];

// Run if executed directly
if (require.main === module) {
  appendPolicies(appendRequests).catch(console.error);
}
