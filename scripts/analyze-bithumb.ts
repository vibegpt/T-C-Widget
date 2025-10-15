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

interface AnalyzeRequest {
  name: string;
  type: 'CEX' | 'DEX' | 'Third Party App';
  termsUrl: string;
  founded?: string;
  jurisdiction?: string;
}

async function fetchTermsFromUrl(url: string): Promise<string> {
  console.log(`Fetching terms from: ${url}`);
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

async function analyzeTerms(text: string, name: string, type: string) {
  console.log(`Analyzing terms for ${name}...`);

  const sanitizedText = text
    .replace(/[\u2028\u2029]/g, '\n')
    .replace(/[^\x00-\x7F\u0080-\uFFFF]/g, '');

  const sanitizePrompt = (str: string) => str.replace(/[\u2028\u2029]/g, '\n');

  const systemPrompt = sanitizePrompt('You are a legal analyst specializing in cryptocurrency exchange terms and conditions. Analyze the provided terms and conditions and extract key policies that affect users. Categorize each policy as: "good" (user-friendly, protective of users), "bad" (risky, favors exchange over users), "common" (standard industry practice). Rate the impact as: "critical" (can lose all funds), "high" (significant restrictions), "medium" (notable limitations), "low" (minor inconvenience). Provide a concise summary and detailed analysis for each policy.');

  const userPrompt = sanitizePrompt(`Analyze these Terms & Conditions for ${name} (${type}):

${sanitizedText}

Please provide:
1. Overall rating (good/mixed/risky)
2. Risk score (0-10, where 10 is highest risk)
3. Quick summary (2-3 sentences in plain English)
4. 5-10 key policies with:
   - Section (account/trading/dispute/liability/fees/privacy/other)
   - Title (short, descriptive)
   - Category (good/bad/common)
   - Summary (1-2 sentences, plain English)
   - Impact level (critical/high/medium/low)
   - Detailed explanation with relevant quotes from T&C
5. 3-5 key takeaways (plain English, actionable)

AUTO-CATEGORIZE policies into sections:
- account: Account management, freezing, suspension, KYC, verification
- trading: Trading rules, liquidation, margin, withdrawals, deposits
- dispute: Arbitration, complaints, class actions, legal recourse
- liability: Insurance, loss protection, custody, liability limits
- fees: Trading fees, withdrawal fees, hidden costs
- privacy: Data sharing, tracking, security, surveillance
- other: Anything else

Format as JSON with this structure:
{
  "overallRating": "good|mixed|risky",
  "riskScore": 0-10,
  "quickSummary": "string",
  "policies": [
    {
      "section": "account|trading|dispute|liability|fees|privacy|other",
      "title": "string",
      "category": "good|bad|common",
      "summary": "string",
      "impact": "critical|high|medium|low",
      "details": "string with quotes from T&C"
    }
  ],
  "keyTakeaways": ["string"]
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

async function saveToSanity(data: AnalyzeRequest, analysis: any) {
  console.log(`Saving ${data.name} to Sanity...`);

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

  const policies = analysis.policies?.map((policy: any) => ({
    _type: 'policyItem',
    section: policy.section,
    title: policy.title,
    category: policy.category,
    summary: policy.summary,
    details: convertToPortableText(policy.details),
    impact: policy.impact,
  })) || [];

  const contentType = data.type === 'Third Party App' ? 'thirdPartyApp' :
                      data.type === 'DEX' ? 'dex' : 'cex';

  const slug = data.name.toLowerCase().replace(/\s+/g, '-');

  const exchangeData = {
    _type: contentType,
    name: data.name,
    slug: { _type: 'slug', current: slug },
    description: analysis.quickSummary || '',
    overallRating: analysis.overallRating,
    riskScore: analysis.riskScore,
    quickSummary: analysis.quickSummary,
    termsUrl: data.termsUrl,
    founded: data.founded,
    jurisdiction: data.jurisdiction,
    policies,
    keyTakeaways: analysis.keyTakeaways || [],
    featured: true,
    displayOrder: 999,
  };

  const result = await writeClient.create(exchangeData);
  console.log(`✅ Successfully saved ${data.name} with ID: ${result._id}`);
  return result;
}

export async function analyzeAndUpload(requests: AnalyzeRequest[]) {
  console.log(`\n🚀 Starting batch analysis for ${requests.length} exchanges...\n`);

  for (const request of requests) {
    try {
      console.log(`\n📋 Processing: ${request.name}`);

      // Fetch terms
      const termsText = await fetchTermsFromUrl(request.termsUrl);

      // Analyze
      const analysis = await analyzeTerms(termsText, request.name, request.type);

      // Save to Sanity
      await saveToSanity(request, analysis);

      console.log(`✅ ${request.name} completed successfully\n`);

    } catch (error) {
      console.error(`❌ Error processing ${request.name}:`, error);
      console.log(`Skipping to next...\n`);
    }
  }

  console.log(`\n🎉 Batch analysis complete!`);
}

// Bithumb
const exchanges: AnalyzeRequest[] = [
  {
    name: 'Bithumb',
    type: 'CEX',
    termsUrl: 'https://www.bithumb.com/react/terms/info-terms',
    founded: '2014',
    jurisdiction: 'South Korea',
  },
];

// Run if executed directly
if (require.main === module) {
  analyzeAndUpload(exchanges).catch(console.error);
}
