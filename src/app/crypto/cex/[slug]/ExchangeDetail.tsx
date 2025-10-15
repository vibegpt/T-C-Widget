'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import { PortableText } from '@portabletext/react';

export default function ExchangeDetail({ exchange }: { exchange: any }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'critical' | 'allPolicies'>('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedPolicies, setExpandedPolicies] = useState<Set<number>>(new Set());

  if (!exchange) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">CEX Not Found</h1>
            <Link href="/crypto/cex" className="text-blue-600 hover:text-blue-700">
              ← Back to CEX List
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Calculate statistics
  const stats = {
    total: exchange.policies?.length || 0,
    critical: exchange.policies?.filter((p: any) => p.impact === 'critical').length || 0,
    high: exchange.policies?.filter((p: any) => p.impact === 'high').length || 0,
    good: exchange.policies?.filter((p: any) => p.category === 'good').length || 0,
    bad: exchange.policies?.filter((p: any) => p.category === 'bad').length || 0,
    common: exchange.policies?.filter((p: any) => p.category === 'common').length || 0,
  };

  // Focus on critical user-impacting policies: funds control, insurance, account banning, withdrawal restrictions
  const criticalPolicies = exchange.policies?.filter((p: any) => {
    if (!p.title || !p.summary) return false;

    const titleLower = p.title.toLowerCase();
    const summaryLower = p.summary.toLowerCase();
    const combined = titleLower + ' ' + summaryLower;

    // CRITICAL: What can they do with your FUNDS?
    const fundsControl = [
      'freeze', 'suspend', 'withhold', 'seize', 'confiscate', 'hold funds',
      'restrict withdrawal', 'withdrawal limit', 'withdrawal restriction',
      'cancel withdrawal', 'reverse transaction', 'delay withdrawal',
      'lock funds', 'freeze assets', 'suspend account'
    ];

    // CRITICAL: Account banning and termination
    const accountControl = [
      'terminate', 'close account', 'ban', 'suspend', 'restrict access',
      'disable account', 'revoke access', 'discretion', 'without notice',
      'immediate termination', 'suspend trading'
    ];

    // CRITICAL: Insurance and liability (are you covered?)
    const insurance = [
      'insurance', 'not liable', 'no liability', 'limitation of liability',
      'not responsible', 'safu', 'insurance fund', 'protection fund',
      'compensation', 'reimbursement', 'indemnify', 'hold harmless'
    ];

    // CRITICAL: Hidden fees and penalties
    const fees = [
      'inactivity fee', 'dormant account', 'penalty', 'withdrawal fee',
      'hidden fee', 'additional charge', 'undisclosed fee'
    ];

    // CRITICAL: Forced actions on your positions
    const forcedActions = [
      'forced liquidation', 'auto-deleveraging', 'adl', 'socialized loss',
      'clawback', 'forced settlement', 'position closure', 'margin call'
    ];

    // CRITICAL: Privacy and data sharing
    const privacy = [
      'share data', 'sell data', 'third party', 'transfer data',
      'government request', 'law enforcement', 'disclose information'
    ];

    const hasFundsControl = fundsControl.some(term => combined.includes(term));
    const hasAccountControl = accountControl.some(term => combined.includes(term));
    const hasInsurance = insurance.some(term => combined.includes(term));
    const hasFees = fees.some(term => combined.includes(term));
    const hasForcedActions = forcedActions.some(term => combined.includes(term));
    const hasPrivacy = privacy.some(term => combined.includes(term));

    // Also include critical and high impact policies
    const isCriticalImpact = p.impact === 'critical' || p.impact === 'high';

    return hasFundsControl || hasAccountControl || hasInsurance || hasFees ||
           hasForcedActions || hasPrivacy || isCriticalImpact || p.category === 'good';
  }) || [];

  const ratingConfig = {
    good: { label: '🟢 User-Friendly', color: 'text-green-600', bg: 'bg-green-900/20', border: 'border-green-800' },
    mixed: { label: '🟡 Mixed Policies', color: 'text-yellow-600', bg: 'bg-yellow-900/20', border: 'border-yellow-800' },
    risky: { label: '🔴 High Risk', color: 'text-red-600', bg: 'bg-red-900/20', border: 'border-red-800' },
  };

  const rating = exchange.overallRating ? ratingConfig[exchange.overallRating as keyof typeof ratingConfig] : null;

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const togglePolicy = (index: number) => {
    const newExpanded = new Set(expandedPolicies);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedPolicies(newExpanded);
  };

  const sectionNames: Record<string, string> = {
    account: '👤 Account',
    trading: '📊 Trading',
    dispute: '⚖️ Disputes',
    liability: '🛡️ Liability',
    fees: '💰 Fees',
    privacy: '🔒 Privacy',
    security: '🔐 Security',
    regulatory: '📜 Regulatory',
    protections: '🛡️ User Protections',
    loans: '💸 Loans & Lending',
    staking: '🪙 Staking',
    legal: '⚖️ Legal',
    rights: '📋 User Rights',
    risks: '⚠️ Risks',
    other: '📋 Other'
  };

  const grouped = (exchange.policies || []).reduce((acc: any, policy: any) => {
    const section = policy.section || 'other';
    if (!acc[section]) acc[section] = [];
    acc[section].push(policy);
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      {/* Compact Header */}
      <section className="bg-gradient-to-b from-gray-900 to-background py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/crypto/cex" className="text-blue-600 hover:text-blue-700 mb-4 inline-block text-sm">
            ← Back to CEXs
          </Link>

          <div className="flex items-center gap-6 mb-6">
            <h1 className="text-3xl font-bold text-foreground">{exchange.name}</h1>
            {rating && (
              <div className={`px-3 py-1 rounded-lg ${rating.bg} border ${rating.border}`}>
                <span className={`text-sm font-medium ${rating.color}`}>{rating.label}</span>
              </div>
            )}
          </div>

          {/* Key Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-foreground/60">Total Policies</div>
            </div>
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-600">{stats.critical + stats.high}</div>
              <div className="text-xs text-foreground/60">High Risk</div>
            </div>
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-600">{stats.bad}</div>
              <div className="text-xs text-foreground/60">Unfavorable</div>
            </div>
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{stats.good}</div>
              <div className="text-xs text-foreground/60">User-Friendly</div>
            </div>
            {exchange.riskScore !== undefined && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                <div className={`text-2xl font-bold ${
                  exchange.riskScore <= 3 ? 'text-green-600' :
                  exchange.riskScore <= 6 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {exchange.riskScore}/10
                </div>
                <div className="text-xs text-foreground/60">Risk Score</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="bg-gray-900/50 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-foreground/60 hover:text-foreground'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('critical')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'critical'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-foreground/60 hover:text-foreground'
              }`}
            >
              Key Highlights
              {criticalPolicies.length > 0 && (
                <span className="bg-orange-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {criticalPolicies.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('allPolicies')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'allPolicies'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-foreground/60 hover:text-foreground'
              }`}
            >
              All Policies ({stats.total})
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {exchange.quickSummary && (
                <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6">
                  <h2 className="text-xl font-bold text-foreground mb-3">Summary</h2>
                  <p className="text-foreground/80 leading-relaxed">{exchange.quickSummary}</p>
                  {exchange.termsUrl && (
                    <a
                      href={exchange.termsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Read Official Terms →
                    </a>
                  )}
                </div>
              )}

              {exchange.keyTakeaways && exchange.keyTakeaways.length > 0 && (
                <div className="bg-blue-900/10 border border-blue-800 rounded-xl p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4">Key Takeaways</h2>
                  <ul className="space-y-2">
                    {exchange.keyTakeaways.map((takeaway: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1 flex-shrink-0">•</span>
                        <span className="text-foreground/80">{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Section Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(grouped).map(([section, policies]: [string, any]) => {
                  const criticalCount = policies.filter((p: any) => p.impact === 'critical' || p.impact === 'high').length;
                  const badCount = policies.filter((p: any) => p.category === 'bad').length;

                  return (
                    <button
                      key={section}
                      onClick={() => {
                        setActiveTab('allPolicies');
                        setExpandedSections(new Set([section]));
                      }}
                      className="bg-gray-900/30 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-foreground">
                          {sectionNames[section as keyof typeof sectionNames]}
                        </h3>
                        <span className="text-sm text-foreground/60">{policies.length} policies</span>
                      </div>
                      {(criticalCount > 0 || badCount > 0) && (
                        <div className="flex gap-2 text-xs">
                          {criticalCount > 0 && (
                            <span className="text-red-600">⚠️ {criticalCount} high risk</span>
                          )}
                          {badCount > 0 && (
                            <span className="text-orange-600">• {badCount} unfavorable</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Key Highlights Tab */}
          {activeTab === 'critical' && (
            <div className="space-y-4">
              {criticalPolicies.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">✅</div>
                  <h3 className="text-xl font-bold text-foreground mb-2">No Key Highlights</h3>
                  <p className="text-foreground/60">This platform has no unusual risks, hidden fees, or special protections worth highlighting.</p>
                </div>
              ) : (
                <>
                  <div className="bg-orange-900/20 border border-orange-800 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💡</span>
                      <div>
                        <h3 className="font-bold text-orange-600 mb-1">Key Highlights</h3>
                        <p className="text-sm text-foreground/70">
                          Unusual risks, leverage warnings, hidden fees, and protections worth knowing about.
                        </p>
                      </div>
                    </div>
                  </div>

                  {criticalPolicies.map((policy: any, index: number) => {
                    const icon = policy.category === 'good' ? '✅' : '⚠️';
                    const colorClass = policy.category === 'good' ? 'text-green-600' : 'text-orange-600';
                    const borderClass = policy.category === 'good' ? 'border-green-800' : 'border-orange-800';
                    const bgClass = policy.category === 'good' ? 'bg-green-900/10' : 'bg-orange-900/10';
                    const hoverClass = policy.category === 'good' ? 'hover:bg-green-900/20' : 'hover:bg-orange-900/20';
                    const borderTopClass = policy.category === 'good' ? 'border-green-800/50' : 'border-orange-800/50';

                    return (
                      <div
                        key={index}
                        className={`border ${borderClass} ${bgClass} rounded-xl overflow-hidden`}
                      >
                        <button
                          onClick={() => togglePolicy(index)}
                          className={`w-full p-4 flex items-center justify-between ${hoverClass} transition-colors`}
                        >
                          <div className="flex items-center gap-3 flex-1 text-left">
                            <span className="text-xl">{icon}</span>
                            <div>
                              <h4 className={`font-bold ${colorClass}`}>{policy.title}</h4>
                              <p className="text-sm text-foreground/80 mt-1">{policy.summary}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs px-2 py-1 bg-gray-900 border border-gray-700 rounded-full text-foreground/70">
                              {policy.impact}
                            </span>
                            <span className="text-foreground/60">
                              {expandedPolicies.has(index) ? '▼' : '▶'}
                            </span>
                          </div>
                        </button>

                        {expandedPolicies.has(index) && policy.details && (
                          <div className={`px-4 pb-4 border-t ${borderTopClass}`}>
                            <div className="prose prose-invert prose-sm max-w-none text-foreground/70 pt-4">
                              <PortableText value={policy.details} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* All Policies Tab */}
          {activeTab === 'allPolicies' && (
            <div className="space-y-4">
              {Object.entries(grouped).map(([section, policies]: [string, any]) => {
                const isExpanded = expandedSections.has(section);

                return (
                  <div key={section} className="border border-gray-800 rounded-xl overflow-hidden bg-gray-900/30">
                    <button
                      onClick={() => toggleSection(section)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-900/50 transition-colors"
                    >
                      <h3 className="text-lg font-bold text-foreground">
                        {sectionNames[section as keyof typeof sectionNames]} ({policies.length})
                      </h3>
                      <span className="text-foreground/60">{isExpanded ? '▼' : '▶'}</span>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-800 p-4 space-y-3">
                        {policies.map((policy: any, pIndex: number) => {
                          const icon = policy.category === 'good' ? '✅' : policy.category === 'bad' ? '⚠️' : 'ℹ️';
                          const color = policy.category === 'good' ? 'text-green-600' : policy.category === 'bad' ? 'text-red-600' : 'text-blue-600';

                          return (
                            <div key={pIndex} className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <span className="text-lg">{icon}</span>
                                <div className="flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className={`font-bold ${color}`}>{policy.title}</h4>
                                    <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-foreground/60 flex-shrink-0">
                                      {policy.impact}
                                    </span>
                                  </div>
                                  <p className="text-sm text-foreground/70 mt-1">{policy.summary}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
