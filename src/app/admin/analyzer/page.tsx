'use client';

import { useState, useEffect } from 'react';

interface Exchange {
  _id: string;
  name: string;
  slug: { current: string };
}

export default function AnalyzerPage() {
  const [exchangeName, setExchangeName] = useState('');
  const [exchangeType, setExchangeType] = useState('CEX');
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<string>('');
  const [termsUrl, setTermsUrl] = useState('');
  const [founded, setFounded] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');

  const analyzeTerms = async () => {
    if (!text || !exchangeName) {
      setError('Please provide exchange name and T&C text');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const response = await fetch('/api/analyze-terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          exchangeName,
          exchangeType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysis(data.analysis);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  };

  // Fetch existing exchanges on mount
  useEffect(() => {
    const fetchExchanges = async () => {
      try {
        const response = await fetch('/api/get-exchanges');
        const data = await response.json();
        if (data.exchanges) {
          setExchanges(data.exchanges);
        }
      } catch (err) {
        console.error('Failed to fetch exchanges:', err);
      }
    };
    fetchExchanges();
  }, []);

  // Update form when selecting an existing exchange
  useEffect(() => {
    if (selectedExchange) {
      const exchange = exchanges.find(e => e._id === selectedExchange);
      if (exchange) {
        setExchangeName(exchange.name);
      }
    }
  }, [selectedExchange, exchanges]);

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    alert('Copied to clipboard!');
  };

  const saveToSanity = async () => {
    if (!analysis || !exchangeName) {
      setError('No analysis to save or missing exchange name');
      return;
    }

    setSaving(true);
    setSaveSuccess('');
    setError('');

    try {
      const slug = exchangeName.toLowerCase().replace(/\s+/g, '-');

      const response = await fetch('/api/save-to-sanity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exchangeId: selectedExchange || undefined,
          exchangeName,
          slug,
          analysis,
          termsUrl: termsUrl || undefined,
          founded: founded || undefined,
          jurisdiction: jurisdiction || undefined,
          exchangeType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save to Sanity');
      }

      setSaveSuccess(data.message || 'Successfully saved to Sanity!');

      // Refresh exchanges list
      const exchangesResponse = await fetch('/api/get-exchanges');
      const exchangesData = await exchangesResponse.json();
      if (exchangesData.exchanges) {
        setExchanges(exchangesData.exchanges);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save to Sanity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">T&C Analyzer</h1>
          <p className="text-foreground/60">Admin tool - Analyze exchange terms and conditions</p>
        </div>

        {/* Input Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Existing Exchange (Optional)
            </label>
            <select
              value={selectedExchange}
              onChange={(e) => setSelectedExchange(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-background border border-gray-700 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">-- Create New Exchange --</option>
              {exchanges.map((exchange) => (
                <option key={exchange._id} value={exchange._id}>
                  {exchange.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-foreground/50 mt-1">
              Select to update an existing exchange, or leave blank to create a new one
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Exchange Name *
              </label>
              <input
                type="text"
                value={exchangeName}
                onChange={(e) => setExchangeName(e.target.value)}
                placeholder="e.g., Binance"
                className="w-full px-4 py-2 rounded-lg bg-background border border-gray-700 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Type
              </label>
              <select
                value={exchangeType}
                onChange={(e) => setExchangeType(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-background border border-gray-700 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="CEX">CEX</option>
                <option value="DEX">DEX</option>
                <option value="Third Party App">Third Party App</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Founded Year
              </label>
              <input
                type="text"
                value={founded}
                onChange={(e) => setFounded(e.target.value)}
                placeholder="e.g., 2017"
                className="w-full px-4 py-2 rounded-lg bg-background border border-gray-700 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Jurisdiction/HQ
              </label>
              <input
                type="text"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder="e.g., United States"
                className="w-full px-4 py-2 rounded-lg bg-background border border-gray-700 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Terms & Conditions URL
              </label>
              <input
                type="url"
                value={termsUrl}
                onChange={(e) => setTermsUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 rounded-lg bg-background border border-gray-700 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Terms & Conditions Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the full Terms & Conditions text here..."
              rows={12}
              className="w-full px-4 py-3 rounded-lg bg-background border border-gray-700 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono text-sm"
            />
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {saveSuccess && (
            <div className="mb-4 p-4 bg-green-900/20 border border-green-800 rounded-lg text-green-400">
              {saveSuccess}
            </div>
          )}

          <button
            onClick={analyzeTerms}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Analyzing...' : 'Analyze Terms & Conditions'}
          </button>
        </div>

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Quick Summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-foreground">Analysis Results</h2>
                <div className="flex gap-2">
                  <button
                    onClick={saveToSanity}
                    disabled={saving}
                    className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save to Sanity'}
                  </button>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(analysis, null, 2))}
                    className="text-sm bg-gray-800 text-foreground px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Copy JSON
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-sm text-foreground/60">Overall Rating:</span>
                  <div className="mt-2">
                    <span className={`inline-block px-4 py-2 rounded-lg font-medium ${
                      analysis.overallRating === 'good' ? 'bg-green-900/20 text-green-600 border border-green-800' :
                      analysis.overallRating === 'risky' ? 'bg-red-900/20 text-red-600 border border-red-800' :
                      'bg-yellow-900/20 text-yellow-600 border border-yellow-800'
                    }`}>
                      {analysis.overallRating === 'good' ? '🟢 User-Friendly' :
                       analysis.overallRating === 'risky' ? '🔴 High Risk' :
                       '🟡 Mixed Policies'}
                    </span>
                  </div>
                </div>
                {analysis.riskScore !== undefined && (
                  <div>
                    <span className="text-sm text-foreground/60">Risk Score:</span>
                    <div className="mt-2">
                      <span className={`inline-block px-4 py-2 rounded-lg font-bold text-2xl ${
                        analysis.riskScore <= 3 ? 'text-green-600' :
                        analysis.riskScore <= 6 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {analysis.riskScore}/10
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <span className="text-sm text-foreground/60">Quick Summary:</span>
                <p className="mt-2 text-foreground/80">{analysis.quickSummary}</p>
              </div>
            </div>

            {/* Policies by Section */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">Policies by Category ({analysis.policies?.length || 0})</h3>

              {(() => {
                const sectionNames = {
                  account: '👤 Account Management',
                  trading: '📊 Trading & Funds',
                  dispute: '⚖️ Dispute Resolution',
                  liability: '🛡️ Liability & Risk',
                  fees: '💰 Fees & Costs',
                  privacy: '🔒 Data & Privacy',
                  other: '📋 Other'
                };

                const grouped = (analysis.policies || []).reduce((acc: any, policy: any) => {
                  const section = policy.section || 'other';
                  if (!acc[section]) acc[section] = [];
                  acc[section].push(policy);
                  return acc;
                }, {});

                return (
                  <div className="space-y-6">
                    {Object.entries(grouped).map(([section, policies]: [string, any]) => (
                      <div key={section} className="border border-gray-700 rounded-lg p-4">
                        <h4 className="text-lg font-bold text-foreground mb-3">
                          {sectionNames[section as keyof typeof sectionNames]} ({policies.length})
                        </h4>
                        <div className="space-y-3">
                          {policies.map((policy: any, index: number) => (
                            <div
                              key={index}
                              className={`border rounded-lg p-3 ${
                                policy.category === 'good' ? 'border-green-800 bg-green-900/10' :
                                policy.category === 'bad' ? 'border-red-800 bg-red-900/10' :
                                'border-blue-800 bg-blue-900/10'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h5 className={`font-bold text-sm ${
                                  policy.category === 'good' ? 'text-green-600' :
                                  policy.category === 'bad' ? 'text-red-600' :
                                  'text-blue-600'
                                }`}>
                                  {policy.category === 'good' ? '✅' : policy.category === 'bad' ? '⚠️' : 'ℹ️'} {policy.title}
                                </h5>
                                <span className="text-xs px-2 py-1 bg-gray-800 rounded text-foreground/60">
                                  {policy.impact}
                                </span>
                              </div>
                              <p className="text-sm text-foreground/80 mb-1">{policy.summary}</p>
                              <p className="text-xs text-foreground/60">{policy.details}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Key Takeaways */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">Key Takeaways</h3>
              <ul className="space-y-2">
                {analysis.keyTakeaways?.map((takeaway: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span className="text-foreground/80">{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Instructions */}
            <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-blue-400 mb-3">Next Steps</h3>
              <ol className="space-y-2 text-sm text-foreground/80">
                <li>1. Click "Save to Sanity" button above to automatically save this analysis</li>
                <li>2. Go to http://localhost:3000/studio to add an image and make any final edits</li>
                <li>3. Click "Publish" in Sanity to make it live on the website</li>
                <li>4. View at http://localhost:3000/crypto/cex/{exchangeName.toLowerCase().replace(/\s+/g, '-')}</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
