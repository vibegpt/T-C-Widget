import Link from 'next/link';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import { client } from '@/lib/sanity';
import imageUrlBuilder from '@sanity/image-url';
import { PortableText } from '@portabletext/react';

const builder = imageUrlBuilder(client);

function urlFor(source: any) {
  return builder.image(source);
}

async function getExchange(slug: string) {
  const query = `*[_type == "cex" && slug.current == $slug][0]{
    _id,
    name,
    description,
    image,
    founded,
    jurisdiction,
    overallRating,
    quickSummary,
    termsUrl,
    riskScore,
    policies[]{
      section,
      title,
      category,
      summary,
      details,
      impact
    },
    keyTakeaways
  }`;

  const exchange = await client.fetch(query, { slug });
  return exchange;
}

export default async function ExchangeDetailPage({ params }: { params: { slug: string } }) {
  const exchange = await getExchange(params.slug);

  if (!exchange) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">Exchange Not Found</h1>
            <Link href="/crypto/cex" className="text-blue-600 hover:text-blue-700">
              ← Back to CEX List
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const ratingConfig = {
    good: { label: '🟢 User-Friendly', color: 'text-green-600', bg: 'bg-green-900/20', border: 'border-green-800' },
    mixed: { label: '🟡 Mixed Policies', color: 'text-yellow-600', bg: 'bg-yellow-900/20', border: 'border-yellow-800' },
    risky: { label: '🔴 High Risk', color: 'text-red-600', bg: 'bg-red-900/20', border: 'border-red-800' },
  };

  const policyConfig = {
    good: { icon: '✅', color: 'text-green-600', bg: 'bg-green-900/20', border: 'border-green-800' },
    bad: { icon: '⚠️', color: 'text-red-600', bg: 'bg-red-900/20', border: 'border-red-800' },
    common: { icon: 'ℹ️', color: 'text-blue-600', bg: 'bg-blue-900/20', border: 'border-blue-800' },
  };

  const rating = exchange.overallRating ? ratingConfig[exchange.overallRating as keyof typeof ratingConfig] : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      {/* Header */}
      <section className="bg-gradient-to-b from-gray-900 to-background py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/crypto/cex" className="text-blue-600 hover:text-blue-700 mb-6 inline-block">
            ← Back to All CEXs
          </Link>

          <div className="flex items-start gap-6">
            {exchange.image && (
              <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-800">
                <img
                  src={urlFor(exchange.image).width(200).height(200).url()}
                  alt={exchange.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-foreground mb-3">{exchange.name}</h1>
              <div className="flex items-center gap-4 text-sm text-foreground/60 mb-4">
                {exchange.founded && <span>Founded: {exchange.founded}</span>}
                {exchange.jurisdiction && <span>• HQ: {exchange.jurisdiction}</span>}
              </div>
              <div className="flex items-center gap-4">
                {rating && (
                  <div className={`inline-block px-4 py-2 rounded-lg ${rating.bg} border ${rating.border}`}>
                    <span className={`font-medium ${rating.color}`}>{rating.label}</span>
                  </div>
                )}
                {exchange.riskScore !== undefined && (
                  <div className="inline-block px-4 py-2 rounded-lg bg-gray-800 border border-gray-700">
                    <span className="text-sm text-foreground/60 mr-2">Risk Score:</span>
                    <span className={`font-bold text-lg ${
                      exchange.riskScore <= 3 ? 'text-green-600' :
                      exchange.riskScore <= 6 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {exchange.riskScore}/10
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Summary */}
      {exchange.quickSummary && (
        <section className="py-8 bg-gray-900/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Quick Summary</h2>
            <p className="text-lg text-foreground/80 leading-relaxed">{exchange.quickSummary}</p>
            {exchange.termsUrl && (
              <a
                href={exchange.termsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-blue-600 hover:text-blue-700 text-sm"
              >
                Read Official Terms & Conditions →
              </a>
            )}
          </div>
        </section>
      )}

      {/* Policy Breakdown */}
      {exchange.policies && exchange.policies.length > 0 && (
        <section className="py-12">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-foreground mb-8">Policy Breakdown</h2>

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

              const grouped = (exchange.policies || []).reduce((acc: any, policy: any) => {
                const section = policy.section || 'other';
                if (!acc[section]) acc[section] = [];
                acc[section].push(policy);
                return acc;
              }, {});

              return (
                <div className="space-y-8">
                  {Object.entries(grouped).map(([section, policies]: [string, any]) => (
                    <div key={section} className="border border-gray-700 rounded-xl p-6 bg-gray-900/30">
                      <h3 className="text-2xl font-bold text-foreground mb-6">
                        {sectionNames[section as keyof typeof sectionNames]} ({policies.length})
                      </h3>
                      <div className="space-y-6">
                        {policies.map((policy: any, index: number) => {
                          const config = policyConfig[policy.category as keyof typeof policyConfig];
                          return (
                            <div
                              key={index}
                              className={`border ${config.border} ${config.bg} rounded-xl p-6`}
                            >
                              <div className="flex items-start gap-3 mb-3">
                                <span className="text-2xl">{config.icon}</span>
                                <div className="flex-1">
                                  <h4 className={`text-xl font-bold ${config.color} mb-2`}>
                                    {policy.title}
                                  </h4>
                                  {policy.impact && (
                                    <span className="inline-block px-3 py-1 bg-gray-900 border border-gray-700 rounded-full text-xs font-medium text-foreground/70">
                                      Impact: {policy.impact}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <p className="text-foreground/80 mb-4">{policy.summary}</p>

                              {policy.details && (
                                <div className="prose prose-invert max-w-none text-foreground/70">
                                  <PortableText value={policy.details} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* Key Takeaways */}
      {exchange.keyTakeaways && exchange.keyTakeaways.length > 0 && (
        <section className="py-12 bg-gray-900/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-foreground mb-6">Key Takeaways</h2>
            <ul className="space-y-3">
              {exchange.keyTakeaways.map((takeaway: string, index: number) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="text-foreground/80">{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
