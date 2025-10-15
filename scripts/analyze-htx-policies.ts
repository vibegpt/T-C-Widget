import { createClient } from 'next-sanity';
import OpenAI from 'openai';

const writeClient = createClient({
  projectId: 'c15x4s4x',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const policies = [
  {
    url: 'https://www.htx.com/support/360000298561',
    type: 'Terms of Service',
  },
  {
    url: 'https://www.htx.com/support/360000298601',
    type: 'Privacy Policy',
  },
];

function convertToPortableText(text: string) {
  return [
    {
      _type: 'block',
      style: 'normal',
      children: [{ _type: 'span', text, marks: [] }],
    },
  ];
}

async function fetchPolicy(url: string): Promise<string> {
  console.log(`📥 Fetching: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Basic HTML to text conversion
    const text = html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return '';
  }
}

async function analyzePolicy(type: string, policyText: string) {
  console.log(`\n🤖 Analyzing ${type} with AI...`);

  const systemPrompt = type === 'Privacy Policy'
    ? `You are a privacy policy analyst specializing in cryptocurrency platforms.

Analyze this HTX/Huobi privacy policy and extract 3-6 KEY POLICIES that CRITICALLY IMPACT USERS.

Focus ONLY on policies that are:
1. UNUSUAL or MORE INVASIVE than typical privacy policies
2. Specifically relevant to cryptocurrency users
3. ACTIONABLE - things users should know about their data

DO NOT include generic policies. Focus on what stands out.

For EACH critical policy provide:
1. title: Short, specific title
2. section: "privacy"
3. category: "good" (strong protections), "bad" (invasive/risky), or "common" (standard but important)
4. summary: 1-2 sentences in plain English
5. details: More detailed explanation with specific quotes
6. impact: "critical", "high", "medium", or "low"

Return valid JSON object with "policies" array.`
    : `You are a legal analyst specializing in cryptocurrency exchange terms.

Analyze this HTX/Huobi terms of service and extract 3-6 KEY POLICIES that CRITICALLY IMPACT USERS.

Focus ONLY on policies about:
- Geographic restrictions and bans
- Account access restrictions
- Unusual risk disclosures
- User liability

DO NOT include generic terms. Focus on what stands out as unusual or particularly restrictive.

For EACH critical policy provide:
1. title: Short, specific title
2. section: One of: account, trading, dispute, liability, fees, privacy, security, regulatory, other
3. category: "good" (user-friendly), "bad" (risky/concerning), or "common" (standard practice)
4. summary: 1-2 sentences in plain English
5. details: More detailed explanation with specific quotes
6. impact: "critical", "high", "medium", or "low"

Return valid JSON object with "policies" array.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Analyze this ${type}:\n\n${policyText.slice(0, 50000)}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const result = JSON.parse(completion.choices[0].message.content || '{}');
  return result.policies || [];
}

async function appendPoliciesToHuobi(newPolicies: any[]) {
  console.log(`\n📝 Appending ${newPolicies.length} policies to Huobi...`);

  // Fetch current Huobi document
  const query = `*[_type == "cex" && name == "Huobi"][0]{
    _id,
    policies
  }`;

  const huobi = await writeClient.fetch(query);

  if (!huobi) {
    console.error('❌ Huobi not found in Sanity');
    return;
  }

  const formattedPolicies = newPolicies.map((policy: any) => ({
    _type: 'policyItem',
    section: policy.section,
    title: policy.title,
    category: policy.category,
    summary: policy.summary,
    details: convertToPortableText(policy.details || policy.summary),
    impact: policy.impact,
  }));

  // Append to existing policies
  const updatedPolicies = [...(huobi.policies || []), ...formattedPolicies];

  // Recalculate risk score
  const allPolicies = updatedPolicies;
  const goodCount = allPolicies.filter((p: any) => p.category === 'good').length;
  const badCount = allPolicies.filter((p: any) => p.category === 'bad').length;
  const criticalCount = allPolicies.filter((p: any) => p.impact === 'critical').length;

  let riskScore = 5;
  if (badCount > goodCount) {
    riskScore = Math.min(10, 5 + badCount - goodCount + criticalCount);
  } else {
    riskScore = Math.max(1, 5 - (goodCount - badCount));
  }

  const overallRating = riskScore <= 3 ? 'good' : riskScore <= 6 ? 'mixed' : 'risky';

  // Update document
  await writeClient
    .patch(huobi._id)
    .set({
      policies: updatedPolicies,
      riskScore,
      overallRating,
    })
    .commit();

  console.log(`✅ Updated Huobi with ${updatedPolicies.length} total policies`);
  console.log(`   New Risk Score: ${riskScore}/10 (${overallRating})`);
}

async function main() {
  console.log('🚀 Analyzing HTX/Huobi policies\n');

  const allNewPolicies: any[] = [];

  for (const policy of policies) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing: ${policy.type}`);
      console.log('='.repeat(60));

      // Fetch policy
      const policyText = await fetchPolicy(policy.url);

      if (!policyText || policyText.length < 500) {
        console.log(`⚠️  Policy too short or failed to fetch, skipping...`);
        continue;
      }

      console.log(`📄 Fetched ${policyText.length} characters`);

      // Analyze with AI
      const extractedPolicies = await analyzePolicy(policy.type, policyText);
      console.log(`✅ Extracted ${extractedPolicies.length} notable policies`);

      if (extractedPolicies.length > 0) {
        extractedPolicies.forEach((p: any) => {
          console.log(`   - ${p.title} (${p.category}, ${p.impact})`);
        });
        allNewPolicies.push(...extractedPolicies);
      }

      // Brief delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error: any) {
      console.error(`\n❌ Error processing ${policy.type}:`, error.message);
    }
  }

  // Append all new policies to Huobi
  if (allNewPolicies.length > 0) {
    await appendPoliciesToHuobi(allNewPolicies);
  } else {
    console.log('\n⚠️  No notable policies found to add.');
  }

  console.log('\n\n✨ Done! HTX/Huobi policies analyzed and added.\n');
}

main().catch(console.error);
