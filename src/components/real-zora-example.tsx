/**
 * Real Zora Terms Example
 * ----------------------
 * This demonstrates the enhanced ParsedTerms system with real Zora terms data.
 * Shows how all the new section keys and risk detection work together.
 */

import { 
  LegalEasySummaryDynamic, 
  type ParsedTerms, 
  type SectionKey 
} from "@/components/LegalEasySummary";

// Real Zora terms data using the enhanced structure
const realZoraTerms: ParsedTerms = {
  "product": "Zora",
  "updatedAt": "2025-07-29",
  "jurisdiction": ["Delaware", "USA"],
  "sections": [
    {
      "key": "eligibility",
      "title": "Eligibility",
      "bullets": ["You must be at least 18."],
      "facts": { "ageMin": 18 }
    },
    {
      "key": "wallet",
      "title": "Wallet & Self-Custody",
      "bullets": [
        "Zora is not a wallet/custodian; you hold your keys.",
        "Gas fees are non-refundable; on-chain txs are final."
      ],
      "facts": {
        "selfCustody": true,
        "noCustodyByPlatform": true,
        "gasFeesNonRefundable": true
      }
    },
    {
      "key": "tokens",
      "title": "Tokens",
      "bullets": [
        "Collectibles, not securities or investments.",
        "Fixed supply when created; prices are volatile."
      ],
      "facts": {
        "notSecurity": true,
        "collectiblesOnly": true,
        "noInvestmentAdvice": true
      }
    },
    {
      "key": "risks",
      "title": "Risks & Gotchas",
      "bullets": [
        "Transactions are irreversible and volatile.",
        "Bridging/L2 carries waiting periods and technical risk."
      ],
      "facts": {
        "irreversibleTxs": true,
        "volatility": true,
        "bridgingL2": true
      }
    },
    {
      "key": "disputes",
      "title": "Dispute Resolution",
      "bullets": [
        "Binding individual arbitration (JAMS); no class actions.",
        "You can opt out within 30 days by mail."
      ],
      "facts": {
        "arbitration": true,
        "arbitrationProvider": "JAMS",
        "classActionWaiver": true,
        "optOutDays": 30
      }
    },
    {
      "key": "liability",
      "title": "Liability Limit",
      "bullets": ["Liability capped at $100 or what you paid Zora for the item."],
      "facts": { "liabilityCap": 100 }
    },
    {
      "key": "termination",
      "title": "Account Suspension/Termination",
      "bullets": ["Zora may suspend/terminate accounts at its discretion."],
      "facts": { "canSuspendAnytime": true }
    },
    {
      "key": "modifications",
      "title": "Changes to the Terms",
      "bullets": ["Zora can change these Terms effective immediately without prior notice."],
      "facts": { "termsChangeEffectiveImmediately": true }
    },
    {
      "key": "ip",
      "title": "Your Content & License",
      "bullets": ["You grant Zora a broad license to operate and promote the service."],
      "facts": { "broadLicenseToOperate": true }
    },
    {
      "key": "dmca",
      "title": "DMCA",
      "bullets": ["DMCA takedown process available; email: dmca@ourzora.com."],
      "facts": {
        "dmcaEmail": "dmca@ourzora.com",
        "dmcaAddress": "110 Green Street, #803A, New York, NY 10012"
      }
    },
    {
      "key": "governing_law",
      "title": "Governing Law & Venue",
      "bullets": ["Delaware law; Delaware courts if not arbitrated."],
      "facts": { "governingLaw": "Delaware", "venue": "Delaware" }
    },
    {
      "key": "california_notice",
      "title": "California §1542",
      "bullets": ["California Civil Code §1542 waiver noted in peer release."],
      "facts": { "ccp1542Waiver": true }
    },
    {
      "key": "zora_network",
      "title": "Zora Network (L2)",
      "bullets": [
        "OP Stack rollup; sequencer operated by ConduitXYZ.",
        "Withdrawals subject to a 7-day dispute period."
      ],
      "facts": {
        "stack": "OP Stack",
        "sequencerOperator": "ConduitXYZ, Inc.",
        "disputePeriodDays": 7
      }
    }
  ]
};

// Component to display the raw JSON structure
function RawDataDisplay({ data }: { data: ParsedTerms }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Raw ParsedTerms Data Structure</h3>
      <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96">
        <pre className="text-sm">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}

