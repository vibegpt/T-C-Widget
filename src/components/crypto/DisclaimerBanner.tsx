"use client";

import Link from "next/link";
import { useState } from "react";

export function DisclaimerBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="bg-yellow-900/20 border-b-2 border-yellow-500/30">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-400">
              <span className="font-bold">⚠️ Disclaimer:</span> This information is for educational purposes only and does not constitute legal or financial advice. Always read the complete terms directly on each exchange's website.{' '}
              <Link href="/crypto/legal" className="underline hover:text-yellow-300 transition-colors">
                Full Legal Disclaimer
              </Link>
            </p>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 text-yellow-400 hover:text-yellow-300 text-lg font-bold transition-colors"
            aria-label="Dismiss disclaimer"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

export function InlineDisclaimer({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-md p-3 text-xs text-gray-400 backdrop-blur-sm ${className}`}>
      <p className="font-medium mb-1 text-gray-300">📌 Disclaimer:</p>
      <p>
        This is a simplified summary for informational purposes only. It does not constitute legal advice.
        Read the complete official terms on the exchange's website before trading.
      </p>
    </div>
  );
}
