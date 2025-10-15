/**
 * Example Usage of Legal Easy Components
 * -------------------------------------
 * This file demonstrates how to use the Legal Easy components with different data sources.
 */

import LegalEasySummaryDefault, { 
  LegalEasySummaryDynamic, 
  type ParsedTerms 
} from "@/components/LegalEasySummary";
import { 
  adaptKeyedObjectToParsed, 
  adaptRawTextToParsed,
  adaptParserOutput 
} from "@/components/adapters";

// Example 1: Using the default static component
export function ExampleDefault() {
  return <LegalEasySummaryDefault />;
}

// Example 2: Using dynamic component with structured data
export function ExampleDynamic() {
  const parsedTerms: ParsedTerms = {
    product: "Zora",
    updatedAt: "2025-01-21T10:30:00Z",
    sections: [
      {
        key: "rights",
        title: "Your Rights",
        bullets: ["You keep wallet & tokens (self-custody)."],
        body: "You own your content and tokens. You grant Zora a broad license to display/promote content.",
        facts: { selfCustody: true }
      },
      {
        key: "risks", 
        title: "Risks & Gotchas",
        bullets: ["Transactions are final", "Gas fees non-refundable"],
        body: "On-chain actions may be irreversible and incur fees.",
        facts: { irreversibleTxs: true, liabilityCap: 100 }
      },
      {
        key: "disputes",
        title: "Disputes", 
        bullets: ["Binding arbitration (JAMS)", "Class actions waived"],
        body: "Disputes go to JAMS arbitration; class actions and jury trials are waived.",
        facts: { arbitration: true, classActionWaiver: true }
      }
    ]
  };

  return <LegalEasySummaryDynamic parsed={parsedTerms} />;
}

// Example 3: Using adapter with keyed object
export function ExampleKeyedObject() {
  const keyedData = {
    rights: {
      bullets: ["You keep wallet & tokens (self-custody)."],
      body: "You own your content and tokens.",
      facts: { selfCustody: true }
    },
    risks: {
      bullets: ["Transactions are final", "Gas fees non-refundable"],
      body: "On-chain actions may be irreversible and incur fees.",
      facts: { irreversibleTxs: true, liabilityCap: 100 }
    },
    disputes: {
      bullets: ["Binding arbitration (JAMS)", "Class actions waived"],
      body: "Disputes go to JAMS arbitration; class actions and jury trials are waived.",
      facts: { arbitration: true, classActionWaiver: true }
    }
  };

  const parsedTerms = adaptKeyedObjectToParsed(keyedData);
  if (!parsedTerms) return <div>Failed to parse data</div>;

  return <LegalEasySummaryDynamic parsed={parsedTerms} />;
}

// Example 4: Using adapter with raw text
export function ExampleRawText() {
  const rawTermsText = `
    TERMS OF SERVICE
    
    You own your content and tokens. You grant Zora a broad license to display/promote content.
    Transactions are final and gas fees are non-refundable.
    Disputes go to JAMS arbitration; class actions and jury trials are waived.
    Zora may suspend or terminate accounts at its discretion.
  `;

  const parsedTerms = adaptRawTextToParsed("Zora", "2025-01-21T10:30:00Z", rawTermsText);
  return <LegalEasySummaryDynamic parsed={parsedTerms} />;
}

// Example 5: Using universal adapter
export function ExampleUniversalAdapter() {
  // This will work with any of the above data formats
  const result = adaptParserOutput({
    product: "Zora",
    updatedAt: "2025-01-21T10:30:00Z",
    parserOutput: {
      rights: { bullets: ["You keep wallet & tokens (self-custody)."] },
      risks: { bullets: ["Transactions are final"] },
      disputes: { bullets: ["Binding arbitration (JAMS)"] }
    }
    // Could also use: rawText: "raw terms text here"
  });

  return <LegalEasySummaryDynamic parsed={result} />;
}
