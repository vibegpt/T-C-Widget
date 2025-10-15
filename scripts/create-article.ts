import { createClient } from 'next-sanity';
import crypto from 'crypto';

const writeClient = createClient({
  projectId: 'c15x4s4x',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

function toPortableText(paragraphs: string[]) {
  return paragraphs.map(text => ({
    _key: crypto.randomBytes(12).toString('hex'),
    _type: 'block',
    style: 'normal',
    children: [{
      _key: crypto.randomBytes(12).toString('hex'),
      _type: 'span',
      text,
      marks: []
    }],
    markDefs: [],
  }));
}

// Example article template - customize this!
const article = {
  _type: 'article',
  title: 'How Binance\'s Oracle Failure Cost Traders $600M',
  slug: {
    _type: 'slug',
    current: 'binance-oracle-failure-600m-loss',
  },
  excerpt: 'A deep dive into the January 2025 USDe depeg that exposed critical flaws in centralized exchange oracle design and risk management systems.',
  content: toPortableText([
    'On January 10, 2025, Binance users experienced one of the most dramatic oracle failures in crypto history. USDe, Ethena\'s synthetic stablecoin, crashed from $1.00 to $0.65 in just 30 minutes - but only on Binance.',

    'The key insight: This wasn\'t a real depeg. On Curve, USDe traded at $0.97. On Bybit, it was $0.95. Ethena\'s on-chain Proof of Reserves showed full collateralization throughout the event. The crash existed solely within Binance\'s pricing system.',

    'The root cause was Binance\'s reliance on a single-source oracle. Instead of aggregating prices from multiple venues like Chainlink or using Time-Weighted Average Price (TWAP) from decentralized exchanges, Binance priced USDe exclusively from its own order book.',

    'When a $90M sell order hit Binance\'s thin USDe order book (only $50M depth, representing just 5% of global volume), the price crashed. The oracle immediately fed this crashed price to Binance\'s Unified Account system, which revalued all accounts holding USDe as collateral.',

    'The cascade was brutal: accounts fell below the 110% maintenance margin requirement, triggering forced liquidations. $600M in positions were closed, affecting 1.6 million traders. Total market value lost: $19 billion.',

    'What makes this particularly egregious is that Binance also froze USDe withdrawals during the crash. This prevented arbitrageurs from buying cheap USDe on Binance and selling it at the true market price elsewhere - the exact mechanism that should have corrected the pricing error.',

    'The legal framework protecting Binance is extensive. Users agreed to terms stating the platform can determine asset valuations "at its discretion," that it\'s "not liable for pricing errors," and that withdrawals may be suspended during "market anomalies."',

    'Binance eventually paid $283M in compensation, but framed it as "goodwill" rather than legal obligation. The company announced oracle improvements scheduled for October 14, 2025, including external oracle integration and real-time Proof of Reserve checks.',

    'For traders, the lessons are clear: understand your exchange\'s oracle design, maintain extra margin during volatility, diversify across platforms, and never assume stop-losses will execute during extreme events. When a platform operates as a "walled garden" with single-source pricing, you face platform-specific risks that don\'t exist in the broader market.',
  ]),
  publishedDate: '2025-01-15',
  featured: true,
  published: true,
  // Note: You'll need to create a category first or reference an existing one
  // category: { _ref: 'category-id-here' }
};

async function createArticle() {
  console.log('🚀 Creating article in Sanity\n');

  try {
    const result = await writeClient.create(article);
    console.log(`✅ Article created successfully!`);
    console.log(`   ID: ${result._id}`);
    console.log(`   Title: ${article.title}`);
    console.log(`   Slug: ${article.slug.current}`);
    console.log(`   URL: /crypto/news/${article.slug.current}\n`);
  } catch (error: any) {
    console.error('❌ Error creating article:', error.message);
    console.log('\nNote: You may need to create a category first.');
  }
}

createArticle().catch(console.error);
