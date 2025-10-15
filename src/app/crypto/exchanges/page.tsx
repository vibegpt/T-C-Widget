import Link from "next/link";
import { DisclaimerBanner } from "@/components/crypto/DisclaimerBanner";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

interface Exchange {
  id: string;
  name: string;
  slug: string;
  type: 'cex' | 'dex' | 'hybrid';
  jurisdiction: string[];
  latest_term?: {
    has_arbitration: boolean;
    has_class_action_waiver: boolean;
    has_auto_deleveraging: boolean;
    has_forced_liquidation: boolean;
    liability_cap_amount: number | null;
    risk_score: number;
  };
}

async function getExchanges(): Promise<Exchange[]> {
  const { data, error } = await supabase
    .from('exchanges')
    .select(`
      id,
      name,
      slug,
      type,
      jurisdiction,
      exchange_terms (
        has_arbitration,
        has_class_action_waiver,
        has_auto_deleveraging,
        has_forced_liquidation,
        liability_cap_amount
      )
    `)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching exchanges:', error);
    return [];
  }

  // Calculate risk scores and format data
  return (data || []).map((exchange: any) => {
    const latestTerm = exchange.exchange_terms?.[0];

    let riskScore = 0;
    if (latestTerm) {
      if (latestTerm.has_auto_deleveraging) riskScore += 20;
      if (latestTerm.has_forced_liquidation) riskScore += 20;
      if (latestTerm.has_arbitration) riskScore += 15;
      if (latestTerm.has_class_action_waiver) riskScore += 15;
      if (latestTerm.liability_cap_amount !== null) riskScore += 10;
    }

    return {
      id: exchange.id,
      name: exchange.name,
      slug: exchange.slug,
      type: exchange.type,
      jurisdiction: exchange.jurisdiction || [],
      latest_term: latestTerm ? {
        ...latestTerm,
        risk_score: riskScore,
      } : undefined,
    };
  });
}

function getRiskBadge(score: number | undefined) {
  if (!score) return <span className="text-gray-400 text-sm">N/A</span>;

  if (score >= 70) {
    return <span className="px-3 py-1 bg-red-900/30 text-red-400 rounded-full text-sm font-semibold border border-red-500/30">{score}/100</span>;
  } else if (score >= 50) {
    return <span className="px-3 py-1 bg-orange-900/30 text-orange-400 rounded-full text-sm font-semibold border border-orange-500/30">{score}/100</span>;
  } else if (score >= 30) {
    return <span className="px-3 py-1 bg-yellow-900/30 text-yellow-400 rounded-full text-sm font-semibold border border-yellow-500/30">{score}/100</span>;
  } else {
    return <span className="px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-sm font-semibold border border-green-500/30">{score}/100</span>;
  }
}

export default async function ExchangesPage() {
  const exchanges = await getExchanges();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <DisclaimerBanner />

      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 mt-8">
          <Link href="/crypto" className="text-blue-400 hover:text-blue-300 mb-4 inline-block transition-colors">
            ← Back to Home
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-4">
            Exchange Comparison
          </h1>
          <p className="text-xl text-gray-300">
            Compare policies and trader protections across major cryptocurrency exchanges
          </p>
        </div>

        {/* Legend */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6 backdrop-blur-sm">
          <h3 className="font-semibold text-white mb-2">Legend:</h3>
          <div className="flex flex-wrap gap-4 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-xl">●</span>
              <span>Policy Active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-xl">○</span>
              <span>Policy Not Found</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-xl">◐</span>
              <span>Partial/Conditional</span>
            </div>
          </div>
        </div>

        {/* Exchanges Table */}
        {exchanges.length === 0 ? (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-8 text-center backdrop-blur-sm">
            <p className="text-yellow-400 font-medium mb-2">
              No exchange data available yet
            </p>
            <p className="text-yellow-500/70 text-sm">
              Run the data fetch script to populate the database with exchange terms
            </p>
          </div>
        ) : (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50 border-b-2 border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-blue-400">Exchange</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-blue-400">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-blue-400">Jurisdiction</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-blue-400">ADL</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-blue-400">Liquidation</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-blue-400">Arbitration</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-blue-400">Class Action</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-blue-400">Liability Cap</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-blue-400">Risk Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {exchanges.map((exchange) => (
                    <tr key={exchange.id} className="hover:bg-gray-900/30 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/crypto/exchanges/${exchange.slug}`}
                          className="font-medium text-white hover:text-blue-400 transition-colors"
                        >
                          {exchange.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs font-medium uppercase">
                          {exchange.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {exchange.jurisdiction.join(', ') || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {exchange.latest_term?.has_auto_deleveraging ? (
                          <span className="text-red-400 text-xl">●</span>
                        ) : (
                          <span className="text-green-400 text-xl">○</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {exchange.latest_term?.has_forced_liquidation ? (
                          <span className="text-red-400 text-xl">●</span>
                        ) : (
                          <span className="text-green-400 text-xl">○</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {exchange.latest_term?.has_arbitration ? (
                          <span className="text-red-400 text-xl">●</span>
                        ) : (
                          <span className="text-green-400 text-xl">○</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {exchange.latest_term?.has_class_action_waiver ? (
                          <span className="text-red-400 text-xl">●</span>
                        ) : (
                          <span className="text-green-400 text-xl">○</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {exchange.latest_term?.liability_cap_amount !== null && exchange.latest_term?.liability_cap_amount !== undefined
                          ? `$${exchange.latest_term.liability_cap_amount.toLocaleString()}`
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getRiskBadge(exchange.latest_term?.risk_score)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 backdrop-blur-sm hover:border-blue-500/50 transition-all">
          <h3 className="font-semibold text-blue-400 mb-2 text-lg">💡 Understanding Risk Scores</h3>
          <p className="text-gray-300 text-sm mb-3">
            Risk scores are calculated based on policies that limit trader protections:
          </p>
          <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
            <li><strong className="text-white">Critical Risks</strong> (20 pts each): Auto-Deleveraging, Forced Liquidation</li>
            <li><strong className="text-white">High Risks</strong> (15 pts each): Mandatory Arbitration, Class Action Waiver</li>
            <li><strong className="text-white">Medium Risks</strong> (10 pts each): Termination at Will, Liability Caps</li>
          </ul>
          <p className="text-gray-300 text-sm mt-3">
            Higher scores indicate more restrictive terms and fewer trader protections.
          </p>
        </div>
      </div>
    </div>
  );
}
