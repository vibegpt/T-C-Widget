'use client';

import { useState } from "react";
import Link from "next/link";

interface Platform {
  name: string;
  founded?: string;
  hq?: string;
  summary: string;
  logo?: string;
  risk: string;
  riskScore: number;
  riskLabel: string;
  color: "green" | "yellow" | "red";
  riskComponents: {
    policies: number;
    security: number;
    compliance: number;
  };
  volume24h?: string;
  tvl?: string;
  custody?: string;
  kyc?: string;
  fees?: {
    maker: number;
    taker: number;
  };
  verified: boolean;
  licensed: boolean;
  licenseRegions?: string[];
  audited: boolean;
  proofOfReserves?: boolean;
  fiatSupport?: boolean;
  blockchain?: string;
  category?: string;
  users?: string;
  lastUpdated: string;
  detailUrl: string;
}

interface EnhancedPlatformListProps {
  platforms: Platform[];
  type: 'cex' | 'dex' | 'third-party' | 'prediction-market';
  accentColor?: string;
  title: React.ReactNode;
  subtitle: string;
  backLink: { url: string; label: string };
}

export default function EnhancedPlatformList({
  platforms,
  type,
  accentColor = 'blue',
  title,
  subtitle,
  backLink
}: EnhancedPlatformListProps) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [compareList, setCompareList] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"risk" | "volume" | "name">("risk");
  const [showRiskModal, setShowRiskModal] = useState(false);

  const colorMap: Record<string, string> = {
    blue: 'blue-600',
    purple: 'purple-600',
    green: 'green-600',
    orange: 'orange-600',
  };

  const primaryColor = colorMap[accentColor] || 'blue-600';

  const sortedPlatforms = [...platforms].sort((a, b) => {
    if (sortBy === "risk") return a.riskScore - b.riskScore;
    if (sortBy === "volume") {
      const aVol = parseFloat((a.volume24h || a.tvl || '0').replace(/[^0-9.]/g, ""));
      const bVol = parseFloat((b.volume24h || b.tvl || '0').replace(/[^0-9.]/g, ""));
      return bVol - aVol;
    }
    return a.name.localeCompare(b.name);
  });

  const toggleCompare = (name: string) => {
    setCompareList((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  return (
    <div className="flex-1 bg-gradient-to-b from-gray-900 to-background px-6 py-10">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
              {title}
            </h1>
            <p className="text-foreground/70 text-sm max-w-2xl">
              {subtitle}
            </p>
          </div>
          <Link
            href={backLink.url}
            className={`mt-4 md:mt-0 bg-${primaryColor} hover:bg-${accentColor}-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors`}
          >
            {backLink.label} →
          </Link>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-gray-900/50 border border-gray-800 p-4 rounded-lg">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-foreground/60">View:</span>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === "grid"
                  ? `bg-${primaryColor} text-white`
                  : "bg-gray-800 text-foreground/60 hover:text-foreground"
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === "table"
                  ? `bg-${primaryColor} text-white`
                  : "bg-gray-800 text-foreground/60 hover:text-foreground"
              }`}
            >
              Table
            </button>
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-sm text-foreground/60">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-gray-800 text-foreground text-sm px-3 py-1 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
            >
              <option value="risk">Risk Score</option>
              <option value="volume">Volume/TVL</option>
              <option value="name">Name</option>
            </select>
          </div>

          <button
            onClick={() => setShowRiskModal(true)}
            className={`text-sm text-${accentColor}-400 hover:text-${accentColor}-300 flex items-center gap-1 transition-colors`}
          >
            <span>ⓘ</span> How we score
          </button>
        </div>
      </header>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPlatforms.map((platform) => (
            <div
              key={platform.name}
              className={`group bg-gray-900 border border-gray-800 p-6 rounded-xl hover:border-${accentColor}-600 hover:shadow-2xl hover:shadow-${accentColor}-900/20 transition-all relative`}
            >
              <Link href={platform.detailUrl}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-lg bg-gray-800 flex items-center justify-center text-xl font-bold text-${accentColor}-400 border border-gray-700`}>
                      {platform.name[0]}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{platform.name}</h2>
                      {/* Trust badges */}
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {platform.verified && (
                          <span className="text-xs bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded border border-green-800" title="Verified">
                            ✓ Verified
                          </span>
                        )}
                        {platform.licensed && (
                          <span className="text-xs bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded border border-blue-800" title={`Licensed in ${platform.licenseRegions?.join(", ")}`}>
                            🛡️ Licensed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced risk display with tooltip */}
                  <div className="group/risk relative">
                    <div
                      className={`flex flex-col items-end ${
                        platform.color === "green"
                          ? "text-green-400"
                          : platform.color === "yellow"
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      <div className="flex items-center gap-1 text-lg font-bold">
                        {platform.color === "green" && "🟢"}
                        {platform.color === "yellow" && "🟡"}
                        {platform.color === "red" && "🔴"}
                        <span>{platform.risk}</span>
                      </div>
                      <span className="text-xs text-foreground/50">{platform.riskLabel}</span>
                    </div>

                    {/* Tooltip */}
                    <div className="hidden group-hover/risk:block absolute right-0 top-full mt-2 bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs w-56 z-10 shadow-xl">
                      <div className="font-semibold mb-2 text-foreground">Risk Components:</div>
                      <div className="space-y-1 text-foreground/70">
                        <div className="flex justify-between">
                          <span>Policies:</span>
                          <span className="text-foreground">{platform.riskComponents.policies}/10</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Security:</span>
                          <span className="text-foreground">{platform.riskComponents.security}/10</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Compliance:</span>
                          <span className="text-foreground">{platform.riskComponents.compliance}/10</span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <div className="text-foreground/50">Updated: {platform.lastUpdated}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-foreground/70 text-sm mb-4 leading-relaxed">{platform.summary}</p>

                {/* Enhanced metadata */}
                <div className="space-y-2 mb-4">
                  {(platform.founded || platform.hq) && (
                    <div className="text-xs text-foreground/60">
                      {platform.founded && `Founded: ${platform.founded}`}
                      {platform.founded && platform.hq && " | "}
                      {platform.hq && `HQ: ${platform.hq}`}
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap text-xs">
                    {(platform.volume24h || platform.tvl) && (
                      <span className="bg-purple-900/20 text-purple-400 px-2 py-1 rounded border border-purple-800">
                        {type === 'dex' ? 'TVL' : 'Vol'}: {platform.volume24h || platform.tvl}
                      </span>
                    )}
                    {platform.blockchain && (
                      <span className="bg-gray-800 text-foreground/70 px-2 py-1 rounded border border-gray-700">
                        {platform.blockchain}
                      </span>
                    )}
                    {platform.custody && (
                      <span className="bg-gray-800 text-foreground/70 px-2 py-1 rounded border border-gray-700">
                        {platform.custody}
                      </span>
                    )}
                    {platform.kyc && (
                      <span className="bg-gray-800 text-foreground/70 px-2 py-1 rounded border border-gray-700">
                        KYC: {platform.kyc}
                      </span>
                    )}
                    {platform.category && (
                      <span className={`bg-${accentColor}-900/20 text-${accentColor}-400 px-2 py-1 rounded border border-${accentColor}-800`}>
                        {platform.category}
                      </span>
                    )}
                    {platform.users && (
                      <span className="bg-gray-800 text-foreground/70 px-2 py-1 rounded border border-gray-700">
                        {platform.users} users
                      </span>
                    )}
                    {platform.fees && (
                      <span className="bg-gray-800 text-foreground/70 px-2 py-1 rounded border border-gray-700">
                        Fees: {platform.fees.taker}%
                      </span>
                    )}
                  </div>
                  {/* Additional trust signals */}
                  <div className="flex gap-2 flex-wrap text-xs">
                    {platform.audited && (
                      <span className="text-green-400" title="Security Audited">
                        ✓ Audited
                      </span>
                    )}
                    {platform.proofOfReserves && (
                      <span className="text-green-400" title="Proof of Reserves">
                        ✓ PoR
                      </span>
                    )}
                    {platform.fiatSupport && (
                      <span className="text-blue-400" title="Fiat Support">
                        💵 Fiat
                      </span>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <div className={`text-${accentColor}-400 text-sm group-hover:underline flex items-center`}>
                  View {type === 'prediction-market' ? 'Terms & Policies' : 'Policy Summary'}
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              {/* Compare checkbox */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggleCompare(platform.name);
                }}
                className={`absolute top-4 left-4 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                  compareList.includes(platform.name)
                    ? `bg-${primaryColor} border-${primaryColor}`
                    : "border-gray-600 hover:border-blue-500"
                }`}
                title="Add to compare"
                style={{ minWidth: "44px", minHeight: "44px" }}
              >
                {compareList.includes(platform.name) && (
                  <span className="text-white text-sm">✓</span>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Table View - Similar structure */}
      {viewMode === "table" && (
        <div className="max-w-7xl mx-auto bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-900/50 border-b border-gray-800">
              <tr>
                <th className="text-left p-4 font-semibold text-foreground/70">Platform</th>
                <th className="text-left p-4 font-semibold text-foreground/70">Risk</th>
                <th className="text-left p-4 font-semibold text-foreground/70">Volume/TVL</th>
                <th className="text-left p-4 font-semibold text-foreground/70">Type</th>
                <th className="text-left p-4 font-semibold text-foreground/70">Trust Signals</th>
                <th className="text-left p-4 font-semibold text-foreground/70">Founded</th>
                <th className="text-right p-4 font-semibold text-foreground/70">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlatforms.map((platform, idx) => (
                <tr
                  key={platform.name}
                  className={`border-b border-gray-800 hover:bg-gray-900/30 transition-colors ${
                    idx === sortedPlatforms.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={compareList.includes(platform.name)}
                        onChange={() => toggleCompare(platform.name)}
                        className="w-4 h-4 rounded border-gray-600"
                      />
                      <div className={`h-8 w-8 rounded bg-gray-800 flex items-center justify-center text-sm font-bold text-${accentColor}-400 border border-gray-700`}>
                        {platform.name[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{platform.name}</div>
                        <div className="text-xs text-foreground/50">{platform.hq || platform.blockchain || platform.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      {platform.color === "green" && "🟢"}
                      {platform.color === "yellow" && "🟡"}
                      {platform.color === "red" && "🔴"}
                      <span className={`font-semibold ${
                        platform.color === "green" ? "text-green-400" :
                        platform.color === "yellow" ? "text-yellow-400" :
                        "text-red-400"
                      }`}>{platform.risk}</span>
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-purple-400">{platform.volume24h || platform.tvl || 'N/A'}</td>
                  <td className="p-4 text-foreground/70">{platform.blockchain || platform.category || platform.custody || 'N/A'}</td>
                  <td className="p-4">
                    <div className="flex gap-2 flex-wrap">
                      {platform.verified && <span className="text-green-400 text-xs" title="Verified">✓</span>}
                      {platform.licensed && <span className="text-blue-400 text-xs" title="Licensed">🛡️</span>}
                      {platform.audited && <span className="text-green-400 text-xs" title="Audited">🔍</span>}
                      {platform.proofOfReserves && <span className="text-green-400 text-xs" title="Proof of Reserves">💰</span>}
                    </div>
                  </td>
                  <td className="p-4 text-foreground/60">{platform.founded || 'N/A'}</td>
                  <td className="p-4 text-right">
                    <Link
                      href={platform.detailUrl}
                      className={`text-${accentColor}-400 hover:text-${accentColor}-300 text-sm transition-colors`}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Compare Bar */}
      {compareList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4 shadow-2xl z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-foreground/60">
                {compareList.length} selected
              </span>
              <div className="flex gap-2">
                {compareList.map((name) => (
                  <span
                    key={name}
                    className={`bg-${accentColor}-900/30 text-${accentColor}-400 px-3 py-1 rounded-full text-sm flex items-center gap-2 border border-${accentColor}-800`}
                  >
                    {name}
                    <button
                      onClick={() => toggleCompare(name)}
                      className="hover:text-blue-300 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCompareList([])}
                className="px-4 py-2 text-sm text-foreground/60 hover:text-foreground transition-colors"
              >
                Clear
              </button>
              <button className={`px-4 py-2 text-sm bg-${primaryColor} hover:bg-${accentColor}-700 text-white rounded-lg transition-colors`}>
                Compare ({compareList.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Risk Scoring Modal */}
      {showRiskModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">How We Score Risk</h2>
                <button
                  onClick={() => setShowRiskModal(false)}
                  className="text-foreground/60 hover:text-foreground text-2xl transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 text-sm text-foreground/70">
                <p>
                  Our risk scoring system evaluates platforms across three key dimensions to help you make informed decisions:
                </p>

                <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">🔒 Policies (Weight: 30%)</h3>
                  <p className="text-foreground/60">
                    Analysis of terms of service, privacy policies, fund protection clauses, withdrawal restrictions, and dispute resolution processes.
                  </p>
                </div>

                <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">🛡️ Security (Weight: 40%)</h3>
                  <p className="text-foreground/60">
                    Evaluation of security audits, proof of reserves, insurance funds, cold storage practices, 2FA requirements, and historical security incidents.
                  </p>
                </div>

                <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">⚖️ Compliance (Weight: 30%)</h3>
                  <p className="text-foreground/60">
                    Assessment of regulatory licenses, KYC/AML procedures, jurisdictional oversight, transparency reports, and regulatory track record.
                  </p>
                </div>

                <div className={`bg-${accentColor}-900/20 border border-${accentColor}-800 p-4 rounded-lg`}>
                  <h3 className={`font-semibold text-${accentColor}-400 mb-2`}>Risk Score Scale</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">🟢 1-3/10</span>
                      <span>Very Low to Low Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400">🟡 4-6/10</span>
                      <span>Moderate Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400">🔴 7-10/10</span>
                      <span>High to Critical Risk</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-foreground/50">
                  Last methodology update: October 2025. Scores are updated regularly based on policy changes, security incidents, and regulatory developments.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
