/**
 * Enhanced Types Example
 * ---------------------
 * This demonstrates how to use the new enhanced ParsedTerms types with
 * comprehensive section keys and improved risk detection.
 */

import { 
  LegalEasySummaryDynamic, 
  type ParsedTerms, 
  type SectionKey 
} from "@/components/LegalEasySummary";

// Example 1: Comprehensive Zora Terms with all section types
export function ComprehensiveZoraExample() {
  const parsedTerms: ParsedTerms = {
    product: "Zora",
    updatedAt: "2025-01-21T10:30:00Z",
    jurisdiction: ["Delaware", "USA"],
    sections: [
      {
        key: "wallet",
        title: "Wallet & Self-Custody",
        bullets: ["You keep wallet & tokens (self-custody).", "You control your private keys."],
        body: "You own your content and tokens. You grant Zora a broad license to display/promote content.",
        facts: { selfCustody: true }
      },
      {
        key: "services",
        title: "Services",
        bullets: ["Zora provides NFT marketplace services.", "Services may be modified or discontinued."],
        body: "Zora operates a decentralized marketplace for NFTs and digital collectibles.",
        facts: { serviceType: "marketplace", canModify: true }
      },
      {
        key: "tokens",
        title: "Tokens",
        bullets: ["Tokens are collectibles, not investments.", "High volatility expected."],
        body: "Tokens are framed as collectibles, not investments or securities. No profit promises; high volatility expected.",
        facts: { investmentDisclaimer: true, volatility: "high" }
      },
      {
        key: "fees",
        title: "Fees",
        bullets: ["Gas fees are non-refundable.", "Platform fees may apply."],
        body: "Gas fees are non-refundable, wallet/seed loss = asset loss, bridging & L2 (7-day exits) carry risks.",
        facts: { gasNonRefundable: true, platformFees: true }
      },
      {
        key: "risks",
        title: "Risks & Gotchas",
        bullets: ["Transactions are final", "Gas fees non-refundable", "Bridging/L2 adds risk"],
        body: "On-chain actions may be irreversible and incur fees. Bridging/L2 use has technical and withdrawal-delay risks.",
        facts: { 
          irreversibleTxs: true, 
          bridgingL2: true, 
          liabilityCap: 100 
        }
      },
      {
        key: "disputes",
        title: "Disputes",
        bullets: ["Binding arbitration (JAMS)", "Class actions waived", "30-day opt-out period"],
        body: "Disputes go to JAMS arbitration; class actions and jury trials are waived. You can opt out within 30 days by mailing a letter to Zora's legal address.",
        facts: { 
          arbitration: true, 
          classActionWaiver: true,
          optOutDays: 30
        }
      },
      {
        key: "liability",
        title: "Liability",
        bullets: ["Liability cap: $100", "Limited warranties"],
        body: "Zora's liability is limited to the greater of $100 or what you paid them directly for the specific service.",
        facts: { liabilityCap: 100 }
      },
      {
        key: "termination",
        title: "Account Termination",
        bullets: ["Platform can suspend accounts at any time", "No prior notice required"],
        body: "Zora may suspend or terminate accounts, block tokens/features, and update Terms without prior notice.",
        facts: { canSuspendAnytime: true, noNoticeRequired: true }
      },
      {
        key: "modifications",
        title: "Terms Modifications",
        bullets: ["Terms can be updated at any time", "Continued use = acceptance"],
        body: "Zora may update these Terms at any time. Continued use of the service constitutes acceptance of the updated Terms.",
        facts: { canUpdateAnytime: true, continuedUseAcceptance: true }
      },
      {
        key: "privacy",
        title: "Privacy",
        bullets: ["Data collection for service operation", "Third-party integrations"],
        body: "We collect and use your data as described in our Privacy Policy to operate the service and provide features.",
        facts: { dataCollection: true, thirdPartyIntegrations: true }
      },
      {
        key: "ip",
        title: "Intellectual Property",
        bullets: ["You retain ownership of your content", "Zora gets broad license"],
        body: "You retain ownership of your content and intellectual property. You grant Zora a broad license to display and promote your content.",
        facts: { userRetainsOwnership: true, broadLicense: true }
      },
      {
        key: "governing_law",
        title: "Governing Law",
        bullets: ["Delaware law applies", "Federal courts have jurisdiction"],
        body: "These Terms are governed by Delaware law. Any disputes will be resolved in federal courts.",
        facts: { governingLaw: "Delaware", jurisdiction: "federal" }
      }
    ]
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Comprehensive Zora Terms Example</h2>
      <p className="text-sm text-gray-600">
        This example shows all the new section types and enhanced risk detection.
      </p>
      <LegalEasySummaryDynamic parsed={parsedTerms} />
    </div>
  );
}

// Example 2: Minimal terms with just key sections
export function MinimalTermsExample() {
  const parsedTerms: ParsedTerms = {
    product: "SimpleApp",
    updatedAt: "2025-01-21T10:30:00Z",
    sections: [
      {
        key: "wallet",
        title: "Your Wallet",
        bullets: ["You control your wallet and private keys."],
        facts: { selfCustody: true }
      },
      {
        key: "risks",
        title: "Risks",
        bullets: ["Transactions are irreversible.", "Gas fees apply."],
        facts: { irreversibleTxs: true }
      },
      {
        key: "disputes",
        title: "Disputes",
        bullets: ["Arbitration required.", "Class actions waived."],
        facts: { arbitration: true, classActionWaiver: true }
      }
    ]
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Minimal Terms Example</h2>
      <p className="text-sm text-gray-600">
        This example shows a minimal terms structure with just the essential sections.
      </p>
      <LegalEasySummaryDynamic parsed={parsedTerms} />
    </div>
  );
}

