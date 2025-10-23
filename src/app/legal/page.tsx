import Navigation from '@/components/navigation';
import Footer from '@/components/footer';

export default function LegalPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-foreground mb-8">Legal Information</h1>

      <div className="space-y-12">
        {/* Privacy Policy */}
        <section id="privacy">
          <h2 className="text-3xl font-semibold mb-4">Privacy Policy</h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 mb-4">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">1. Information We Collect</h3>
            <p className="mb-4">
              LegalEasy collects minimal information necessary to provide our service:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Store Information:</strong> Shopify store domain, store policies (terms, privacy, refund, shipping)</li>
              <li><strong>Usage Analytics:</strong> Which policies are analyzed, frequency of queries (anonymized)</li>
              <li><strong>Technical Data:</strong> API request logs for debugging and performance monitoring</li>
            </ul>
            <p className="mb-4">
              <strong>We DO NOT collect:</strong> Customer personal information, purchase history, or payment data.
              We only analyze the text of your store policies.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">2. How We Use Information</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Analyze store policies to provide plain-English summaries</li>
              <li>Improve our AI analysis algorithms</li>
              <li>Provide usage analytics to merchants</li>
              <li>Troubleshoot technical issues</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">3. Data Storage and Security</h3>
            <p className="mb-4">
              All data is stored securely using industry-standard encryption:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Data encrypted at rest (AES-256)</li>
              <li>Data encrypted in transit (TLS 1.3)</li>
              <li>Hosted on SOC 2 Type II certified infrastructure (Vercel/Supabase)</li>
              <li>Regular security audits and penetration testing</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4. Data Sharing</h3>
            <p className="mb-4">
              We do not sell or share your data with third parties, except:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Service Providers:</strong> OpenAI API for AI analysis (text only, no PII)</li>
              <li><strong>Legal Requirements:</strong> If required by law or to protect our rights</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">5. GDPR and CCPA Compliance</h3>
            <p className="mb-4">
              If you are in the EU or California, you have the right to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Request a copy of your data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of analytics tracking</li>
              <li>Request data portability</li>
            </ul>
            <p className="mb-4">
              Contact us at <a href="mailto:privacy@legaleasy.tools" className="text-blue-600 hover:underline">privacy@legaleasy.tools</a> to exercise these rights.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6. Data Retention</h3>
            <p className="mb-4">
              We retain data only as long as necessary:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Active Merchants:</strong> Data retained while app is installed</li>
              <li><strong>Uninstalled Merchants:</strong> Data deleted within 30 days of uninstallation</li>
              <li><strong>Analytics:</strong> Anonymized usage data retained for 12 months</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">7. Contact</h3>
            <p className="mb-4">
              For privacy questions or requests: <a href="mailto:privacy@legaleasy.tools" className="text-blue-600 hover:underline">privacy@legaleasy.tools</a>
            </p>
          </div>
        </section>

        {/* Terms of Service */}
        <section id="terms">
          <h2 className="text-3xl font-semibold mb-4">Terms of Service</h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 mb-4">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h3>
            <p className="mb-4">
              By installing or using LegalEasy, you agree to these Terms of Service. If you do not agree,
              please do not use the service.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">2. Service Description</h3>
            <p className="mb-4">
              LegalEasy is an AI-powered service that analyzes legal documents (terms of service, privacy
              policies, refund policies, etc.) and provides plain-English summaries. The service integrates
              with ChatGPT's Agentic Commerce platform and Shopify stores.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">3. Not Legal Advice</h3>
            <p className="mb-4 font-semibold text-red-600">
              IMPORTANT: LegalEasy is not a law firm and does not provide legal advice. Our summaries are
              for informational purposes only. For legal advice, consult a licensed attorney.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">4. Accuracy Disclaimer</h3>
            <p className="mb-4">
              While we strive for accuracy, LegalEasy uses AI and automated analysis which may contain errors.
              We do not guarantee the accuracy, completeness, or reliability of our summaries. Always review
              the original legal documents.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">5. User Obligations</h3>
            <p className="mb-4">You agree to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Use the service in compliance with all applicable laws</li>
              <li>Not attempt to reverse-engineer or copy our AI models</li>
              <li>Not use the service to analyze illegal or harmful content</li>
              <li>Maintain the security of your Shopify store credentials</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">6. Subscription and Billing</h3>
            <p className="mb-4">
              Paid plans are billed monthly through Shopify. You can cancel anytime from your Shopify admin.
              No refunds for partial months.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">7. Limitation of Liability</h3>
            <p className="mb-4">
              LegalEasy's liability is limited to the amount you paid in the last 12 months (or $100,
              whichever is greater). We are not liable for indirect, incidental, or consequential damages.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">8. Termination</h3>
            <p className="mb-4">
              We may suspend or terminate your access if you violate these terms. You can uninstall the app
              anytime from your Shopify admin.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">9. Changes to Terms</h3>
            <p className="mb-4">
              We may update these terms. We'll notify you of material changes via email or app notification.
              Continued use after changes constitutes acceptance.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">10. Governing Law</h3>
            <p className="mb-4">
              These terms are governed by the laws of Delaware, USA. Disputes will be resolved in Delaware courts.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">11. Contact</h3>
            <p className="mb-4">
              For questions about these terms: <a href="mailto:legal@legaleasy.tools" className="text-blue-600 hover:underline">legal@legaleasy.tools</a>
            </p>
          </div>
        </section>

        {/* Support Information */}
        <section id="support">
          <h2 className="text-3xl font-semibold mb-4">Support</h2>
          <div className="prose max-w-none">
            <p className="mb-4">
              Need help? We're here for you:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Email:</strong> <a href="mailto:support@legaleasy.tools" className="text-blue-600 hover:underline">support@legaleasy.tools</a></li>
              <li><strong>Response Time:</strong> Within 24 hours (business days)</li>
              <li><strong>Documentation:</strong> <a href="https://legaleasy.tools" className="text-blue-600 hover:underline">legaleasy.tools</a></li>
            </ul>
          </div>
        </section>
      </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
