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

const dexes = [
  {
    name: 'Jupiter',
    slug: 'jupiter',
    termsUrl: 'https://station.jup.ag/docs/legal/terms-of-use',
    founded: '2021',
    blockchain: 'Solana',
    tvl: '$1B+',
  },
  {
    name: 'GMX',
    slug: 'gmx',
    termsUrl: 'https://app.gmx.io/#/terms-of-service',
    founded: '2021',
    blockchain: 'Arbitrum/Avalanche',
    tvl: '$500M+',
  },
  {
    name: '1inch',
    slug: '1inch',
    termsUrl: 'https://1inch.io/assets/1inch_network_terms_of_use.pdf',
    founded: '2019',
    blockchain: 'Multi-chain',
    tvl: '$500M+',
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

async function analyzeTerms(dexName: string, termsText: string) {
  console.log(`\n🤖 Analyzing ${dexName} with AI...`);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a legal analyst specializing in decentralized exchange (DEX) terms and conditions.

Analyze the provided terms and extract 8-12 KEY POLICIES that CRITICALLY IMPACT USERS regarding:
- Smart contract risks and vulnerabilities
- Impermanent loss and slippage
- Liquidity provider risks
- Protocol governance and changes
- Withdrawal restrictions or delays
- Fee structures
- Liability and insurance (or lack thereof)
- Front-running protection
- Regulatory compliance

For EACH policy provide:
1. title: Short, clear title (e.g., "Smart Contract Risk", "Impermanent Loss")
2. section: One of: account, trading, dispute, liability, fees, privacy, security, regulatory, other
3. category: "good" (user-friendly), "bad" (risky/concerning), or "common" (standard practice)
4. summary: 1-2 sentence plain English explanation of what this means for users
5. details: More detailed explanation with specific quotes from the terms
6. impact: "critical", "high", "medium", or "low"

Focus on ACTIONABLE policies that affect user funds, risks, and rights. Skip generic warnings.

Return valid JSON object with "policies" array.`,
      },
      {
        role: 'user',
        content: `Analyze these terms and conditions:\n\n${termsText.slice(0, 50000)}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const result = JSON.parse(completion.choices[0].message.content || '{}');
  return result.policies || [];
}

async function fetchTerms(url: string): Promise<string> {
  console.log(`📥 Fetching terms from: ${url}`);

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

async function createDEXInSanity(dex: any, policies: any[]) {
  console.log(`\n📝 Creating ${dex.name} in Sanity...`);

  const formattedPolicies = policies.map((policy: any) => ({
    _type: 'policyItem',
    section: policy.section || 'other',
    title: policy.title,
    category: policy.category,
    summary: policy.summary,
    details: convertToPortableText(policy.details || policy.summary),
    impact: policy.impact,
  }));

  // Calculate risk score
  const goodCount = policies.filter(p => p.category === 'good').length;
  const badCount = policies.filter(p => p.category === 'bad').length;
  const criticalCount = policies.filter(p => p.impact === 'critical').length;

  let riskScore = 5; // Default
  if (badCount > goodCount) {
    riskScore = Math.min(10, 5 + badCount - goodCount + criticalCount);
  } else {
    riskScore = Math.max(1, 5 - (goodCount - badCount));
  }

  const overallRating = riskScore <= 3 ? 'good' : riskScore <= 6 ? 'mixed' : 'risky';

  const doc = {
    _type: 'dex',
    name: dex.name,
    slug: {
      _type: 'slug',
      current: dex.slug,
    },
    description: `Decentralized exchange on ${dex.blockchain}. Founded in ${dex.founded}. TVL: ${dex.tvl}`,
    founded: dex.founded,
    blockchain: dex.blockchain,
    tvl: dex.tvl,
    termsUrl: dex.termsUrl,
    overallRating,
    riskScore,
    quickSummary: `${dex.name} is a DEX on ${dex.blockchain} with ${policies.length} analyzed policies. Risk score: ${riskScore}/10.`,
    policies: formattedPolicies,
    featured: true,
    displayOrder: 999,
  };

  const result = await writeClient.create(doc);
  console.log(`✅ Created ${dex.name}: ${result._id}`);
  console.log(`   Risk Score: ${riskScore}/10 (${overallRating})`);
  console.log(`   Policies: ${policies.length}`);
  return result;
}

async function main() {
  console.log('🚀 Adding more DEX platforms with policy analysis\n');

  for (const dex of dexes) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing: ${dex.name}`);
      console.log('='.repeat(60));

      // Fetch terms
      const termsText = await fetchTerms(dex.termsUrl);

      if (!termsText || termsText.length < 500) {
        console.log(`⚠️  Terms too short or failed to fetch for ${dex.name}, skipping...`);
        continue;
      }

      console.log(`📄 Fetched ${termsText.length} characters`);

      // Analyze with AI
      const policies = await analyzeTerms(dex.name, termsText);
      console.log(`✅ Extracted ${policies.length} policies`);

      if (policies.length > 0) {
        policies.forEach((p: any) => {
          console.log(`   - ${p.title} (${p.category}, ${p.impact})`);
        });
      }

      // Create in Sanity
      await createDEXInSanity(dex, policies);

      // Brief delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error: any) {
      console.error(`\n❌ Error processing ${dex.name}:`, error.message);
    }
  }

  console.log('\n\n✨ Done! All DEXs created.\n');
}

main().catch(console.error);
