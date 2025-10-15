/**
 * Crypto Exchange Terms Analyzer
 * Fetches, parses, and analyzes terms from cryptocurrency exchanges
 */

import { fetchAndExtract } from '@/lib/extractHtml';
import { parseTerms } from '@/lib/parseTerms';
import crypto from 'crypto';

export interface ExchangeConfig {
  name: string;
  slug: string;
  type: 'cex' | 'dex' | 'hybrid';
  websiteUrl: string;
  termsUrl: string;
  jurisdiction?: string[];
  logoUrl?: string;
}

export interface ExchangeRisk {
  key: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  summary: string;
  quote?: string;
  appliesTo: string[];
}

export interface ExchangeAnalysis {
  exchange: ExchangeConfig;
  version: number;
  contentHash: string;
  rawText: string;
  parsedSummary: ReturnType<typeof parseTerms>['parsed'];
  risks: {
    hasArbitration: boolean;
    hasClassActionWaiver: boolean;
    hasTerminationAtWill: boolean;
    hasAutoDeleveraging: boolean;
    hasForcedLiquidation: boolean;
    liabilityCap: number | null;
    optOutDays: number | null;
  };
  identifiedRisks: ExchangeRisk[];
  keyFindings: string[];
  fetchedAt: Date;
}

// Major exchanges to analyze
export const MAJOR_EXCHANGES: ExchangeConfig[] = [
  {
    name: 'Binance',
    slug: 'binance',
    type: 'cex',
    websiteUrl: 'https://www.binance.com',
    termsUrl: 'https://www.binance.com/en/terms',
    jurisdiction: ['Cayman Islands'],
  },
  {
    name: 'Coinbase',
    slug: 'coinbase',
    type: 'cex',
    websiteUrl: 'https://www.coinbase.com',
    termsUrl: 'https://www.coinbase.com/legal/user_agreement',
    jurisdiction: ['United States'],
  },
  {
    name: 'Kraken',
    slug: 'kraken',
    type: 'cex',
    websiteUrl: 'https://www.kraken.com',
    termsUrl: 'https://www.kraken.com/legal/terms',
    jurisdiction: ['United States'],
  },
  {
    name: 'Bybit',
    slug: 'bybit',
    type: 'cex',
    websiteUrl: 'https://www.bybit.com',
    termsUrl: 'https://www.bybit.com/en-US/terms-service',
    jurisdiction: ['British Virgin Islands'],
  },
  {
    name: 'OKX',
    slug: 'okx',
    type: 'cex',
    websiteUrl: 'https://www.okx.com',
    termsUrl: 'https://www.okx.com/support/hc/en-us/articles/360026137832',
    jurisdiction: ['Seychelles'],
  },
  {
    name: 'Hyperliquid',
    slug: 'hyperliquid',
    type: 'dex',
    websiteUrl: 'https://hyperliquid.xyz',
    termsUrl: 'https://hyperliquid.xyz/terms',
    jurisdiction: ['Decentralized'],
  },
  {
    name: 'dYdX',
    slug: 'dydx',
    type: 'dex',
    websiteUrl: 'https://dydx.trade',
    termsUrl: 'https://dydx.trade/terms',
    jurisdiction: ['Decentralized'],
  },
  {
    name: 'Bitfinex',
    slug: 'bitfinex',
    type: 'cex',
    websiteUrl: 'https://www.bitfinex.com',
    termsUrl: 'https://www.bitfinex.com/legal/terms',
    jurisdiction: ['British Virgin Islands'],
  },
  {
    name: 'KuCoin',
    slug: 'kucoin',
    type: 'cex',
    websiteUrl: 'https://www.kucoin.com',
    termsUrl: 'https://www.kucoin.com/terms',
    jurisdiction: ['Seychelles'],
  },
  {
    name: 'Gemini',
    slug: 'gemini',
    type: 'cex',
    websiteUrl: 'https://www.gemini.com',
    termsUrl: 'https://www.gemini.com/legal/user-agreement',
    jurisdiction: ['United States'],
  },
];

/**
 * Generate SHA-256 hash of content for change detection
 */
