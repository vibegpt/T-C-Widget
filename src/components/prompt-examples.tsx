"use client";

/**
 * Legal Easy Prompt Examples
 * --------------------------
 * This file demonstrates how to use the Legal Easy prompt components
 * for user interaction and engagement.
 */

import { useState } from "react";
import { 
  LegalEasyPrompt, 
  LegalEasyPromptAligned, 
  LegalEasyAutoPrompt,
  LegalEasyPromptExample,
  LegalEasySummaryDefault 
} from "@/components/LegalEasySummary";

// Example 1: Basic prompt with custom branding
export function BasicPromptExample() {
  const [showSummary, setShowSummary] = useState(false);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Basic Prompt Example</h2>
      
      {!showSummary ? (
        <LegalEasyPrompt
          question="Want a quick summary of these terms?"
          ctaLabel="Yes"
          cancelLabel="No"
          brandColor="#00B3A6"  // Teal brand color
          brandIcon={<span>◆</span>}  // Diamond icon
          onAccept={() => setShowSummary(true)}
          onDismiss={() => setShowSummary(false)}
        />
      ) : (
        <div className="space-y-3">
          <button 
            onClick={() => setShowSummary(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to prompt
          </button>
          <LegalEasySummaryDefault />
        </div>
      )}
    </div>
  );
}

// Example 2: Aligned prompt that matches host site styling
export function AlignedPromptExample() {
  const [showSummary, setShowSummary] = useState(false);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Aligned Prompt Example</h2>
      
      {/* Simulate a host site's agree button */}
      <div className="p-4 border rounded-lg bg-gray-50">
        <p className="text-sm text-gray-600 mb-3">
          By clicking "I Agree" you accept our terms and conditions.
        </p>
        <button 
          id="agree-button"
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium"
        >
          I Agree
        </button>
      </div>

      {!showSummary && (
        <LegalEasyPromptAligned
          question="Want a summary of these terms?"
          ctaLabel="Yes"
          cancelLabel="No"
          brandColor="#7C3AED"  // Purple brand color
          brandIcon={<span>⚖️</span>}  // Scales icon
          referSelector="#agree-button"  // Reference the agree button for styling
          onAccept={() => setShowSummary(true)}
          onDismiss={() => setShowSummary(false)}
        />
      )}

      {showSummary && (
        <div className="space-y-3">
          <button 
            onClick={() => setShowSummary(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to prompt
          </button>
          <LegalEasySummaryDefault />
        </div>
      )}
    </div>
  );
}

// Example 3: Auto-prompt that finds and positions itself automatically
export function AutoPromptExample() {
  const [showSummary, setShowSummary] = useState(false);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Auto-Prompt Example</h2>
      
      {/* Simulate a terms section */}
      <div id="terms" className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-2">Terms of Service</h3>
        <p className="text-sm text-gray-600">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit...
        </p>
      </div>

      {/* Auto-prompt will automatically find and position itself */}
      <LegalEasyAutoPrompt
        question="Want a summary of these terms?"
        ctaLabel="Yes"
        cancelLabel="No"
        brandColor="#10B981"  // Green brand color
        brandIcon={<span>📋</span>}  // Clipboard icon
        termsSelectors={['#terms', '.terms', '[data-terms]']}
        agreeSelectors={['button', '[role="button"]']}
        onAccept={() => setShowSummary(true)}
        onDismiss={() => setShowSummary(false)}
      />

      {showSummary && (
        <div className="space-y-3">
          <button 
            onClick={() => setShowSummary(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to prompt
          </button>
          <LegalEasySummaryDefault />
        </div>
      )}
    </div>
  );
}

// Example 4: Built-in example component
export function BuiltInExample() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Built-in Example Component</h2>
      <LegalEasyPromptExample />
    </div>
  );
}

// Example 5: Custom styling and branding
export function CustomBrandingExample() {
  const [showSummary, setShowSummary] = useState(false);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Custom Branding Example</h2>
      
      <LegalEasyPrompt
        question="Need help understanding these terms?"
        ctaLabel="Yes, help me"
        cancelLabel="No thanks"
        brandColor="#F59E0B"  // Amber brand color
        brandIcon={<span>💡</span>}  // Lightbulb icon
        onAccept={() => setShowSummary(true)}
        onDismiss={() => setShowSummary(false)}
        className="border-2 border-amber-200 bg-amber-50"  // Custom styling
      />

      {showSummary && (
        <div className="space-y-3">
          <button 
            onClick={() => setShowSummary(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to prompt
          </button>
          <LegalEasySummaryDefault />
        </div>
      )}
    </div>
  );
}

// Example 6: Multiple prompts on the same page
export function MultiplePromptsExample() {
  const [showSummary1, setShowSummary1] = useState(false);
  const [showSummary2, setShowSummary2] = useState(false);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Multiple Prompts Example</h2>
      
      {/* First prompt */}
      <div className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-2">Privacy Policy</h3>
        <p className="text-sm text-gray-600 mb-3">
          We collect and use your data as described below...
        </p>
        
        {!showSummary1 ? (
          <LegalEasyPrompt
            question="Want a summary of our privacy policy?"
            ctaLabel="Yes"
            cancelLabel="No"
            brandColor="#3B82F6"  // Blue brand color
            brandIcon={<span>🔒</span>}  // Lock icon
            onAccept={() => setShowSummary1(true)}
            onDismiss={() => setShowSummary1(false)}
          />
        ) : (
          <div className="space-y-3">
            <button 
              onClick={() => setShowSummary1(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to prompt
            </button>
            <LegalEasySummaryDefault />
          </div>
        )}
      </div>

      {/* Second prompt */}
      <div className="p-4 border rounded-lg">
        <h3 className="font-semibold mb-2">Terms of Service</h3>
        <p className="text-sm text-gray-600 mb-3">
          By using our service, you agree to the following terms...
        </p>
        
        {!showSummary2 ? (
          <LegalEasyPrompt
            question="Need help understanding these terms?"
            ctaLabel="Yes"
            cancelLabel="No"
            brandColor="#EF4444"  // Red brand color
            brandIcon={<span>📄</span>}  // Document icon
            onAccept={() => setShowSummary2(true)}
            onDismiss={() => setShowSummary2(false)}
          />
        ) : (
          <div className="space-y-3">
            <button 
              onClick={() => setShowSummary2(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to prompt
            </button>
            <LegalEasySummaryDefault />
          </div>
        )}
      </div>
    </div>
  );
}

// Main demo component that shows all examples
export default function PromptExamplesDemo() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Legal Easy Prompt Examples</h1>
      <p className="text-gray-600">
        These examples demonstrate different ways to use the Legal Easy prompt components
        for engaging users and providing terms summaries.
      </p>
      
      <BasicPromptExample />
      <AlignedPromptExample />
      <AutoPromptExample />
      <BuiltInExample />
      <CustomBrandingExample />
      <MultiplePromptsExample />
    </div>
  );
}
