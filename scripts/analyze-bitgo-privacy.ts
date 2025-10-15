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

const privacyPolicies = [
  {
    url: 'https://www.bitgo.com/legal/bitgo-privacy/',
    type: 'Global Privacy Notice',
  },
  {
    url: 'https://www.bitgo.com/legal/biometric-data-privacy-policy/',
    type: 'Biometric Data Privacy Policy',
  },
  {
    url: 'https://www.bitgo.com/legal/us-consumer-financial-privacy-notice/',
    type: 'US Consumer Financial Privacy Notice',
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

async function fetchPrivacyPolicy(url: string): Promise<string> {
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

async function analyzePrivacyPolicy(type: string, policyText: string) {
  console.log(`\n🤖 Analyzing ${type} with AI...`);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a privacy policy analyst specializing in cryptocurrency platforms.

Analyze this BitGo privacy policy and extract 3-6 KEY POLICIES that CRITICALLY IMPACT USERS.

Focus ONLY on policies that are:
1. UNUSUAL or MORE INVASIVE than typical privacy policies
2. Specifically relevant to cryptocurrency users (biometric data, financial data sharing, government disclosure)
3. ACTIONABLE - things users should know about their data

DO NOT include:
- Generic "we collect your email" statements
- Standard cookie policies
- Typical "we follow the law" statements
- Basic GDPR/CCPA rights that all companies offer

For EACH critical policy provide:
1. title: Short, specific title (e.g., "Biometric Face Scan Collection", "SSN Data Sharing")
2. section: Always use "privacy"
3. category: "good" (strong protections), "bad" (invasive/risky), or "common" (standard but important)
4. summary: 1-2 sentences in plain English about what this means for users
5. details: More detailed explanation with specific quotes from the policy
6. impact: "critical", "high", "medium", or "low"

If there are NO unusual or noteworthy policies, return an empty policies array.

Return valid JSON object with "policies" array.`,
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

async function appendPrivacyPoliciesToBitGo(newPolicies: any[]) {
  console.log(`\n📝 Appending ${newPolicies.length} privacy policies to BitGo...`);

  // Fetch current BitGo document
  const query = `*[_type == "cex" && name == "BitGo"][0]{
    _id,
    policies
  }`;

  const bitgo = await writeClient.fetch(query);

  if (!bitgo) {
    console.error('❌ BitGo not found in Sanity');
    return;
  }

  const formattedPolicies = newPolicies.map((policy: any) => ({
    _type: 'policyItem',
    section: 'privacy',
    title: policy.title,
    category: policy.category,
    summary: policy.summary,
    details: convertToPortableText(policy.details || policy.summary),
    impact: policy.impact,
  }));

  // Append to existing policies
  const updatedPolicies = [...(bitgo.policies || []), ...formattedPolicies];

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
    .patch(bitgo._id)
    .set({
      policies: updatedPolicies,
      riskScore,
      overallRating,
    })
    .commit();

  console.log(`✅ Updated BitGo with ${updatedPolicies.length} total policies`);
  console.log(`   New Risk Score: ${riskScore}/10 (${overallRating})`);
}

async function main() {
  console.log('🚀 Analyzing BitGo privacy policies\n');

  const allNewPolicies: any[] = [];

  for (const policy of privacyPolicies) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing: ${policy.type}`);
      console.log('='.repeat(60));

      // Fetch privacy policy
      const policyText = await fetchPrivacyPolicy(policy.url);

      if (!policyText || policyText.length < 500) {
        console.log(`⚠️  Policy too short or failed to fetch, skipping...`);
        continue;
      }

      console.log(`📄 Fetched ${policyText.length} characters`);

      // Analyze with AI
      const policies = await analyzePrivacyPolicy(policy.type, policyText);
      console.log(`✅ Extracted ${policies.length} notable policies`);

      if (policies.length > 0) {
        policies.forEach((p: any) => {
          console.log(`   - ${p.title} (${p.category}, ${p.impact})`);
        });
        allNewPolicies.push(...policies);
      }

      // Brief delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error: any) {
      console.error(`\n❌ Error processing ${policy.type}:`, error.message);
    }
  }

  // Append all new policies to BitGo
  if (allNewPolicies.length > 0) {
    await appendPrivacyPoliciesToBitGo(allNewPolicies);
  } else {
    console.log('\n⚠️  No notable privacy policies found to add.');
  }

  console.log('\n\n✨ Done! BitGo privacy policies analyzed and added.\n');
}

main().catch(console.error);
