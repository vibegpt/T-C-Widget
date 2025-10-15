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

const exchanges = [
  {
    name: 'Coinbase',
    slug: 'coinbase',
    termsUrl: 'https://www.coinbase.com/legal/user_agreement/united_states',
    founded: '2012',
    jurisdiction: 'United States',
  },
  {
    name: 'BitGo',
    slug: 'bitgo',
    termsUrl: 'https://www.bitgo.com/legal/services-agreement/',
    founded: '2013',
    jurisdiction: 'United States',
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

async function analyzeTerms(exchangeName: string, termsText: string) {
  console.log(`\n🤖 Analyzing ${exchangeName} with AI...`);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a legal analyst specializing in cryptocurrency exchange terms and conditions.

Analyze the provided terms and extract 10-15 KEY policies that CRITICALLY IMPACT USERS regarding:
- Funds control (freeze, seize, withdrawal restrictions)
- Account termination/banning
- Liability and insurance
- Forced liquidations or position closures
- Hidden fees or penalties
- Data sharing and privacy
- Dispute resolution and arbitration

For EACH policy provide:
1. title: Short, clear title (e.g., "Account Freezing", "Forced Liquidation")
2. section: One of: account, trading, dispute, liability, fees, privacy, security, regulatory, other
3. category: "good" (user-friendly), "bad" (risky/concerning), or "common" (standard practice)
4. summary: 1-2 sentence plain English explanation of what this means for users
5. details: More detailed explanation with specific quotes from the terms
6. impact: "critical", "high", "medium", or "low"

Focus on ACTIONABLE policies that affect user money, rights, and safety. Skip generic warnings.

Return valid JSON array.`,
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

async function createExchangeInSanity(exchange: any, policies: any[]) {
  console.log(`\n📝 Creating ${exchange.name} in Sanity...`);

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
    _type: 'cex',
    name: exchange.name,
    slug: {
      _type: 'slug',
      current: exchange.slug,
    },
    description: `Cryptocurrency exchange offering trading services. Founded in ${exchange.founded}.`,
    founded: exchange.founded,
    jurisdiction: exchange.jurisdiction,
    termsUrl: exchange.termsUrl,
    overallRating,
    riskScore,
    quickSummary: `${exchange.name} is a cryptocurrency exchange with ${policies.length} analyzed policies. Risk score: ${riskScore}/10.`,
    policies: formattedPolicies,
    featured: true,
    displayOrder: 999,
  };

  const result = await writeClient.create(doc);
  console.log(`✅ Created ${exchange.name}: ${result._id}`);
  return result;
}

async function main() {
  console.log('🚀 Recreating BitGo, Coinbase, and Huobi with policy analysis\n');

  for (const exchange of exchanges) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing: ${exchange.name}`);
      console.log('='.repeat(60));

      // Fetch terms
      const termsText = await fetchTerms(exchange.termsUrl);

      if (!termsText || termsText.length < 500) {
        console.log(`⚠️  Terms too short or failed to fetch for ${exchange.name}, skipping...`);
        continue;
      }

      console.log(`📄 Fetched ${termsText.length} characters`);

      // Analyze with AI
      const policies = await analyzeTerms(exchange.name, termsText);
      console.log(`✅ Extracted ${policies.length} policies`);

      // Create in Sanity
      await createExchangeInSanity(exchange, policies);

      // Brief delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error: any) {
      console.error(`\n❌ Error processing ${exchange.name}:`, error.message);
    }
  }

  console.log('\n\n✨ Done! All exchanges recreated.\n');
}

main().catch(console.error);
