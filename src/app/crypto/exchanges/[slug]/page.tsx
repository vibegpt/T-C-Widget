import Link from "next/link";
import { DisclaimerBanner, InlineDisclaimer } from "@/components/crypto/DisclaimerBanner";
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getExchange(slug: string) {
  const { data: exchange, error } = await supabase
    .from('exchanges')
    .select(`
      *,
      exchange_terms (
        *,
        exchange_risks (
          *,
          risk_categories (*)
        )
      )
    `)
    .eq('slug', slug)
    .single();

  if (error || !exchange) {
    return null;
  }

  return exchange;
}

function getRiskLevel(score: number) {
  if (score >= 70) return { level: 'Critical', color: 'red', bgColor: 'bg-red-900/20', textColor: 'text-red-400', borderColor: 'border-red-500/30' };
  if (score >= 50) return { level: 'High', color: 'orange', bgColor: 'bg-orange-900/20', textColor: 'text-orange-400', borderColor: 'border-orange-500/30' };
  if (score >= 30) return { level: 'Medium', color: 'yellow', bgColor: 'bg-yellow-900/20', textColor: 'text-yellow-400', borderColor: 'border-yellow-500/30' };
  return { level: 'Low', color: 'green', bgColor: 'bg-green-900/20', textColor: 'text-green-400', borderColor: 'border-green-500/30' };
}

