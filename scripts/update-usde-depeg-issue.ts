import { createClient } from 'next-sanity';

const writeClient = createClient({
  projectId: 'c15x4s4x',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function updateUSDeDepegIssue() {
  console.log('🚀 Updating USDe Depegging issue with Binance example\n');

  // Fetch the stablecoin depegging issue
  const query = `*[_type == "marketIssue" && slug.current == "stablecoin-depegging"][0]{
    _id,
    realWorldExamples,
    relatedPlatforms
  }`;

  const issue = await writeClient.fetch(query);

  if (!issue) {
    console.error('❌ Stablecoin depegging issue not found');
    return;
  }

  // Add detailed Binance USDe example
  const binanceExample = {
    platform: 'Binance',
    platformType: 'cex',
    platformSlug: 'binance',
    date: '2025-01-10', // Late Friday night Beijing time, adjust as needed
    description: 'Binance\'s oracle failure caused USDe to crash from $1.00 to $0.65 in 30 minutes due to a $90M sell order. The platform used only its own order book for pricing (not multi-source oracles like Chainlink or TWAP). With only 5% of global USDe volume and thin order book depth ($50M), the price slippage was amplified. The oracle fed this crashed price to Binance\'s Unified Account system, triggering cascading liquidations of $600M affecting 1.6M traders. Binance froze withdrawals, preventing arbitrageurs from filling the liquidity gap. Meanwhile, on Curve and Bybit where multi-source oracles were used, USDe only dipped to $0.95-$0.97. The depeg was isolated to Binance\'s "oracle island." Ethena\'s on-chain Proof of Reserves showed collateral remained strong - this was not a true depeg but an oracle pricing failure.',
    userImpact: '$600M in liquidations, $19B in market value lost, users unable to withdraw or arbitrage due to frozen withdrawals and API failures',
    resolution: 'Binance paid $283M in user compensation and announced oracle changes for October 14, 2025: switching to external oracle with real-time Proof of Reserves, adding price floor protections, and implementing flash-crash filters.',
  };

  // Update Binance in related platforms to mark explicit terms
  const updatedPlatforms = issue.relatedPlatforms.map((platform: any) => {
    if (platform.platformName === 'Binance') {
      return { ...platform, hasExplicitTerms: true };
    }
    return platform;
  });

  // Replace the existing Binance example or add as first example
  const existingExamples = issue.realWorldExamples || [];
  const binanceExampleIndex = existingExamples.findIndex(
    (ex: any) => ex.platform === 'Binance'
  );

  let updatedExamples;
  if (binanceExampleIndex >= 0) {
    // Replace existing
    updatedExamples = [...existingExamples];
    updatedExamples[binanceExampleIndex] = binanceExample;
  } else {
    // Add as first example
    updatedExamples = [binanceExample, ...existingExamples];
  }

  await writeClient
    .patch(issue._id)
    .set({
      realWorldExamples: updatedExamples,
      relatedPlatforms: updatedPlatforms,
      lastUpdated: '2025-01-15',
    })
    .commit();

  console.log('✅ Updated Stablecoin Depegging issue with Binance USDe example\n');
  console.log('Details added:');
  console.log('  - USDe crash from $1.00 → $0.65');
  console.log('  - $600M in liquidations, 1.6M traders affected');
  console.log('  - Oracle island effect explained');
  console.log('  - Binance compensation: $283M');
  console.log('  - Scheduled oracle fix: Oct 14, 2025\n');
}

updateUSDeDepegIssue().catch(console.error);
