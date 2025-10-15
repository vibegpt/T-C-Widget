import { createClient } from 'next-sanity';

const writeClient = createClient({
  projectId: 'c15x4s4x',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

function convertToPortableText(text: string) {
  return [
    {
      _type: 'block',
      style: 'normal',
      children: [{ _type: 'span', text, marks: [] }],
    },
  ];
}

const oraclePolicies = [
  {
    title: 'Single-Source Oracle Pricing',
    section: 'trading',
    category: 'bad',
    summary: 'Binance uses only its own order book for asset pricing instead of multi-source oracles, creating "oracle islands" where price deviations on Binance can trigger liquidations even when the asset holds its value elsewhere.',
    details: 'During the January 2025 USDe event, Binance priced USDe solely from its own order book rather than using multi-source oracles like Chainlink, TWAP (Time-Weighted Average Price), or reference prices from major venues like Curve or Uniswap. With only 5% of global USDe trading volume, a $90M sell order caused Binance\'s USDe price to crash to $0.65 while other platforms showed $0.95-$1.00. This "oracle island effect" means Binance\'s internal pricing can deviate significantly from global market reality, triggering unfair liquidations.',
    impact: 'critical',
  },
  {
    title: 'Unified Account Liquidation Cascade',
    section: 'trading',
    category: 'bad',
    summary: 'Binance\'s Unified Account system allows using multiple assets as collateral with leverage, but when one asset\'s oracle price crashes, the entire account gets revalued instantly, triggering cascading liquidations across all positions.',
    details: 'The Unified Account pools assets like USDe, wBETH, and BNSOL for margin trading with up to 10x leverage. When the oracle marked USDe down 35%, all accounts holding USDe as collateral were revalued simultaneously. Accounts fell below the 110% maintenance margin threshold, triggering instant forced liquidations. This created a chain reaction: $600M in liquidations affecting 1.6M traders, with no time delay, no multi-source price confirmation, and no protection against flash crashes. Unlike DeFi protocols like Aave which use health factors and gradual liquidation, Binance\'s system uses instant thresholds.',
    impact: 'critical',
  },
  {
    title: 'Withdrawal Freezes During Oracle Failures',
    section: 'account',
    category: 'bad',
    summary: 'Binance can freeze deposits and withdrawals during pricing anomalies, preventing arbitrageurs from correcting price discrepancies and trapping users in positions during oracle failures.',
    details: 'During the USDe oracle failure, Binance froze USDe withdrawals for hours while the price remained crashed at $0.65. This prevented arbitrageurs from: 1) Withdrawing USDe from Binance to sell on other platforms at $0.95+, 2) Depositing USDe from other platforms to buy cheap on Binance, 3) Executing the arbitrage that normally corrects pricing errors. The withdrawal freeze also caused Binance\'s API to fail, meaning even automated market makers couldn\'t respond. Arbitrage that should take seconds took 30+ minutes. This turned a temporary liquidity gap into a prolonged crisis, with users trapped watching their positions get liquidated at unfair prices.',
    impact: 'critical',
  },
  {
    title: 'No Flash-Crash Protection on Oracles',
    section: 'trading',
    category: 'bad',
    summary: 'Binance\'s oracle system lacks flash-crash filters, circuit breakers, or sanity checks that would prevent extreme price deviations from triggering mass liquidations.',
    details: 'When USDe dropped 35% in minutes due to thin order book depth, Binance\'s oracle immediately fed this price to the liquidation engine with no safeguards: 1) No comparison to other major venues (Curve, Bybit, etc.), 2) No time delay or TWAP smoothing, 3) No circuit breaker to pause liquidations during extreme moves, 4) No reference to Ethena\'s on-chain Proof of Reserves which showed collateral was stable. The system treated a temporary liquidity gap as "truth" and liquidated positions based on a price that existed only on Binance, nowhere else in the market.',
    impact: 'critical',
  },
  {
    title: 'Insufficient Liquidity Isolation Between Venues',
    section: 'trading',
    category: 'bad',
    summary: 'Binance operates as a liquidity island with no real-time arbitrage links to DeFi protocols or other major venues, allowing price deviations to persist and compound.',
    details: 'Unlike venues that integrate with Ethena\'s primary dealer system (allowing instant mint/redeem arbitrage), Binance had no direct connection to on-chain USDe liquidity. Order book depth was only $50M versus billions in DeFi pools. When sell pressure hit, there was no mechanism for: 1) Market makers to quickly mint USDe on-chain and sell on Binance, 2) Users to redeem USDe from Ethena and buy on Binance, 3) Automated bridges to balance liquidity across venues. This "walled garden" approach means Binance users face platform-specific price risk that doesn\'t exist on more integrated platforms.',
    impact: 'high',
  },
  {
    title: 'Oracle Discretion and Unannounced Changes',
    section: 'trading',
    category: 'bad',
    summary: 'Binance reserves the right to determine asset valuations at its discretion, and announced an 8-day window between identifying the oracle flaw and implementing the fix, creating a known vulnerability period.',
    details: 'On October 6, Binance announced it would fix the oracle issue but wouldn\'t implement changes until October 14 - leaving an 8-day "window" where the known flaw remained exploitable. Terms likely state: "The platform reserves the right to determine asset valuations using its selected price oracles" and "Asset values may be adjusted at the platform\'s discretion during market anomalies." This gives Binance unilateral control over pricing without user input or transparent criteria. Users trading during the 8-day window knew the oracle was flawed but had no way to protect themselves except avoiding USDe entirely.',
    impact: 'high',
  },
  {
    title: 'No Liability for Oracle Failures',
    section: 'liability',
    category: 'bad',
    summary: 'Binance paid $283M in compensation for the USDe incident but likely disclaims legal liability for oracle failures in its terms, making future compensation discretionary rather than guaranteed.',
    details: 'While Binance provided $283M in user compensation (a positive move), this was likely presented as "goodwill" rather than legal obligation. Terms probably state: "The platform is not responsible for pricing errors, oracle failures, or changes in asset valuations" and "Users acknowledge that asset prices may differ across platforms and accept this risk." This means future oracle failures may not result in compensation - Binance can choose whether to compensate on a case-by-case basis. Users have no contractual right to compensation for oracle-induced liquidations.',
    impact: 'high',
  },
  {
    title: 'Lack of Proof of Reserve Integration',
    section: 'security',
    category: 'bad',
    summary: 'Binance\'s oracle does not check real-time Proof of Reserves for synthetic assets, meaning it can liquidate users based on price alone even when underlying collateral is provably solvent.',
    details: 'Throughout the USDe crash, Ethena\'s on-chain Proof of Reserves showed collateral remained strong - the protocol was fully backed and delta-hedged positions were stable. But Binance\'s oracle ignored this data entirely, liquidating users based purely on order book price. After the incident, Binance announced it would "add real-time PoR checked by firms like Chaos Labs" - admitting this critical safeguard was missing. Without PoR integration, synthetic stablecoins can appear to "depeg" on Binance while remaining perfectly solvent everywhere else.',
    impact: 'critical',
  },
];

async function addOraclePoliciesToBinance() {
  console.log('🚀 Adding oracle and pricing policies to Binance\n');

  const query = `*[_type == "cex" && name == "Binance"][0]{
    _id,
    policies
  }`;

  const binance = await writeClient.fetch(query);

  if (!binance) {
    console.error('❌ Binance not found in Sanity');
    return;
  }

  console.log(`📊 Current policies: ${binance.policies?.length || 0}\n`);

  const formattedPolicies = oraclePolicies.map((policy: any) => ({
    _type: 'policyItem',
    section: policy.section,
    title: policy.title,
    category: policy.category,
    summary: policy.summary,
    details: convertToPortableText(policy.details),
    impact: policy.impact,
  }));

  const updatedPolicies = [...(binance.policies || []), ...formattedPolicies];

  // Recalculate risk score
  const goodCount = updatedPolicies.filter((p: any) => p.category === 'good').length;
  const badCount = updatedPolicies.filter((p: any) => p.category === 'bad').length;
  const criticalCount = updatedPolicies.filter((p: any) => p.impact === 'critical').length;

  let riskScore = 5;
  if (badCount > goodCount) {
    riskScore = Math.min(10, 5 + badCount - goodCount + criticalCount);
  } else {
    riskScore = Math.max(1, 5 - (goodCount - badCount));
  }

  const overallRating = riskScore <= 3 ? 'good' : riskScore <= 6 ? 'mixed' : 'risky';

  await writeClient
    .patch(binance._id)
    .set({
      policies: updatedPolicies,
      riskScore,
      overallRating,
    })
    .commit();

  console.log(`✅ Updated Binance with ${updatedPolicies.length} total policies`);
  console.log(`   New Risk Score: ${riskScore}/10 (${overallRating})\n`);

  console.log('New policies added:\n');
  formattedPolicies.forEach((p: any) => {
    console.log(`   🔴 ${p.title} (${p.impact})`);
  });

  console.log('\n✨ Done!\n');
}

addOraclePoliciesToBinance().catch(console.error);
