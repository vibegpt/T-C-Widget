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

const newPolicies = [
  {
    title: 'Order Execution Failures During Volatility',
    section: 'trading',
    category: 'bad',
    summary: 'During volatile markets, orders may not execute at all due to "shallow market depth" and insufficient counterparty liquidity. KuCoin states this is "a normal phenomenon."',
    details: 'According to KuCoin VIP support: "When a large number of users place orders simultaneously, there may be a temporary shortage of two-way market liquidity. Under these exceptional circumstances, the exchange strictly adheres to the market\'s standard matching principle of \'price first, time first\' to complete trade matching. Because the counterparty\'s valid order volume cannot cover the large number of orders, some trade requests may not be fully executed or may not be executed at all. This is a normal phenomenon during volatile markets." This means during high volatility, your orders may simply fail with no recourse.',
    impact: 'critical',
  },
  {
    title: 'Shallow Market Depth Auto-Cancellation',
    section: 'trading',
    category: 'bad',
    summary: 'KuCoin automatically cancels limit orders or partially fills market orders if market depth is too shallow, preventing execution even if you want to accept slippage.',
    details: 'KuCoin documentation states: "If a spot trading market order/limit order can be directly matched with an order in the current order book, the system will judge whether deviation between the price corresponding to the transaction depth and the spread exceeds the threshold value. If exceeded, for limit orders, the order will be directly cancelled; if it is a market order, the system will partially execute the order with the execution limit being the order size within the price range corresponding to the threshold value, and the remaining orders will not be filled." This protection mechanism prevents slippage but also prevents order execution during volatile markets.',
    impact: 'critical',
  },
  {
    title: 'No Liability for Order Execution Failures',
    section: 'liability',
    category: 'bad',
    summary: 'KuCoin explicitly disclaims all liability for liquidity issues and order execution failures, even during critical market moments.',
    details: 'KuCoin\'s terms state: "KuCoin is not and shall not be responsible or liable for the transferability, liquidity and/or availability of any Digital Tokens." Combined with their general limitation of liability clause, users cannot hold KuCoin legally responsible when orders fail to execute during volatile markets, even if this results in significant losses (such as inability to close leveraged positions).',
    impact: 'critical',
  },
  {
    title: 'Stop-Loss Orders May Not Execute',
    section: 'trading',
    category: 'bad',
    summary: 'Protective orders like stop-losses may fail to execute during market volatility, leaving leveraged positions unprotected.',
    details: 'KuCoin\'s risk disclosure states: "The placing of certain orders (e.g. \'stop-limit\' orders) which are intended to limit losses may not be effective because market conditions may make it impossible to execute such orders." This is particularly dangerous for leveraged traders who rely on stop-losses to prevent liquidation. During volatile markets when protection is most needed, these orders may completely fail to execute.',
    impact: 'critical',
  },
  {
    title: 'Impossible to Liquidate Positions During Volatility',
    section: 'trading',
    category: 'bad',
    summary: 'KuCoin warns that market conditions may make it "difficult or impossible" to liquidate or offset positions, trapping users in losing trades.',
    details: 'Risk disclosure states: "Market conditions (e.g. illiquidity) or the operation of market rules may increase the risk of loss by making it difficult or impossible to effect transactions or liquidate/offset positions." This means during extreme volatility, you may be completely unable to exit positions, with no recourse against KuCoin. For leveraged traders, this can result in forced liquidation at catastrophic prices.',
    impact: 'critical',
  },
  {
    title: 'Trading Suspension During Liquidity Events',
    section: 'trading',
    category: 'bad',
    summary: 'KuCoin can suspend trading entirely if liquidity drops significantly, preventing users from managing positions.',
    details: 'According to KuCoin: "If there is a significant reduction or cessation in liquidity, KuCoin may suspend trading, and as a result, you may not be able to place trades or close any open positions." This gives KuCoin broad discretion to halt trading during the exact moments when users most need to manage risk. Once suspended, you are locked into whatever position you hold with no ability to exit.',
    impact: 'critical',
  },
  {
    title: 'Price-Time Priority Matching',
    section: 'trading',
    category: 'common',
    summary: 'KuCoin uses "price first, time first" matching, meaning during high volume, your order may be behind thousands of others and never execute.',
    details: 'During volatile markets with high order volume, KuCoin\'s matching engine processes orders based on price priority first, then time priority. This means if thousands of users submit orders simultaneously at similar prices, only the earliest orders execute. Your order may sit in queue indefinitely while counterparty liquidity is exhausted by earlier orders, resulting in non-execution even though you submitted an order.',
    impact: 'high',
  },
];

async function addPoliciesToKuCoin() {
  console.log('🚀 Adding order execution policies to KuCoin\n');

  // Fetch current KuCoin document
  const query = `*[_type == "cex" && name == "KuCoin"][0]{
    _id,
    policies
  }`;

  const kucoin = await writeClient.fetch(query);

  if (!kucoin) {
    console.error('❌ KuCoin not found in Sanity');
    return;
  }

  console.log(`📊 Current policies: ${kucoin.policies?.length || 0}\n`);

  const formattedPolicies = newPolicies.map((policy: any) => ({
    _type: 'policyItem',
    section: policy.section,
    title: policy.title,
    category: policy.category,
    summary: policy.summary,
    details: convertToPortableText(policy.details),
    impact: policy.impact,
  }));

  // Append to existing policies
  const updatedPolicies = [...(kucoin.policies || []), ...formattedPolicies];

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
    .patch(kucoin._id)
    .set({
      policies: updatedPolicies,
      riskScore,
      overallRating,
    })
    .commit();

  console.log(`✅ Updated KuCoin with ${updatedPolicies.length} total policies`);
  console.log(`   New Risk Score: ${riskScore}/10 (${overallRating})\n`);

  console.log('New policies added:\n');
  formattedPolicies.forEach((p: any) => {
    console.log(`   🔴 ${p.title} (${p.impact})`);
  });

  console.log('\n✨ Done!\n');
}

addPoliciesToKuCoin().catch(console.error);
