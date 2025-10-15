import { createClient } from 'next-sanity';

const writeClient = createClient({
  projectId: 'c15x4s4x',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

function toPortableText(text: string) {
  return [
    {
      _type: 'block',
      style: 'normal',
      children: [{ _type: 'span', text, marks: [] }],
      markDefs: [],
    },
  ];
}

function toPortableTextWithParagraphs(paragraphs: string[]) {
  return paragraphs.map(text => ({
    _type: 'block',
    style: 'normal',
    children: [{ _type: 'span', text, marks: [] }],
    markDefs: [],
  }));
}

const marketIssues = [
  {
    _type: 'marketIssue',
    title: 'Order Execution Failures During Volatility',
    slug: { _type: 'slug', current: 'order-execution-failures' },
    category: 'liquidity',
    severity: 'critical',
    summary: 'During volatile markets with high trading volume, exchanges may fail to execute your orders entirely due to "shallow market depth" - insufficient counterparty liquidity. This can prevent you from opening positions, closing positions, or executing stop-losses, even when the price reaches your target.',
    whatHappens: toPortableTextWithParagraphs([
      'When market volatility spikes and thousands of users attempt to trade simultaneously, the exchange\'s order book can become severely imbalanced. If you submit an order during this period, you may experience:',
      '• Your order sits in the queue but never executes',
      '• Market orders get rejected entirely with "insufficient liquidity" errors',
      '• Limit orders are automatically cancelled by the system',
      '• Partial fills where only a small portion of your order executes',
      '• Stop-loss orders completely fail to trigger, leaving positions unprotected',
      'For leveraged traders, this is catastrophic - you cannot close positions or protect yourself from liquidation when you need it most.',
    ]),
    whyItHappens: toPortableTextWithParagraphs([
      'Centralized exchanges operate on an order book model - they match buyers with sellers. They don\'t create liquidity themselves; they only facilitate trades between users.',
      'During extreme volatility:',
      '1. Market makers and liquidity providers pull their orders to avoid losses',
      '2. Order books become "shallow" with very few orders at each price level',
      '3. Panic causes one-sided markets (everyone wants to buy or everyone wants to sell)',
      '4. The exchange\'s matching engine uses "price first, time first" priority',
      '5. Your order may be behind thousands of others in the queue',
      '6. By the time your order reaches the front, all counterparty liquidity is exhausted',
      'The exchange literally has no one to match your order against, so it cannot execute.',
    ]),
    legalFramework: toPortableTextWithParagraphs([
      'Exchanges protect themselves from liability for this issue through several terms:',
      '1. Counterparty Risk Disclaimers: "Users bear the risk of counterparty defaults, as [Exchange] does not guarantee the completion of trades"',
      '2. Liquidity Limitations: "Under certain market conditions, you may find it difficult or impossible to buy or sell a Digital Token"',
      '3. No Liability Clauses: "[Exchange] is not and shall not be responsible or liable for the transferability, liquidity and/or availability of any Digital Tokens"',
      '4. Liability Waivers: "Users waive their rights to claim against [Exchange] for risks associated with trading"',
      '5. Stop-Loss Disclaimers: "The placing of certain orders (e.g. \'stop-limit\' orders) which are intended to limit losses may not be effective because market conditions may make it impossible to execute such orders"',
      'By accepting the Terms of Service, you\'ve agreed that order execution failures during volatility are YOUR risk, not the exchange\'s liability.',
    ]),
    realWorldExamples: [
      {
        platform: 'KuCoin',
        platformType: 'cex',
        platformSlug: 'kucoin',
        date: '2025-01-15',
        description: 'VIP user reported that during a period of extreme market volatility, multiple opening and closing orders failed to execute. KuCoin support responded: "Due to the shallow market depth, some of your opening and closing orders failed...When a large number of users place orders simultaneously, there may be a temporary shortage of two-way market liquidity. Because the counterparty\'s valid order volume cannot cover the large number of orders, some trade requests may not be fully executed or may not be executed at all. This is a normal phenomenon during volatile markets."',
        userImpact: 'Unable to open or close positions during critical price movements',
        resolution: 'No compensation provided. KuCoin stated this is covered by their terms of service as an acknowledged user risk.',
      },
    ],
    protectYourself: toPortableTextWithParagraphs([
      '1. Check Order Book Depth: Before placing large orders, examine the order book. Thin books with few orders = high execution risk.',
      '2. Avoid Market Orders in Volatility: Market orders take whatever\'s available. During volatility, that might be nothing or catastrophic prices.',
      '3. Use Limit Orders with Realistic Prices: You have more control, but understand they still may not execute if no counterparty exists.',
      '4. Never Rely on Stop-Losses Alone: Exchanges explicitly state these may not execute. For leveraged positions, this means potential total loss.',
      '5. Trade on High-Liquidity Markets: Stick to major trading pairs with deep liquidity. Obscure pairs have minimal depth.',
      '6. Diversify Across Exchanges: If one exchange has shallow liquidity, another might not. Keep accounts on multiple platforms.',
      '7. Reduce Leverage: Lower leverage = more breathing room before liquidation. Don\'t depend on being able to exit during volatility.',
      '8. Pre-Position for Volatility: If you anticipate volatility, exit risky positions BEFORE it hits. Once it starts, you may be trapped.',
    ]),
    redFlags: [
      'Thin order books with large gaps between bid and ask',
      'Recent delisting announcements or regulatory news',
      'Low 24-hour trading volume on the pair',
      'Wide bid-ask spreads (indicates low liquidity)',
      'Exchange warnings about upcoming maintenance or upgrades',
      'Major market news or events (earnings, regulations, macro data)',
      'Rapid price movements with increasing volatility',
    ],
    relatedPlatforms: [
      {
        platformName: 'KuCoin',
        platformType: 'cex',
        platformSlug: 'kucoin',
        hasExplicitTerms: true,
      },
      {
        platformName: 'Binance',
        platformType: 'cex',
        platformSlug: 'binance',
        hasExplicitTerms: true,
      },
      {
        platformName: 'Coinbase',
        platformType: 'cex',
        platformSlug: 'coinbase',
        hasExplicitTerms: true,
      },
    ],
    lastUpdated: '2025-01-15',
    featured: true,
    displayOrder: 1,
  },

  {
    _type: 'marketIssue',
    title: 'Auto-Deleveraging (ADL) - Forced Position Closure',
    slug: { _type: 'slug', current: 'auto-deleveraging-adl' },
    category: 'liquidation',
    severity: 'critical',
    summary: 'Auto-Deleveraging (ADL) is a mechanism used by perpetual futures exchanges to close profitable positions when the insurance fund cannot cover losses from liquidations. Your winning trade can be forcibly closed at an unfavorable price without your consent, crystallizing opportunity cost losses.',
    whatHappens: toPortableTextWithParagraphs([
      'When ADL triggers on your position:',
      '• Your profitable position is forcibly closed by the exchange',
      '• You receive the current mark price (often worse than market)',
      '• You lose all potential future gains from that position',
      '• You may owe funding fees up until closure',
      '• You cannot prevent or opt-out of ADL',
      '• You typically receive only a notification AFTER it happens',
      'Example: You\'re long BTC at $40,000, price moves to $50,000 giving you nice profits. ADL triggers, forcing you out at $49,500. Price then moves to $60,000 - but you\'re not in the trade anymore.',
    ]),
    whyItHappens: toPortableTextWithParagraphs([
      'Perpetual futures contracts use an insurance fund to cover losses when traders get liquidated. Here\'s the process:',
      '1. Trader A holds a large leveraged position',
      '2. Market moves against them and they get liquidated',
      '3. The exchange tries to close their position at bankruptcy price',
      '4. If market is volatile, they may not get bankruptcy price',
      '5. The loss between liquidation price and bankruptcy price comes from the insurance fund',
      '6. If the insurance fund is depleted or insufficient:',
      '   → The exchange looks at all traders with profitable positions on the opposite side',
      '   → Those with the highest profit and highest leverage get "auto-deleveraged"',
      '   → Their positions are closed to cover the shortfall',
      'This socializes losses across profitable traders to keep the exchange solvent.',
    ]),
    legalFramework: toPortableTextWithParagraphs([
      'Exchanges explicitly allow ADL in their terms:',
      '1. "In the event of insufficient funds in the insurance fund to cover liquidation losses, the platform reserves the right to implement Auto-Deleveraging (ADL)"',
      '2. "Positions may be forcibly reduced or closed without prior notice to maintain system solvency"',
      '3. "Users acknowledge that profitable positions may be subject to auto-deleveraging during extreme market conditions"',
      '4. "The platform is not liable for opportunity costs or lost profits resulting from auto-deleveraging"',
      'ADL is framed as a necessary risk management tool. By trading perpetuals, you consent to having your positions closed at the exchange\'s discretion.',
    ]),
    realWorldExamples: [
      {
        platform: 'Hyperliquid',
        platformType: 'dex',
        platformSlug: 'hyperliquid',
        date: '2024-12-XX',
        description: 'Multiple users reported ADL events during high volatility periods on Hyperliquid. Profitable positions were forcibly closed to cover insurance fund shortfalls from mass liquidations.',
        userImpact: 'Traders lost opportunity cost as positions were closed before reaching profit targets',
        resolution: 'No compensation. ADL is an explicit feature of perpetual futures exchanges.',
      },
    ],
    protectYourself: toPortableTextWithParagraphs([
      '1. Monitor Your ADL Ranking: Most exchanges show an "ADL indicator" (usually 1-5 lights). Higher ranking = higher ADL risk.',
      '2. Reduce Leverage: Lower leverage = lower ADL priority. High leverage + high profit = first to get ADL\'d.',
      '3. Take Profits Incrementally: Don\'t let massive unrealized profits accumulate. Lock in gains periodically.',
      '4. Watch Insurance Fund Levels: Some exchanges publish insurance fund size. Depleting fund = ADL risk rising.',
      '5. Close Positions During Extreme Volatility: If market is violently moving and mass liquidations are happening, consider closing manually.',
      '6. Understand You Have No Control: ADL is automatic and cannot be prevented. Factor this into your risk management.',
      '7. Use Spot Markets for Long-Term Holds: If you want to hold without ADL risk, trade spot instead of perpetuals.',
      '8. Diversify Across Exchanges: Different exchanges have different ADL thresholds and insurance fund levels.',
    ]),
    redFlags: [
      'Your ADL indicator shows 4 or 5 bars (highest priority)',
      'Large unrealized profits on high leverage positions',
      'Massive liquidation events happening in the market',
      'Insurance fund announcements or alerts from the exchange',
      'Extreme volatility with large cascading liquidations',
      'One-sided market (everyone long or everyone short)',
      'Exchange warnings about system risk or margin requirements',
    ],
    relatedPlatforms: [
      {
        platformName: 'Hyperliquid',
        platformType: 'dex',
        platformSlug: 'hyperliquid',
        hasExplicitTerms: true,
      },
      {
        platformName: 'dYdX',
        platformType: 'dex',
        platformSlug: 'dydx',
        hasExplicitTerms: true,
      },
    ],
    lastUpdated: '2025-01-15',
    featured: true,
    displayOrder: 2,
  },

  {
    _type: 'marketIssue',
    title: 'Stablecoin Depegging - Price Oracle Failures',
    slug: { _type: 'slug', current: 'stablecoin-depegging' },
    category: 'pricing',
    severity: 'critical',
    summary: 'When stablecoins lose their $1.00 peg during market stress, exchanges may continue using $1.00 for margin calculations while the actual market price is much lower (e.g., $0.90). This can lead to unfair liquidations, prevented withdrawals, and losses even when your actual collateral should be sufficient.',
    whatHappens: toPortableTextWithParagraphs([
      'During a stablecoin depeg event:',
      '• The market price of USDT, USDC, or other stables drops below $1.00 (e.g., to $0.95)',
      '• The exchange\'s oracle may still value it at $1.00 for margin calculations',
      '• Your account shows adequate collateral based on $1.00 valuation',
      '• But if you try to withdraw or trade, you receive the market rate ($0.95)',
      '• In reverse: Your collateral is marked at $1.00 but you can only buy at $0.95, preventing liquidation escapes',
      '• Some exchanges freeze deposits/withdrawals during depegs',
      '• You may get liquidated based on oracle price even though market price would keep you solvent',
    ]),
    whyItHappens: toPortableTextWithParagraphs([
      'Stablecoins maintain their peg through various mechanisms (reserves, algorithms, arbitrage). During extreme stress, these mechanisms can break:',
      '1. Bank runs: Mass redemptions overwhelm the system',
      '2. Loss of confidence: News or rumors trigger panic selling',
      '3. Collateral issues: Underlying reserves become questionable',
      '4. Liquidity crunch: Not enough liquidity to absorb selling pressure',
      'Exchanges face a dilemma:',
      '• If they mark stablecoins at market price ($0.95), it triggers cascading liquidations',
      '• If they maintain $1.00 valuation, they create an inconsistency between margin calculations and actual value',
      '• Oracle delays: Price feeds may lag real-time market movements',
      'Different exchanges make different choices, creating cross-platform arbitrage issues and user confusion.',
    ]),
    legalFramework: toPortableTextWithParagraphs([
      'Exchanges protect themselves through:',
      '1. Oracle Discretion: "The platform reserves the right to determine asset valuations using its selected price oracles"',
      '2. Valuation Changes: "Asset values may be adjusted at the platform\'s discretion during market anomalies"',
      '3. Withdrawal Suspensions: "The platform may suspend deposits or withdrawals of any asset to maintain system stability"',
      '4. No Liability for Depegs: "The platform is not responsible for changes in the value of stablecoins or other pegged assets"',
      '5. Emergency Powers: "During exceptional circumstances, the platform may take necessary measures including but not limited to: modifying margin requirements, suspending trading, or adjusting position valuations"',
      'Essentially, the exchange can change valuation rules mid-flight during a depeg, and you have no recourse.',
    ]),
    realWorldExamples: [
      {
        platform: 'Binance',
        platformType: 'cex',
        platformSlug: 'binance',
        date: '2023-03-XX',
        description: 'During the USDC depeg event in March 2023 when USDC dropped to ~$0.90, some exchanges continued using $1.00 for margin calculations while actual market trades executed at $0.90. This created scenarios where users appeared to have sufficient collateral but could not access it at the stated value.',
        userImpact: 'Users unable to prevent liquidations or withdraw at oracle-stated values',
        resolution: 'Exchanges eventually adjusted oracle prices, but many users had already been liquidated or trapped in positions.',
      },
    ],
    protectYourself: toPortableTextWithParagraphs([
      '1. Diversify Stablecoin Exposure: Don\'t hold all collateral in one stablecoin. Spread across USDT, USDC, DAI, etc.',
      '2. Monitor Peg Status: Use tools like CoinGecko to watch stablecoin prices. If depegging starts, act immediately.',
      '3. Maintain Extra Margin: Keep collateral ratio well above minimum. Give yourself room for oracle vs market discrepancies.',
      '4. Understand Your Exchange\'s Oracle: Know what price feed they use and how often it updates.',
      '5. Exit Leveraged Positions During Depeg Events: If you see a major stablecoin starting to depeg, close leveraged positions.',
      '6. Keep Some Native Assets: Hold some BTC, ETH, or exchange tokens as collateral - they don\'t have peg risk.',
      '7. Watch for News: Major stablecoin news (regulatory, reserve audits, bank issues) can trigger depegs.',
      '8. Have Exit Plans: Know how to quickly convert to other assets or move to other platforms.',
    ]),
    redFlags: [
      'Stablecoin trading below $0.99 on major exchanges',
      'Large redemption queues or delays from stablecoin issuer',
      'News about stablecoin reserves, banking issues, or regulatory problems',
      'Widening bid-ask spreads on stablecoin pairs',
      'Exchange announcements about suspending deposits/withdrawals',
      'Divergence between different exchanges\' stablecoin prices',
      'Unusual volume spikes on stablecoin trading pairs',
    ],
    relatedPlatforms: [
      {
        platformName: 'Binance',
        platformType: 'cex',
        platformSlug: 'binance',
        hasExplicitTerms: true,
      },
      {
        platformName: 'KuCoin',
        platformType: 'cex',
        platformSlug: 'kucoin',
        hasExplicitTerms: false,
      },
      {
        platformName: 'Hyperliquid',
        platformType: 'dex',
        platformSlug: 'hyperliquid',
        hasExplicitTerms: true,
      },
    ],
    lastUpdated: '2025-01-15',
    featured: true,
    displayOrder: 3,
  },
];

async function createMarketIssues() {
  console.log('🚀 Creating market issues in Sanity\n');

  for (const issue of marketIssues) {
    try {
      console.log(`Creating: ${issue.title}...`);
      const result = await writeClient.create(issue);
      console.log(`✅ Created: ${result._id}\n`);
    } catch (error: any) {
      console.error(`❌ Error creating ${issue.title}:`, error.message);
    }
  }

  console.log('\n✨ Done! All market issues created.\n');
}

createMarketIssues().catch(console.error);
