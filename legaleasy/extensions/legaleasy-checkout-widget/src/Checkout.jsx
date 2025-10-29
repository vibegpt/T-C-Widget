import {
  reactExtension,
  Banner,
  Button,
  Modal,
  Text,
  BlockStack,
  InlineStack,
  Icon,
  useApi,
} from '@shopify/ui-extensions-react/checkout';
import { useState, useEffect } from 'react';

export default reactExtension(
  'purchase.checkout.footer.render-after',
  () => <LegalEasySummary />
);

function LegalEasySummary() {
  const { shop } = useApi();
  const [showModal, setShowModal] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch merchant config from Railway backend
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch(
          `https://t-c-widget-production.up.railway.app/apps/legaleasy/config?shop=${shop.myshopifyDomain}`
        );
        if (response.ok) {
          const config = await response.json();
          if (!config.enabled) {
            // Widget disabled by merchant
            return;
          }
        }
      } catch (error) {
        console.error('[LegalEasy] Error fetching config:', error);
      }
    }

    fetchConfig();
  }, [shop]);

  // Parse T&C when button clicked
  const handleAnalyze = async () => {
    setLoading(true);
    try {
      // Fetch the T&C page content
      const tocResponse = await fetch(`https://${shop.myshopifyDomain}/policies/terms-of-service`);
      const html = await tocResponse.text();

      // Extract text from HTML (simple approach)
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const termsText = doc.body.innerText || doc.body.textContent;

      // Parse using the same logic as the loader
      const parsed = parseTermsSimplified(termsText);
      setSummary(parsed);
      setShowModal(true);
    } catch (error) {
      console.error('[LegalEasy] Error analyzing terms:', error);
    } finally {
      setLoading(false);
    }
  };

  // Simplified parser for checkout (key points only)
  function parseTermsSimplified(text) {
    const clean = (t) => t.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanText = clean(text);

    const parsed = {
      hasArbitration: /(binding,?\s*individual\s*arbitration|arbitration.*JAMS)/i.test(cleanText),
      hasClassWaiver: /waiv(e|er).{0,40}class (action|representative)/i.test(cleanText),
      liabilityCap: null,
      terminationAtWill: /(suspend|terminate).*(any\s*time|sole\s*discretion)/i.test(cleanText),
    };

    // Extract liability cap
    const mLiab = cleanText.match(/(?:maximum|aggregate|overall).{0,40}liability.{0,40}(\$\s?[\d,]+)/i);
    if (mLiab) {
      const match = mLiab[1].replace(/[,\s]/g, '').match(/\$?(\d+(?:\.\d+)?)/);
      if (match) parsed.liabilityCap = Number(match[1]);
    }

    return parsed;
  }

  return (
    <BlockStack spacing="base">
      <InlineStack spacing="tight" blockAlignment="center">
        <Icon source="info" />
        <Button
          kind="plain"
          onPress={handleAnalyze}
          loading={loading}
        >
          Analyze Terms & Conditions
        </Button>
      </InlineStack>

      {showModal && summary && (
        <Modal
          id="terms-summary-modal"
          onClose={() => setShowModal(false)}
          title="Terms & Conditions Summary"
        >
          <BlockStack spacing="base">
            {(summary.hasArbitration || summary.hasClassWaiver || summary.terminationAtWill) && (
              <Banner status="warning">
                <BlockStack spacing="tight">
                  <Text size="medium" emphasis="bold">Heads up:</Text>
                  {summary.hasArbitration && <Text>• Disputes go to binding arbitration</Text>}
                  {summary.hasClassWaiver && <Text>• Class actions are waived</Text>}
                  {summary.terminationAtWill && <Text>• Platform can suspend/terminate at its discretion</Text>}
                  {summary.liabilityCap && (
                    <Text>• Liability cap: ${summary.liabilityCap.toLocaleString()}</Text>
                  )}
                </BlockStack>
              </Banner>
            )}

            <BlockStack spacing="tight">
              <Text size="small" appearance="subdued">
                This summary is for convenience only and not legal advice. Please read the full terms before agreeing.
              </Text>
            </BlockStack>
          </BlockStack>
        </Modal>
      )}
    </BlockStack>
  );
}
