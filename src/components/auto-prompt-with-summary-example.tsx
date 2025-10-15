/**
 * LegalEasyAutoPromptWithSummary Example
 * -------------------------------------
 * This demonstrates the enhanced component that combines auto-positioning
 * with automatic summary display.
 */

import { LegalEasyAutoPromptWithSummary, type ParsedTerms } from "@/components/LegalEasySummary";

// Example 1: Basic usage with default summary
export function BasicAutoPromptWithSummary() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Basic Auto-Prompt with Summary</h2>
      
      {/* Simulate a terms section */}
      <div id="terms" className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-2">Terms of Service</h3>
        <p className="text-sm text-gray-600">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis 
          nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
      </div>

      {/* Auto-prompt with summary - will position itself automatically */}
      <LegalEasyAutoPromptWithSummary
        brandColor="#00B3A6"
        brandIcon={<span>◆</span>}
        question="Want a summary of these terms?"
        ctaLabel="Yes"
        cancelLabel="No"
        // Uses default summary (LegalEasySummaryDefault)
      />
    </div>
  );
}

// Example 2: With custom parsed data
export function CustomParsedDataExample() {
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

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Custom Parsed Data Example</h2>
      
      {/* Simulate a terms section */}
      <div id="terms" className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-2">Terms of Service</h3>
        <p className="text-sm text-gray-600">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis 
          nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
      </div>

      {/* Auto-prompt with custom parsed data */}
      <LegalEasyAutoPromptWithSummary
        brandColor="#7C3AED"
        brandIcon={<span>⚖️</span>}
        question="Want a summary of these terms?"
        ctaLabel="Yes"
        cancelLabel="No"
        parsed={parsedTerms}  // Custom parsed data
      />
    </div>
  );
}

// Example 3: With analytics tracking
export function AnalyticsTrackingExample() {
  const handleAccept = () => {
    // Track user engagement
    console.log('Legal Easy prompt accepted', {
      page: 'terms',
      timestamp: new Date().toISOString()
    });
  };

  const handleDismiss = () => {
    console.log('Legal Easy prompt dismissed', {
      page: 'terms',
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Analytics Tracking Example</h2>
      
      {/* Simulate a terms section */}
      <div id="terms" className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-2">Terms of Service</h3>
        <p className="text-sm text-gray-600">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis 
          nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
      </div>

      {/* Auto-prompt with analytics tracking */}
      <LegalEasyAutoPromptWithSummary
        brandColor="#10B981"
        brandIcon={<span>📋</span>}
        question="Want a summary of these terms?"
        ctaLabel="Yes"
        cancelLabel="No"
        onAccept={handleAccept}
        onDismiss={handleDismiss}
      />
    </div>
  );
}

// Example 4: With custom selectors
export function CustomSelectorsExample() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Custom Selectors Example</h2>
      
      {/* Simulate a terms section with custom ID */}
      <div id="legal-document" className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-2">Terms of Service</h3>
        <p className="text-sm text-gray-600">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis 
          nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
      </div>

      {/* Custom agree button */}
      <button 
        id="accept-terms"
        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium"
      >
        Accept Terms
      </button>

      {/* Auto-prompt with custom selectors */}
      <LegalEasyAutoPromptWithSummary
        brandColor="#EF4444"
        brandIcon={<span>📄</span>}
        question="Want a summary of these terms?"
        ctaLabel="Yes"
        cancelLabel="No"
        termsSelectors={['#legal-document', '.legal-content']}
        agreeSelectors={['#accept-terms', 'button[name="accept"]']}
      />
    </div>
  );
}

// Example 5: Multiple prompts on same page
export function MultiplePromptsExample() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Multiple Prompts Example</h2>
      
      {/* Privacy Policy Section */}
      <div id="privacy-policy" className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-2">Privacy Policy</h3>
        <p className="text-sm text-gray-600">
          We collect and use your data as described below...
        </p>
      </div>

      {/* Terms of Service Section */}
      <div id="terms-of-service" className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-2">Terms of Service</h3>
        <p className="text-sm text-gray-600">
          By using our service, you agree to the following terms...
        </p>
      </div>

      {/* Privacy Policy Prompt */}
      <LegalEasyAutoPromptWithSummary
        brandColor="#3B82F6"
        brandIcon={<span>🔒</span>}
        question="Want a summary of our privacy policy?"
        ctaLabel="Yes"
        cancelLabel="No"
        termsSelectors={['#privacy-policy', '.privacy-section']}
        agreeSelectors={['button[name="privacy-agree"]']}
      />

      {/* Terms of Service Prompt */}
      <LegalEasyAutoPromptWithSummary
        brandColor="#F59E0B"
        brandIcon={<span>📄</span>}
        question="Need help understanding these terms?"
        ctaLabel="Yes"
        cancelLabel="No"
        termsSelectors={['#terms-of-service', '.terms-section']}
        agreeSelectors={['button[name="terms-agree"]']}
      />
    </div>
  );
}

// Main demo component
export default function AutoPromptWithSummaryDemo() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">LegalEasyAutoPromptWithSummary Examples</h1>
      <p className="text-gray-600">
        These examples demonstrate the enhanced component that combines auto-positioning
        with automatic summary display. When users accept the prompt, they automatically
        see the summary below.
      </p>
      
      <BasicAutoPromptWithSummary />
      <CustomParsedDataExample />
      <AnalyticsTrackingExample />
      <CustomSelectorsExample />
      <MultiplePromptsExample />
    </div>
  );
}
