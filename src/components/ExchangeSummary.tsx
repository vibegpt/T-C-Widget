import React from "react";

export default function ExchangeSummary() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0f1a] to-black text-white px-6 py-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="text-gray-400">←</span>
          <h1 className="text-2xl font-bold">
            Binance <span className="text-blue-400 font-medium">CEX</span>
          </h1>
        </div>
        <div className="text-sm text-gray-400">Risk Score: <span className="text-red-400 font-semibold">3/10</span></div>
      </header>

      {/* Snapshot Row */}
      <div className="grid grid-cols-4 gap-3 mb-6 text-center text-sm">
        <div className="bg-[#111827] rounded-lg py-3">9<br/><span className="text-gray-400">Total Policies</span></div>
        <div className="bg-[#111827] rounded-lg py-3 text-red-400">3<br/><span className="text-gray-400">High Risk</span></div>
        <div className="bg-[#111827] rounded-lg py-3 text-yellow-400">1<br/><span className="text-gray-400">Moderate</span></div>
        <div className="bg-[#111827] rounded-lg py-3 text-green-400">5<br/><span className="text-gray-400">User-Friendly</span></div>
      </div>

      {/* TL;DR */}
      <p className="bg-[#0f172a] p-4 rounded-lg mb-6 text-gray-300 text-sm leading-relaxed">
        <strong>TL;DR:</strong> Binance's terms are generally compliant and user-friendly, but some clauses allow fund freezes and extensive data sharing with regulators.
      </p>

      {/* Key Insights Grid */}
      <div className="grid md:grid-cols-4 gap-4 mb-8 text-sm">
        <div className="bg-[#111827] p-4 rounded-lg">
          <h3 className="font-semibold mb-2">⚖️ Legal Standing</h3>
          <p>Operates globally under multiple jurisdictions. Disputes resolved under Cayman law.</p>
        </div>
        <div className="bg-[#111827] p-4 rounded-lg">
          <h3 className="font-semibold mb-2">🔒 Privacy & Data</h3>
          <p>Data retained for up to 7 years and shared with regulators if required.</p>
        </div>
        <div className="bg-[#111827] p-4 rounded-lg">
          <h3 className="font-semibold mb-2">💰 Accounts & Funds</h3>
          <p>Accounts can be frozen for AML/KYC reasons with limited appeal options.</p>
        </div>
        <div className="bg-[#111827] p-4 rounded-lg">
          <h3 className="font-semibold mb-2">🕵️ Compliance & Audits</h3>
          <p>Regular audits claimed. Collaboration with regulators enhances safety.</p>
        </div>
      </div>

      {/* Policy Breakdown */}
      <div className="space-y-3 mb-8">
        <div className="bg-[#111827] p-4 rounded-lg border-l-4 border-red-500">
          <h4 className="font-semibold text-red-400">Account Policy</h4>
          <p className="text-sm text-gray-300">Accounts may be suspended or terminated for suspicious activity, with funds frozen during investigation.</p>
        </div>
        <div className="bg-[#111827] p-4 rounded-lg border-l-4 border-yellow-400">
          <h4 className="font-semibold text-yellow-400">Privacy Policy</h4>
          <p className="text-sm text-gray-300">User data may be shared with regulators and retained for up to 7 years.</p>
        </div>
        <div className="bg-[#111827] p-4 rounded-lg border-l-4 border-green-500">
          <h4 className="font-semibold text-green-400">Terms of Use</h4>
          <p className="text-sm text-gray-300">Provides transparency in fee structure and dispute handling.</p>
        </div>
      </div>

      {/* Meta + Footer */}
      <div className="flex flex-col md:flex-row justify-between text-xs text-gray-400 border-t border-gray-800 pt-4">
        <div>Founded: 2017 | HQ: Global | Users: 120M+ | Updated: Oct 2025</div>
        <a href="#" className="text-blue-400 hover:underline">Read official terms →</a>
      </div>
    </div>
  );
}
