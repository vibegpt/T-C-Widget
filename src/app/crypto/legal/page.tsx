export default function CryptoLegalPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Legal Disclaimer & Terms</h1>

      {/* Primary Disclaimer */}
      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
        <h2 className="text-xl font-bold text-yellow-900 mb-3">
          ⚠️ Important Disclaimer
        </h2>
        <p className="text-yellow-900 font-medium">
          The information provided on this website is for informational purposes only and does not constitute legal, financial, or investment advice. You should consult with a qualified attorney before making any decisions based on the information presented here.
        </p>
      </div>

      {/* Not Legal Advice */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Not Legal Advice</h2>
        <p>
          This website provides simplified summaries of cryptocurrency exchange terms and conditions. These summaries are:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Created through automated analysis and may contain errors</li>
          <li>Not a substitute for reading the full terms and conditions</li>
          <li>Not legal advice and should not be relied upon as such</li>
          <li>Subject to change without notice</li>
          <li>Not endorsed or verified by the exchanges mentioned</li>
        </ul>
        <p className="font-medium">
          You MUST read the complete, official terms and conditions on each exchange's website before using their services.
        </p>
      </section>

      {/* No Attorney-Client Relationship */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">No Attorney-Client Relationship</h2>
        <p>
          Your use of this website does not create an attorney-client relationship between you and the operators of this website, LegalEasy, or any affiliated parties.
        </p>
      </section>

      {/* Accuracy and Timeliness */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Accuracy and Timeliness</h2>
        <p>
          While we strive to keep our information accurate and up-to-date:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Exchange terms can change at any time without our knowledge</li>
          <li>Our summaries may not reflect the most current version</li>
          <li>Automated analysis may misinterpret legal language</li>
          <li>We make no warranties about accuracy, completeness, or reliability</li>
        </ul>
        <p className="font-medium">
          Always verify information directly with the exchange before trading.
        </p>
      </section>

      {/* No Endorsement */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">No Endorsement or Affiliation</h2>
        <p>
          This website is not affiliated with, endorsed by, or sponsored by any of the cryptocurrency exchanges mentioned. We do not recommend or endorse any particular exchange. Any links to exchanges are provided for informational purposes only.
        </p>
      </section>

      {/* Investment Risk */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Investment and Trading Risks</h2>
        <p>
          Cryptocurrency trading carries significant risk of loss. You should:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Only trade with funds you can afford to lose</li>
          <li>Understand the risks of leverage and margin trading</li>
          <li>Consult with financial advisors before making trading decisions</li>
          <li>Conduct your own research and due diligence</li>
        </ul>
      </section>

      {/* Limitation of Liability */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, the operators of this website, LegalEasy, and any affiliated parties shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Your use or inability to use this website</li>
          <li>Any errors or omissions in the information provided</li>
          <li>Any trading or financial decisions made based on this information</li>
          <li>Any losses incurred from using cryptocurrency exchanges</li>
        </ul>
      </section>

      {/* Changes to Terms */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Changes to These Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. Continued use of this website after changes constitutes acceptance of the modified terms.
        </p>
      </section>

      {/* Contact */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Contact</h2>
        <p>
          For questions about this website or to report errors, please contact us at{' '}
          <a href="mailto:support@legaleasy.tools" className="text-blue-600 hover:underline">
            support@legaleasy.tools
          </a>
        </p>
      </section>

      {/* Last Updated */}
      <div className="text-sm text-gray-600 pt-6 border-t">
        Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
}
