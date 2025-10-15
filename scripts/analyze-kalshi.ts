import OpenAI from 'openai';
import { createClient } from 'next-sanity';
import * as cheerio from 'cheerio';

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

async function fetchDocumentText(url: string): Promise<string | null> {
  try {
    console.log(`📄 Fetching ${url}...`);
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script and style elements
    $('script').remove();
    $('style').remove();

    // Get text content
    const text = $('body').text();

    // Clean up whitespace
    const cleaned = text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();

    return cleaned;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

async function analyzeDocument(text: string) {
  console.log(`🤖 Analyzing Kalshi terms with GPT-4o-mini...`);

  const sanitizedText = text
    .replace(/[\u2028\u2029]/g, '\n')
    .replace(/[^\x00-\x7F\u0080-\uFFFF]/g, '');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a legal analyst specializing in prediction markets and financial platforms. Extract 10-20 key policies that affect users. Focus on: trading restrictions, market rules, payout conditions, dispute resolution, regulatory compliance, prohibited jurisdictions, fees, account termination, liability limitations, and unusual restrictions specific to prediction markets.'
      },
      {
        role: 'user',
        content: `Analyze this Terms of Service for Kalshi (US-regulated prediction markets platform):\n\n${sanitizedText}\n\nFormat as JSON:\n{\n  "policies": [\n    {\n      "section": "account|trading|dispute|liability|fees|privacy|other",\n      "title": "string",\n      "category": "good|bad|common",\n      "summary": "string (1-2 sentences)",\n      "impact": "critical|high|medium|low",\n      "details": "string with relevant quotes"\n    }\n  ]\n}`
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

async function createKalshi(policies: any[], termsUrl: string) {
  console.log(`\n💾 Creating Kalshi in Sanity...`);

  const convertToPortableText = (details: string) => [{
    _type: 'block',
    style: 'normal',
    children: [{ _type: 'span', text: details, marks: [] }],
  }];

  const formattedPolicies = policies.map((policy: any) => ({
    _type: 'policyItem',
    section: policy.section,
    title: policy.title,
    category: policy.category,
    summary: policy.summary,
    details: convertToPortableText(policy.details),
    impact: policy.impact,
  }));

  // Calculate overall rating and risk score
  const criticalCount = formattedPolicies.filter((p: any) => p.impact === 'critical').length;
  const badCount = formattedPolicies.filter((p: any) => p.category === 'bad').length;
  const goodCount = formattedPolicies.filter((p: any) => p.category === 'good').length;

  let overallRating = 'mixed';
  let riskScore = 5;

  if (criticalCount > 3 || badCount > goodCount * 2) {
    overallRating = 'risky';
    riskScore = 7 + Math.min(criticalCount, 3);
  } else if (goodCount > badCount * 2) {
    overallRating = 'good';
    riskScore = 3 - Math.min(goodCount / 5, 2);
  }

  const platformData = {
    _type: 'predictionMarket',
    name: 'Kalshi',
    slug: { _type: 'slug', current: 'kalshi' },
    description: 'CFTC-regulated prediction market platform for trading on real-world events in the United States',
    overallRating,
    riskScore,
    quickSummary: 'Comprehensive analysis of Kalshi\'s terms of service, including trading restrictions, regulatory compliance, and payout conditions for the first US-regulated prediction market exchange.',
    termsUrl,
    founded: '2018',
    jurisdiction: 'United States',
    tradingVolume: undefined, // Can be added manually
    users: undefined, // Can be added manually
    policies: formattedPolicies,
    keyTakeaways: [
      'CFTC-regulated and legally compliant in the United States',
      'Review all trading restrictions and market manipulation rules',
      'Understand dispute resolution processes and account termination policies',
    ],
    featured: true,
    displayOrder: 1,
  };

  const result = await writeClient.create(platformData);
  console.log(`✅ Created Kalshi (ID: ${result._id})`);
  return result;
}

async function main() {
  console.log('\n🎯 Analyzing Kalshi (Prediction Markets)\n');
  console.log('='.repeat(60) + '\n');

  const termsUrl = 'https://kalshi.com/terms-of-service';

  const text = await fetchDocumentText(termsUrl);

  if (!text) {
    console.error('❌ Failed to fetch Kalshi terms');
    return;
  }

  console.log(`✓ Fetched ${text.length} characters\n`);

  const analysis = await analyzeDocument(text);

  if (!analysis.policies || analysis.policies.length === 0) {
    console.error('❌ No policies extracted');
    return;
  }

  console.log(`✓ Extracted ${analysis.policies.length} policies\n`);

  analysis.policies.forEach((policy: any, idx: number) => {
    console.log(`${idx + 1}. ${policy.title} (${policy.category}, ${policy.impact})`);
  });

  await createKalshi(analysis.policies, termsUrl);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Kalshi analysis complete!');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