// Example 3: Platform-specific terms (e.g., DeFi protocol)
export function DeFiProtocolExample() {
  const parsedTerms: ParsedTerms = {
    product: "DeFiProtocol",
    updatedAt: "2025-01-21T10:30:00Z",
    jurisdiction: ["Switzerland", "EU"],
    sections: [
      {
        key: "eligibility",
        title: "Eligibility",
        bullets: ["Must be 18+ years old", "Not available in restricted jurisdictions"],
        body: "You must be at least 18 years old and not located in restricted jurisdictions to use this service.",
        facts: { minAge: 18, restrictedJurisdictions: true }
      },
      {
        key: "compliance",
        title: "Compliance",
        bullets: ["KYC/AML requirements", "Tax reporting obligations"],
        body: "Users must comply with KYC/AML requirements and are responsible for their own tax reporting.",
        facts: { kycRequired: true, amlRequired: true, taxReporting: "user" }
      },
      {
        key: "wallet",
        title: "Wallet & Self-Custody",
        bullets: ["You control your wallet", "Private key security is your responsibility"],
        body: "You maintain full control of your wallet and private keys. We cannot recover lost keys.",
        facts: { selfCustody: true, keyRecovery: false }
      },
      {
        key: "tokens",
        title: "Protocol Tokens",
        bullets: ["Governance tokens", "Utility tokens", "High volatility"],
        body: "Protocol tokens are used for governance and utility. They are highly volatile and not investment advice.",
        facts: { tokenType: "governance", volatility: "high", investmentDisclaimer: true }
      },
      {
        key: "fees",
        title: "Fees",
        bullets: ["Gas fees", "Protocol fees", "Slippage"],
        body: "All transactions incur gas fees. Protocol fees and slippage may apply to trades.",
        facts: { gasFees: true, protocolFees: true, slippage: true }
      },
      {
        key: "risks",
        title: "DeFi Risks",
        bullets: ["Smart contract risks", "Liquidity risks", "Impermanent loss"],
        body: "DeFi protocols carry smart contract risks, liquidity risks, and impermanent loss risks.",
        facts: { 
          smartContractRisk: true, 
          liquidityRisk: true, 
          impermanentLoss: true,
          liabilityCap: 1000
        }
      },
      {
        key: "disputes",
        title: "Disputes",
        bullets: ["Swiss law applies", "Arbitration in Zurich", "60-day opt-out"],
        body: "Disputes are governed by Swiss law and resolved through arbitration in Zurich. You have 60 days to opt out.",
        facts: { 
          governingLaw: "Swiss", 
          arbitration: true, 
          optOutDays: 60
        }
      },
      {
        key: "liability",
        title: "Liability",
        bullets: ["Liability cap: $1,000", "No warranties"],
        body: "Our liability is limited to $1,000. We provide no warranties about the protocol.",
        facts: { liabilityCap: 1000, warranties: false }
      }
    ]
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">DeFi Protocol Example</h2>
      <p className="text-sm text-gray-600">
        This example shows platform-specific terms for a DeFi protocol with compliance requirements.
      </p>
      <LegalEasySummaryDynamic parsed={parsedTerms} />
    </div>
  );
}

// Example 4: California-specific terms
export function CaliforniaTermsExample() {
  const parsedTerms: ParsedTerms = {
    product: "CaliforniaApp",
    updatedAt: "2025-01-21T10:30:00Z",
    jurisdiction: ["California", "USA"],
    sections: [
      {
        key: "wallet",
        title: "Wallet & Self-Custody",
        bullets: ["You control your wallet and private keys."],
        facts: { selfCustody: true }
      },
      {
        key: "risks",
        title: "Risks",
        bullets: ["Transactions are irreversible.", "Gas fees apply."],
        facts: { irreversibleTxs: true }
      },
      {
        key: "disputes",
        title: "Disputes",
        bullets: ["Arbitration required.", "Class actions waived."],
        facts: { arbitration: true, classActionWaiver: true }
      },
      {
        key: "california_notice",
        title: "California Privacy Rights",
        bullets: ["CCPA compliance", "Right to delete", "Right to opt-out"],
        body: "California residents have additional privacy rights under the California Consumer Privacy Act (CCPA).",
        facts: { ccpaCompliance: true, rightToDelete: true, rightToOptOut: true }
      }
    ]
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">California Terms Example</h2>
      <p className="text-sm text-gray-600">
        This example shows terms with California-specific privacy rights.
      </p>
      <LegalEasySummaryDynamic parsed={parsedTerms} />
    </div>
  );
}

// Main demo component
export default function EnhancedTypesDemo() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Enhanced Types Examples</h1>
      <p className="text-gray-600">
        These examples demonstrate the new enhanced ParsedTerms types with comprehensive
        section keys, improved risk detection, and better categorization.
      </p>
      
      <div className="space-y-6">
        <ComprehensiveZoraExample />
        <MinimalTermsExample />
        <DeFiProtocolExample />
        <CaliforniaTermsExample />
      </div>
    </div>
  );
}
