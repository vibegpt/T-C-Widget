'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import { PortableText } from '@portabletext/react';

export default function ThirdPartyAppDetail({ app }: { app: any }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'critical' | 'allPolicies'>('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedPolicies, setExpandedPolicies] = useState<Set<number>>(new Set());

  if (!app) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">App Not Found</h1>
            <Link href="/crypto/third-party-apps" className="text-blue-600 hover:text-blue-700">
              ← Back to Third-Party Apps
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Calculate statistics
  const stats = {
    total: app.policies?.length || 0,
    critical: app.policies?.filter((p: any) => p.impact === 'critical').length || 0,
    high: app.policies?.filter((p: any) => p.impact === 'high').length || 0,
    good: app.policies?.filter((p: any) => p.category === 'good').length || 0,
    bad: app.policies?.filter((p: any) => p.category === 'bad').length || 0,
    common: app.policies?.filter((p: any) => p.category === 'common').length || 0,
  };

  // Focus on critical user-impacting policies: data privacy, account control, liability
  const criticalPolicies = app.policies?.filter((p: any) => {
    if (!p.title || !p.summary) return false;

    const titleLower = p.title.toLowerCase();
    const summaryLower = p.summary.toLowerCase();
    const combined = titleLower + ' ' + summaryLower;

    // CRITICAL: Data collection and privacy
    const privacy = [
      'collect data', 'personal data', 'share data', 'sell data',
      'third party', 'cookies', 'tracking', 'analytics',
      'government request', 'law enforcement', 'disclose'
    ];

    // CRITICAL: Account control and access
    const accountControl = [
      'terminate', 'suspend', 'ban', 'close account', 'restrict access',
      'disable', 'revoke', 'without notice', 'discretion'
    ];

    // CRITICAL: Liability and responsibility
    const liability = [
      'not liable', 'no liability', 'limitation of liability',
      'not responsible', 'indemnify', 'hold harmless',
      'waive', 'release', 'at your own risk'
    ];

    // CRITICAL: Fees and charges
    const fees = [
      'fee', 'charge', 'cost', 'payment', 'subscription',
      'penalty', 'additional charge'
    ];

    // CRITICAL: Terms changes and arbitration
    const legal = [
      'change terms', 'modify', 'arbitration', 'class action waiver',
      'dispute resolution', 'governing law', 'jurisdiction'
    ];

    // CRITICAL: Permissions and access
    const permissions = [
      'permission', 'access', 'authorize', 'wallet', 'private key',
      'seed phrase', 'signature', 'transaction'
    ];

    const hasPrivacy = privacy.some(term => combined.includes(term));
    const hasAccountControl = accountControl.some(term => combined.includes(term));
    const hasLiability = liability.some(term => combined.includes(term));
    const hasFees = fees.some(term => combined.includes(term));
    const hasLegal = legal.some(term => combined.includes(term));
    const hasPermissions = permissions.some(term => combined.includes(term));

    // Also include critical and high impact policies
    const isCriticalImpact = p.impact === 'critical' || p.impact === 'high';

    return hasPrivacy || hasAccountControl || hasLiability || hasFees ||
           hasLegal || hasPermissions || isCriticalImpact || p.category === 'good';
  }) || [];

  const ratingConfig = {
    good: { label: '🟢 User-Friendly', color: 'text-green-600', bg: 'bg-green-900/20', border: 'border-green-800' },
    mixed: { label: '🟡 Mixed Policies', color: 'text-yellow-600', bg: 'bg-yellow-900/20', border: 'border-yellow-800' },
    risky: { label: '🔴 High Risk', color: 'text-red-600', bg: 'bg-red-900/20', border: 'border-red-800' },
  };

  const rating = app.overallRating ? ratingConfig[app.overallRating as keyof typeof ratingConfig] : null;

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

  const grouped = (app.policies || []).reduce((acc: any, policy: any) => {
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
          <Link href="/crypto/third-party-apps" className="text-green-600 hover:text-green-700 mb-4 inline-block text-sm">
            ← Back to Third-Party Apps
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {app.imageUrl && (
                <img src={app.imageUrl} alt={app.name} className="w-16 h-16 rounded-lg border border-gray-800" />
              )}
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-1">{app.name}</h1>
                <p className="text-foreground/60 text-sm">
                  {app.category} {app.users && `• ${app.users} users`}
                </p>
              </div>
            </div>

            {rating && (
              <div className={`px-4 py-2 rounded-lg border ${rating.bg} ${rating.border}`}>
                <div className={`text-sm font-semibold ${rating.color}`}>{rating.label}</div>
                {app.riskScore !== undefined && (
                  <div className="text-xs text-foreground/60 mt-1">Risk: {app.riskScore}/10</div>
                )}
              </div>
            )}
          </div>

          {app.quickSummary && (
            <p className="text-foreground/70 mt-4 leading-relaxed max-w-3xl">
              {app.quickSummary}
            </p>
          )}

          {app.termsUrl && (
            <a
              href={app.termsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-600 hover:text-green-700 mt-3 inline-block"
            >
              Read Official Terms →
            </a>
          )}
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-gray-900/30 border-y border-gray-800 py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-foreground/50">Total Policies</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{stats.critical + stats.high}</div>
              <div className="text-xs text-foreground/50">High Risk</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">{stats.common}</div>
              <div className="text-xs text-foreground/50">Standard</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{stats.good}</div>
              <div className="text-xs text-foreground/50">User-Friendly</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="flex-1 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-800">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('critical')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'critical'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              Key Policies ({criticalPolicies.length})
            </button>
            <button
              onClick={() => setActiveTab('allPolicies')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'allPolicies'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              All Policies ({stats.total})
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Takeaways */}
              {app.keyTakeaways && app.keyTakeaways.length > 0 && (
                <div className="bg-green-900/10 border border-green-800 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4">📌 Key Takeaways</h2>
                  <ul className="space-y-2">
                    {app.keyTakeaways.map((takeaway: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-600 mr-2">•</span>
                        <span className="text-foreground/80">{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Top Critical Policies */}
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">⚠️ Important Policies</h2>
                <div className="space-y-4">
                  {criticalPolicies.slice(0, 5).map((policy: any, index: number) => (
                    <PolicyCard key={index} policy={policy} index={index} expanded={expandedPolicies} togglePolicy={togglePolicy} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Critical Tab */}
          {activeTab === 'critical' && (
            <div className="space-y-4">
              {criticalPolicies.map((policy: any, index: number) => (
                <PolicyCard key={index} policy={policy} index={index} expanded={expandedPolicies} togglePolicy={togglePolicy} />
              ))}
            </div>
          )}

          {/* All Policies Tab */}
          {activeTab === 'allPolicies' && (
            <div className="space-y-6">
              {Object.entries(grouped).map(([section, policies]) => (
                <div key={section} className="border border-gray-800 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection(section)}
                    className="w-full bg-gray-900/50 px-6 py-4 flex items-center justify-between hover:bg-gray-900/70 transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-foreground">
                      {sectionNames[section] || section} ({(policies as any[]).length})
                    </h3>
                    <span className="text-foreground/60">{expandedSections.has(section) ? '−' : '+'}</span>
                  </button>
                  {expandedSections.has(section) && (
                    <div className="p-6 space-y-4 bg-background">
                      {(policies as any[]).map((policy: any, index: number) => (
                        <PolicyCard key={index} policy={policy} index={index} expanded={expandedPolicies} togglePolicy={togglePolicy} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function PolicyCard({ policy, index, expanded, togglePolicy }: any) {
  const categoryConfig = {
    good: { icon: '✅', color: 'text-green-600', bg: 'bg-green-900/20', border: 'border-green-800' },
    bad: { icon: '⚠️', color: 'text-red-600', bg: 'bg-red-900/20', border: 'border-red-800' },
    common: { icon: 'ℹ️', color: 'text-yellow-600', bg: 'bg-yellow-900/20', border: 'border-yellow-800' },
  };

  const impactConfig = {
    critical: { label: 'Critical', color: 'text-red-600' },
    high: { label: 'High', color: 'text-orange-600' },
    medium: { label: 'Medium', color: 'text-yellow-600' },
    low: { label: 'Low', color: 'text-green-600' },
  };

  const category = policy.category ? categoryConfig[policy.category as keyof typeof categoryConfig] : null;
  const impact = policy.impact ? impactConfig[policy.impact as keyof typeof impactConfig] : null;

  return (
    <div className={`border rounded-lg overflow-hidden ${category?.border || 'border-gray-800'}`}>
      <button
        onClick={() => togglePolicy(index)}
        className={`w-full px-4 py-3 flex items-start justify-between ${category?.bg || 'bg-gray-900/30'} hover:opacity-80 transition-opacity`}
      >
        <div className="flex items-start gap-3 text-left flex-1">
          <span className="text-xl">{category?.icon || '📋'}</span>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground">{policy.title}</h4>
            <p className="text-sm text-foreground/70 mt-1">{policy.summary}</p>
            {impact && (
              <span className={`text-xs font-medium mt-2 inline-block ${impact.color}`}>
                Impact: {impact.label}
              </span>
            )}
          </div>
        </div>
        <span className="text-foreground/60 ml-2">{expanded.has(index) ? '−' : '+'}</span>
      </button>

      {expanded.has(index) && policy.details && (
        <div className="px-4 py-3 bg-background border-t border-gray-800">
          <div className="prose prose-sm prose-invert max-w-none">
            <PortableText value={policy.details} />
          </div>
        </div>
      )}
    </div>
  );
}