export default async function ExchangeDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const exchange = await getExchange(slug);

  if (!exchange) {
    notFound();
  }

  const latestTerm = exchange.exchange_terms?.[0];

  // Calculate risk score
  let riskScore = 0;
  if (latestTerm) {
    if (latestTerm.has_auto_deleveraging) riskScore += 20;
    if (latestTerm.has_forced_liquidation) riskScore += 20;
    if (latestTerm.has_arbitration) riskScore += 15;
    if (latestTerm.has_class_action_waiver) riskScore += 15;
    if (latestTerm.has_termination_at_will) riskScore += 10;
    if (latestTerm.liability_cap_amount !== null) riskScore += 10;
  }

  const riskLevel = getRiskLevel(riskScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <DisclaimerBanner />

      <div className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6 mt-8">
          <Link href="/crypto" className="text-blue-400 hover:text-blue-300 transition-colors">Home</Link>
          <span className="mx-2 text-gray-600">/</span>
          <Link href="/crypto/exchanges" className="text-blue-400 hover:text-blue-300 transition-colors">Exchanges</Link>
          <span className="mx-2 text-gray-600">/</span>
          <span className="text-white">{exchange.name}</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-4">
            {exchange.name}
          </h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full font-medium uppercase">
              {exchange.type}
            </span>
            <span className="text-gray-400">
              {exchange.jurisdiction?.join(', ') || 'Unknown Jurisdiction'}
            </span>
          </div>
        </div>

        {/* Risk Score Card */}
        <div className={`${riskLevel.bgColor} ${riskLevel.borderColor} border-l-4 rounded-r-lg p-6 mb-8 backdrop-blur-sm`}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className={`text-3xl font-bold ${riskLevel.textColor} mb-2`}>
                Risk Score: {riskScore}/100
              </h2>
              <p className={`${riskLevel.textColor} font-semibold mb-3 text-lg`}>
                Risk Level: {riskLevel.level}
              </p>
              <p className="text-gray-300 text-sm">
                {riskLevel.level === 'Critical' && 'Multiple severe risks identified. Review carefully before trading.'}
                {riskLevel.level === 'High' && 'Significant risks present. Understand terms before depositing funds.'}
                {riskLevel.level === 'Medium' && 'Moderate risks typical of crypto exchanges.'}
                {riskLevel.level === 'Low' && 'Relatively standard terms with fewer red flags.'}
              </p>
            </div>
          </div>
        </div>

        {!latestTerm ? (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 backdrop-blur-sm">
            <p className="text-yellow-400">
              Terms analysis for {exchange.name} is not yet available. Check back soon.
            </p>
          </div>
        ) : (
          <>
            {/* Key Risks Summary */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg p-6 mb-8 backdrop-blur-sm hover:border-blue-500/50 transition-all">
              <h2 className="text-2xl font-bold text-white mb-6">
                Key Policies & Risks
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Auto-Deleveraging */}
                <div className={`p-4 rounded-lg border-2 ${latestTerm.has_auto_deleveraging ? 'bg-red-900/20 border-red-500/30' : 'bg-green-900/20 border-green-500/30'}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{latestTerm.has_auto_deleveraging ? '⚠️' : '✅'}</span>
                    <div>
                      <h3 className="font-semibold text-white mb-1">Auto-Deleveraging (ADL)</h3>
                      <p className="text-sm text-gray-300">
                        {latestTerm.has_auto_deleveraging
                          ? 'Exchange may automatically close your profitable positions during high volatility'
                          : 'No auto-deleveraging policy found in terms'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Forced Liquidation */}
                <div className={`p-4 rounded-lg border-2 ${latestTerm.has_forced_liquidation ? 'bg-red-900/20 border-red-500/30' : 'bg-green-900/20 border-green-500/30'}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{latestTerm.has_forced_liquidation ? '⚠️' : '✅'}</span>
                    <div>
                      <h3 className="font-semibold text-white mb-1">Forced Liquidation</h3>
                      <p className="text-sm text-gray-300">
                        {latestTerm.has_forced_liquidation
                          ? 'Positions can be forcibly closed if margin requirements are not met'
                          : 'No forced liquidation policy found in terms'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Arbitration */}
                <div className={`p-4 rounded-lg border-2 ${latestTerm.has_arbitration ? 'bg-orange-900/20 border-orange-500/30' : 'bg-green-900/20 border-green-500/30'}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{latestTerm.has_arbitration ? '⚠️' : '✅'}</span>
                    <div>
                      <h3 className="font-semibold text-white mb-1">Mandatory Arbitration</h3>
                      <p className="text-sm text-gray-300">
                        {latestTerm.has_arbitration
                          ? 'You must resolve disputes through arbitration, cannot sue in court'
                          : 'No mandatory arbitration clause found'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Class Action */}
                <div className={`p-4 rounded-lg border-2 ${latestTerm.has_class_action_waiver ? 'bg-orange-900/20 border-orange-500/30' : 'bg-green-900/20 border-green-500/30'}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{latestTerm.has_class_action_waiver ? '⚠️' : '✅'}</span>
                    <div>
                      <h3 className="font-semibold text-white mb-1">Class Action Waiver</h3>
                      <p className="text-sm text-gray-300">
                        {latestTerm.has_class_action_waiver
                          ? 'You cannot participate in class action lawsuits against the exchange'
                          : 'No class action waiver found'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Termination */}
                <div className={`p-4 rounded-lg border-2 ${latestTerm.has_termination_at_will ? 'bg-yellow-900/20 border-yellow-500/30' : 'bg-green-900/20 border-green-500/30'}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{latestTerm.has_termination_at_will ? '⚠️' : '✅'}</span>
                    <div>
                      <h3 className="font-semibold text-white mb-1">Account Termination</h3>
                      <p className="text-sm text-gray-300">
                        {latestTerm.has_termination_at_will
                          ? 'Account can be terminated at any time without notice'
                          : 'No at-will termination clause found'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Liability Cap */}
                <div className={`p-4 rounded-lg border-2 ${latestTerm.liability_cap_amount !== null ? 'bg-orange-900/20 border-orange-500/30' : 'bg-green-900/20 border-green-500/30'}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{latestTerm.liability_cap_amount !== null ? '⚠️' : '✅'}</span>
                    <div>
                      <h3 className="font-semibold text-white mb-1">Liability Cap</h3>
                      <p className="text-sm text-gray-300">
                        {latestTerm.liability_cap_amount !== null
                          ? `Maximum liability limited to $${latestTerm.liability_cap_amount.toLocaleString()}`
                          : 'No specific liability cap mentioned'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Risks */}
            {latestTerm.exchange_risks && latestTerm.exchange_risks.length > 0 && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg p-6 mb-8 backdrop-blur-sm hover:border-blue-500/50 transition-all">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Additional Risk Factors
                </h2>
                <div className="space-y-4">
                  {latestTerm.exchange_risks.map((risk: any, idx: number) => (
                    <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                      <h3 className="font-semibold text-white mb-1">
                        {risk.risk_categories?.title || 'Risk'}
                      </h3>
                      <p className="text-sm text-gray-300">{risk.summary}</p>
                      {risk.quote && (
                        <blockquote className="mt-2 text-xs text-gray-400 italic border-l-2 border-gray-600 pl-3">
                          "{risk.quote}"
                        </blockquote>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Official Links */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg p-6 mb-8 backdrop-blur-sm hover:border-blue-500/50 transition-all">
              <h2 className="text-2xl font-bold text-white mb-4">
                Official Resources
              </h2>
              <div className="space-y-3">
                <a
                  href={exchange.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-400 hover:text-blue-300 transition-colors"
                >
                  🌐 {exchange.name} Website →
                </a>
                {exchange.terms_url && (
                  <a
                    href={exchange.terms_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    📄 Official Terms of Service →
                  </a>
                )}
              </div>
            </div>

            {/* Inline Disclaimer */}
            <InlineDisclaimer className="mb-8" />

            {/* Last Updated */}
            <div className="text-sm text-gray-500 text-center">
              Analysis last updated: {new Date(latestTerm.fetched_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
