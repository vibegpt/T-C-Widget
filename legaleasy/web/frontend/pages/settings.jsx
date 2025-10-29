import { useState, useCallback, useEffect } from "react";
import {
  Card,
  Page,
  Layout,
  FormLayout,
  TextField,
  ColorPicker,
  Button,
  Banner,
  Text,
  Spinner,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { t } = useTranslation();
  const shopify = useAppBridge();

  // Widget settings state
  const [brandColor, setBrandColor] = useState({
    hue: 174,
    brightness: 0.71,
    saturation: 1,
  });
  const [brandIcon, setBrandIcon] = useState("◆");
  const [enabled, setEnabled] = useState(true);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Summary scanning state
  const [summaries, setSummaries] = useState([]);
  const [isScanning, setIsScanning] = useState({});
  const [scanResults, setScanResults] = useState({});

  // Convert hex to HSB for ColorPicker
  const hexToHsb = useCallback((hex) => {
    // Remove # if present
    hex = hex.replace('#', '');

    // Convert hex to RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let hue = 0;
    if (diff !== 0) {
      if (max === r) {
        hue = ((g - b) / diff) % 6;
      } else if (max === g) {
        hue = (b - r) / diff + 2;
      } else {
        hue = (r - g) / diff + 4;
      }
      hue = Math.round(hue * 60);
      if (hue < 0) hue += 360;
    }

    const saturation = max === 0 ? 0 : diff / max;
    const brightness = max;

    return {
      hue,
      saturation,
      brightness,
    };
  }, []);

  // Convert HSB to hex for display
  const hsbToHex = useCallback((hsb) => {
    const { hue, saturation, brightness } = hsb;
    const h = hue / 360;
    const s = saturation;
    const v = brightness;

    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
      default: r = 0; g = 0; b = 0;
    }

    const toHex = (x) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }, []);

  // Load settings and summaries on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const token = await shopify.idToken();

        // Load widget settings
        const settingsResponse = await fetch("/api/settings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (settingsResponse.ok) {
          const data = await settingsResponse.json();
          setEnabled(data.enabled);
          setBrandIcon(data.brand_icon);
          if (data.brand_color) {
            setBrandColor(hexToHsb(data.brand_color));
          }
        }

        // Load existing summaries
        const summariesResponse = await fetch("/api/summaries", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (summariesResponse.ok) {
          const data = await summariesResponse.json();
          setSummaries(data.summaries || []);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, [shopify, hexToHsb]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const token = await shopify.idToken();
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled,
          brandColor: hsbToHex(brandColor),
          brandIcon,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  }, [shopify, enabled, brandColor, brandIcon, hsbToHex]);

  const handleScanPolicy = useCallback(async (policyType) => {
    setIsScanning((prev) => ({ ...prev, [policyType]: true }));
    setScanResults((prev) => ({ ...prev, [policyType]: null }));

    try {
      const token = await shopify.idToken();
      const response = await fetch("/api/scan-policy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ policyType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to scan policy");
      }

      setScanResults((prev) => ({
        ...prev,
        [policyType]: { success: true, summary: data.summary },
      }));

      // Reload summaries
      const summariesResponse = await fetch("/api/summaries", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (summariesResponse.ok) {
        const summariesData = await summariesResponse.json();
        setSummaries(summariesData.summaries || []);
      }
    } catch (error) {
      console.error(`Error scanning ${policyType}:`, error);
      setScanResults((prev) => ({
        ...prev,
        [policyType]: { success: false, error: error.message },
      }));
    } finally {
      setIsScanning((prev) => ({ ...prev, [policyType]: false }));
    }
  }, [shopify]);

  if (isLoading) {
    return (
      <Page>
        <TitleBar title="Widget Settings" />
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Spinner size="large" />
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page>
      <TitleBar title="Widget Settings" />
      <Layout>
        <Layout.Section>
          {saveSuccess && (
            <Banner status="success" onDismiss={() => setSaveSuccess(false)}>
              Settings saved successfully!
            </Banner>
          )}
          {saveError && (
            <Banner status="critical" onDismiss={() => setSaveError(null)}>
              Error saving settings: {saveError}
            </Banner>
          )}

          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Text variant="headingMd" as="h2">
                Widget Appearance
              </Text>

              <FormLayout>
                <TextField
                  label="Brand Icon"
                  value={brandIcon}
                  onChange={setBrandIcon}
                  helpText="Enter an emoji or single character to represent your brand"
                  placeholder="◆"
                  maxLength={2}
                />

                <div>
                  <Text variant="bodyMd" as="p" fontWeight="medium">
                    Brand Color
                  </Text>
                  <div style={{ marginTop: '8px' }}>
                    <ColorPicker
                      onChange={setBrandColor}
                      color={brandColor}
                    />
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <Text variant="bodySm" as="p" tone="subdued">
                      Current color: {hsbToHex(brandColor)}
                    </Text>
                  </div>
                </div>
              </FormLayout>
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Text variant="headingMd" as="h2">
                Policy Summaries
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Scan your store's policies to generate summaries that will be shown to customers during checkout.
              </Text>

              {["terms_and_conditions", "privacy_policy", "refund_policy"].map((policyType) => {
                const summary = summaries.find((s) => s.policy_type === policyType);
                const result = scanResults[policyType];
                const scanning = isScanning[policyType];

                return (
                  <div key={policyType} style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text variant="bodyMd" as="p" fontWeight="semibold">
                          {policyType === 'terms_and_conditions' && 'Terms & Conditions'}
                          {policyType === 'privacy_policy' && 'Privacy Policy'}
                          {policyType === 'refund_policy' && 'Refund Policy'}
                        </Text>
                        <Button
                          size="slim"
                          onClick={() => handleScanPolicy(policyType)}
                          loading={scanning}
                          disabled={scanning}
                        >
                          {summary ? 'Re-scan' : 'Scan Now'}
                        </Button>
                      </div>

                      {summary && (
                        <Text variant="bodySm" as="p" tone="success">
                          ✓ Last scanned: {new Date(summary.last_scanned_at).toLocaleDateString()}
                        </Text>
                      )}

                      {result?.success && (
                        <Banner status="success" onDismiss={() => setScanResults((prev) => ({ ...prev, [policyType]: null }))}>
                          Policy scanned successfully!
                        </Banner>
                      )}

                      {result?.error && (
                        <Banner status="critical" onDismiss={() => setScanResults((prev) => ({ ...prev, [policyType]: null }))}>
                          {result.error}
                        </Banner>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Text variant="headingMd" as="h2">
                Installation Instructions
              </Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Text variant="bodyMd" as="p">
                  1. Go to your Shopify admin
                </Text>
                <Text variant="bodyMd" as="p">
                  2. Navigate to Online Store → Themes
                </Text>
                <Text variant="bodyMd" as="p">
                  3. Click "Customize" on your active theme
                </Text>
                <Text variant="bodyMd" as="p">
                  4. In the Theme Editor, click on "App embeds" in the left sidebar
                </Text>
                <Text variant="bodyMd" as="p">
                  5. Find "LegalEasy – Terms Summary" and toggle it ON
                </Text>
                <Text variant="bodyMd" as="p">
                  6. Save your changes
                </Text>
              </div>
            </div>
          </Card>

          <div style={{ marginTop: '16px' }}>
            <Button
              primary
              onClick={handleSave}
              loading={isSaving}
              disabled={isSaving}
            >
              Save Settings
            </Button>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