// Component to show section key analysis
function SectionKeyAnalysis({ data }: { data: ParsedTerms }) {
  const sectionKeys = data.sections.map(s => s.key);
  const allPossibleKeys: SectionKey[] = [
    "eligibility", "compliance", "wallet", "services", "tokens", "fees",
    "risks", "disputes", "liability", "termination", "modifications",
    "privacy", "ip", "dmca", "third_party", "governing_law",
    "california_notice", "zora_network"
  ];
  
  const usedKeys = sectionKeys;
  const unusedKeys = allPossibleKeys.filter(k => !usedKeys.includes(k));
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Section Key Analysis</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">Used Section Keys ({usedKeys.length})</h4>
          <ul className="text-sm space-y-1">
            {usedKeys.map(key => (
              <li key={key} className="text-green-700">
                <code className="bg-green-100 px-2 py-1 rounded">{key}</code>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">Available Section Keys ({unusedKeys.length})</h4>
          <ul className="text-sm space-y-1">
            {unusedKeys.map(key => (
              <li key={key} className="text-gray-600">
                <code className="bg-gray-100 px-2 py-1 rounded">{key}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Component to show risk flag analysis
function RiskFlagAnalysis({ data }: { data: ParsedTerms }) {
  // Extract risk flags from the data
  const riskFlags = {
    arbitration: data.sections.find(s => s.key === "disputes")?.facts?.arbitration || false,
    classActionWaiver: data.sections.find(s => s.key === "disputes")?.facts?.classActionWaiver || false,
    liabilityCap: data.sections.find(s => s.key === "liability")?.facts?.liabilityCap || null,
    terminationAtWill: data.sections.find(s => s.key === "termination")?.facts?.canSuspendAnytime || false,
    walletSelfCustody: data.sections.find(s => s.key === "wallet")?.facts?.selfCustody || false,
    irreversibleTxs: data.sections.find(s => s.key === "risks")?.facts?.irreversibleTxs || false,
    bridgingL2Risks: data.sections.find(s => s.key === "risks")?.facts?.bridgingL2 || false,
    optOutDays: data.sections.find(s => s.key === "disputes")?.facts?.optOutDays || null,
  };
  
  const activeRisks = Object.entries(riskFlags).filter(([_, value]) => 
    value === true || (typeof value === "number" && value > 0)
  );
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Risk Flag Analysis</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-red-50 p-4 rounded-lg">
          <h4 className="font-semibold text-red-800 mb-2">Active Risk Flags ({activeRisks.length})</h4>
          <ul className="text-sm space-y-1">
            {activeRisks.map(([key, value]) => (
              <li key={key} className="text-red-700">
                <code className="bg-red-100 px-2 py-1 rounded">{key}</code>
                {typeof value === "number" ? `: ${value}` : ""}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">All Risk Flags</h4>
          <ul className="text-sm space-y-1">
            {Object.entries(riskFlags).map(([key, value]) => (
              <li key={key} className={`${value ? "text-red-700" : "text-gray-600"}`}>
                <code className={`px-2 py-1 rounded ${value ? "bg-red-100" : "bg-gray-100"}`}>
                  {key}
                </code>
                {typeof value === "number" ? `: ${value}` : `: ${value}`}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Main demo component
export default function RealZoraExample() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Real Zora Terms Analysis</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          This demonstrates the enhanced ParsedTerms system with real Zora terms data, 
          showing how all the new section keys, risk detection, and enhanced features work together.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column: Analysis */}
        <div className="space-y-6">
          <SectionKeyAnalysis data={realZoraTerms} />
          <RiskFlagAnalysis data={realZoraTerms} />
        </div>
        
        {/* Right column: Widget */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Legal Easy Widget Output</h2>
          <div className="border rounded-lg p-4 bg-white shadow-sm">
            <LegalEasySummaryDynamic parsed={realZoraTerms} />
          </div>
        </div>
      </div>
      
      {/* Raw data display */}
      <RawDataDisplay data={realZoraTerms} />
      
      {/* Key insights */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">Key Insights from Real Zora Data</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-blue-700 mb-2">Enhanced Structure Benefits:</h4>
            <ul className="space-y-1 text-blue-600">
              <li>• 13 distinct section keys provide clear categorization</li>
              <li>• Jurisdiction field enables compliance tracking</li>
              <li>• Facts object enables machine-readable risk analysis</li>
              <li>• Bullets provide user-friendly summaries</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-blue-700 mb-2">Risk Detection Results:</h4>
            <ul className="space-y-1 text-blue-600">
              <li>• Arbitration: JAMS with 30-day opt-out</li>
              <li>• Class action waiver detected</li>
              <li>• Liability cap: $100</li>
              <li>• Termination at will: Yes</li>
              <li>• Self-custody: Yes</li>
              <li>• Irreversible transactions: Yes</li>
              <li>• L2 bridging risks: Yes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