function hashContent(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Detect crypto-specific risks in the text
 */
function detectCryptoRisks(text: string, parsed: ReturnType<typeof parseTerms>['parsed']): ExchangeRisk[] {
  const risks: ExchangeRisk[] = [];
  const lowerText = text.toLowerCase();

  // Auto-Deleveraging (ADL)
  if (lowerText.includes('auto-deleverage') || lowerText.includes('adl') ||
      (lowerText.includes('reduce') && lowerText.includes('position') && lowerText.includes('profit'))) {
    risks.push({
      key: 'auto_deleveraging',
      title: 'Auto-Deleveraging (ADL)',
      severity: 'critical',
      summary: 'Exchange may automatically close your profitable positions during high volatility to cover losses from other traders',
      appliesTo: ['margin', 'futures'],
    });
  }

  // Forced Liquidation
  if (lowerText.includes('liquidat') || lowerText.includes('margin call')) {
    risks.push({
      key: 'forced_liquidation',
      title: 'Forced Liquidation',
      severity: 'critical',
      summary: 'Your positions can be forcibly closed if margin requirements are not met',
      appliesTo: ['margin', 'futures'],
    });
  }

  // Trading Halt
  if (lowerText.includes('halt') || lowerText.includes('suspend trading') ||
      (lowerText.includes('suspend') && lowerText.includes('withdraw'))) {
    risks.push({
      key: 'trading_halt',
      title: 'Trading Halt Authority',
      severity: 'high',
      summary: 'Exchange can halt trading or freeze withdrawals during periods of high volatility',
      appliesTo: ['spot', 'margin', 'futures'],
    });
  }

  // Socialized Losses
  if (lowerText.includes('socializ') || lowerText.includes('insurance fund')) {
    risks.push({
      key: 'socialized_losses',
      title: 'Socialized Loss Risk',
      severity: 'high',
      summary: 'Trader losses may be shared across all users if insurance fund is depleted',
      appliesTo: ['margin', 'futures'],
    });
  }

  // Fund Security
  if (lowerText.includes('custody') || lowerText.includes('cold storage') ||
      lowerText.includes('insurance')) {
    risks.push({
      key: 'fund_security',
      title: 'Fund Protection',
      severity: 'critical',
      summary: 'Information about how your funds are secured and whether they are insured',
      appliesTo: ['spot', 'margin', 'futures'],
    });
  }

  return risks;
}

/**
 * Analyze a single exchange's terms
 */
export async function analyzeExchange(config: ExchangeConfig): Promise<ExchangeAnalysis> {
  try {
    console.log(`Fetching terms for ${config.name}...`);

    // Fetch and extract content
    const extracted = await fetchAndExtract(config.termsUrl);

    // Parse with existing parser
    const { parsed, risks } = parseTerms(extracted.text, {
      productHint: config.name,
    });

    // Generate content hash
    const contentHash = hashContent(extracted.text);

    // Detect crypto-specific risks
    const cryptoRisks = detectCryptoRisks(extracted.text, parsed);

    // Determine if auto-deleveraging is mentioned
    const hasAutoDeleveraging = cryptoRisks.some(r => r.key === 'auto_deleveraging');
    const hasForcedLiquidation = cryptoRisks.some(r => r.key === 'forced_liquidation');

    // Build key findings
    const keyFindings: string[] = [];

    if (hasAutoDeleveraging) {
      keyFindings.push('⚠️ CRITICAL: Auto-Deleveraging enabled - profitable positions may be closed');
    }

    if (hasForcedLiquidation) {
      keyFindings.push('⚠️ CRITICAL: Forced liquidation with potentially unfavorable pricing');
    }

    if (risks.arbitration) {
      keyFindings.push('⚠️ Binding arbitration required - limited legal recourse');
    }

    if (risks.classActionWaiver) {
      keyFindings.push('⚠️ Class action lawsuits waived');
    }

    if (risks.liabilityCap !== null) {
      keyFindings.push(`⚠️ Liability capped at $${risks.liabilityCap.toLocaleString()}`);
    }

    if (risks.terminationAtWill) {
      keyFindings.push('⚠️ Account can be terminated at any time');
    }

    if (cryptoRisks.some(r => r.key === 'trading_halt')) {
      keyFindings.push('⚠️ Trading and withdrawals can be halted during volatility');
    }

    return {
      exchange: config,
      version: 1, // Will be incremented when terms change
      contentHash,
      rawText: extracted.text,
      parsedSummary: parsed,
      risks: {
        hasArbitration: risks.arbitration,
        hasClassActionWaiver: risks.classActionWaiver,
        hasTerminationAtWill: risks.terminationAtWill,
        hasAutoDeleveraging,
        hasForcedLiquidation,
        liabilityCap: risks.liabilityCap,
        optOutDays: risks.optOutDays,
      },
      identifiedRisks: cryptoRisks,
      keyFindings,
      fetchedAt: new Date(),
    };
  } catch (error) {
    console.error(`Error analyzing ${config.name}:`, error);
    throw error;
  }
}

/**
 * Analyze multiple exchanges in parallel
 */
export async function analyzeExchanges(configs: ExchangeConfig[]): Promise<ExchangeAnalysis[]> {
  const results = await Promise.allSettled(
    configs.map(config => analyzeExchange(config))
  );

  return results
    .filter((result): result is PromiseFulfilledResult<ExchangeAnalysis> => result.status === 'fulfilled')
    .map(result => result.value);
}

/**
 * Calculate overall risk score (0-100, higher is riskier)
 */
export function calculateRiskScore(analysis: ExchangeAnalysis): number {
  let score = 0;

  // Critical risks (20 points each)
  if (analysis.risks.hasAutoDeleveraging) score += 20;
  if (analysis.risks.hasForcedLiquidation) score += 20;

  // High risks (15 points each)
  if (analysis.risks.hasArbitration) score += 15;
  if (analysis.risks.hasClassActionWaiver) score += 15;

  // Medium risks (10 points each)
  if (analysis.risks.hasTerminationAtWill) score += 10;
  if (analysis.risks.liabilityCap !== null) score += 10;

  // Additional crypto-specific risks (5 points each)
  const hasTradingHalt = analysis.identifiedRisks.some(r => r.key === 'trading_halt');
  const hasSocializedLosses = analysis.identifiedRisks.some(r => r.key === 'socialized_losses');

  if (hasTradingHalt) score += 5;
  if (hasSocializedLosses) score += 5;

  return Math.min(100, score);
}

/**
 * Get risk level label
 */
export function getRiskLevel(score: number): { level: string; color: string; description: string } {
  if (score >= 70) {
    return {
      level: 'Critical',
      color: 'red',
      description: 'Multiple severe risks identified. Review carefully before trading.',
    };
  } else if (score >= 50) {
    return {
      level: 'High',
      color: 'orange',
      description: 'Significant risks present. Understand terms before depositing funds.',
    };
  } else if (score >= 30) {
    return {
      level: 'Medium',
      color: 'yellow',
      description: 'Moderate risks typical of crypto exchanges.',
    };
  } else {
    return {
      level: 'Low',
      color: 'green',
      description: 'Relatively standard terms with fewer red flags.',
    };
  }
}
