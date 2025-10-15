import { client } from '@/lib/sanity';
import Link from 'next/link';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import { PortableText } from '@portabletext/react';

async function getMarketIssue(slug: string) {
  const query = `*[_type == "marketIssue" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    category,
    severity,
    summary,
    whatHappens,
    whyItHappens,
    legalFramework,
    realWorldExamples,
    protectYourself,
    redFlags,
    relatedPlatforms,
    lastUpdated
  }`;

  return await client.fetch(query, { slug });
}

const severityConfig: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Critical - Can cause total loss', icon: '🔴', color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-800' },
  high: { label: 'High - Significant financial impact', icon: '🟠', color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-800' },
  medium: { label: 'Medium - Moderate impact', icon: '🟡', color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-800' },
  low: { label: 'Low - Minor inconvenience', icon: '🟢', color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-800' },
};

const platformTypeRoutes: Record<string, string> = {
  cex: '/crypto/cex',
  dex: '/crypto/dex',
  predictionMarket: '/crypto/prediction-markets',
  thirdPartyApp: '/crypto/third-party-apps',
};

export default async function MarketIssuePage({ params }: { params: { slug: string } }) {
  const issue = await getMarketIssue(params.slug);

  if (!issue) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">Issue Not Found</h1>
            <Link href="/crypto/market-issues" className="text-blue-600 hover:text-blue-700">
              ← Back to Market Issues
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const severity = severityConfig[issue.severity] || severityConfig.medium;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      {/* Header */}
      <section className="bg-gradient-to-b from-gray-900 to-background py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/crypto/market-issues" className="text-green-600 hover:text-green-700 mb-4 inline-block text-sm">
            ← Back to Market Issues
          </Link>

          <div className={`inline-block px-4 py-2 rounded-lg mb-4 ${severity.bg} border ${severity.border}`}>
            <span className={`text-sm font-semibold ${severity.color}`}>
              {severity.icon} {severity.label}
            </span>
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-4">{issue.title}</h1>
          <p className="text-lg text-foreground/70 leading-relaxed">{issue.summary}</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="flex-1 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          {/* What Happens */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">What Happens to Users</h2>
            <div className="prose prose-invert max-w-none">
              <PortableText value={issue.whatHappens} />
            </div>
          </div>

          {/* Why It Happens */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Why It Happens</h2>
            <div className="prose prose-invert max-w-none">
              <PortableText value={issue.whyItHappens} />
            </div>
          </div>

          {/* Legal Framework */}
          <div className="bg-yellow-900/10 border border-yellow-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">⚖️ Legal Framework - How Platforms Cover It</h2>
            <div className="prose prose-invert max-w-none">
              <PortableText value={issue.legalFramework} />
            </div>
          </div>

          {/* Real-World Examples */}
          {issue.realWorldExamples && issue.realWorldExamples.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">📋 Real-World Examples</h2>
              <div className="space-y-4">
                {issue.realWorldExamples.map((example: any, idx: number) => (
                  <div key={idx} className="border border-gray-800 rounded-lg p-6 bg-gray-900/30">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {example.platform}
                        </h3>
                        {example.date && (
                          <p className="text-sm text-foreground/50">
                            {new Date(example.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                          </p>
                        )}
                      </div>
                      {example.platformSlug && (
                        <Link
                          href={`${platformTypeRoutes[example.platformType]}/${example.platformSlug}`}
                          className="text-sm text-green-600 hover:text-green-700"
                        >
                          View Platform →
                        </Link>
                      )}
                    </div>
                    <p className="text-foreground/80 mb-3">{example.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-foreground/50">User Impact:</span>
                        <p className="text-foreground">{example.userImpact}</p>
                      </div>
                      <div>
                        <span className="text-foreground/50">Resolution:</span>
                        <p className="text-foreground">{example.resolution}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How to Protect Yourself */}
          <div className="bg-green-900/10 border border-green-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">🛡️ How to Protect Yourself</h2>
            <div className="prose prose-invert max-w-none">
              <PortableText value={issue.protectYourself} />
            </div>
          </div>

          {/* Red Flags */}
          {issue.redFlags && issue.redFlags.length > 0 && (
            <div className="bg-red-900/10 border border-red-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">🚩 Red Flags to Watch For</h2>
              <ul className="space-y-2">
                {issue.redFlags.map((flag: string, idx: number) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-red-400 mr-2">•</span>
                    <span className="text-foreground/80">{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Platforms */}
          {issue.relatedPlatforms && issue.relatedPlatforms.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Platforms Affected</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {issue.relatedPlatforms.map((platform: any, idx: number) => (
                  <div key={idx} className="border border-gray-800 rounded-lg p-4 bg-gray-900/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{platform.platformName}</h3>
                        <p className="text-sm text-foreground/60 capitalize">{platform.platformType}</p>
                        {platform.hasExplicitTerms && (
                          <span className="text-xs text-yellow-600 mt-1 inline-block">
                            ✓ Mentioned in terms
                          </span>
                        )}
                      </div>
                      {platform.platformSlug && (
                        <Link
                          href={`${platformTypeRoutes[platform.platformType]}/${platform.platformSlug}`}
                          className="text-sm text-green-600 hover:text-green-700"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last Updated */}
          {issue.lastUpdated && (
            <div className="text-sm text-foreground/50 text-center">
              Last updated: {new Date(issue.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
