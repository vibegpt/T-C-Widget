import { client } from '@/lib/sanity';
import Link from 'next/link';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';

async function getMarketIssues() {
  const query = `*[_type == "marketIssue" && featured == true] | order(displayOrder asc){
    _id,
    title,
    "slug": slug.current,
    category,
    severity,
    summary,
    "exampleCount": count(realWorldExamples),
    "platformCount": count(relatedPlatforms),
    lastUpdated
  }`;

  return await client.fetch(query);
}

const categoryConfig: Record<string, { label: string; icon: string; color: string }> = {
  liquidity: { label: 'Liquidity & Orders', icon: '💧', color: 'text-blue-400' },
  liquidation: { label: 'Risk & Liquidation', icon: '⚠️', color: 'text-orange-400' },
  pricing: { label: 'Price Oracles', icon: '📊', color: 'text-purple-400' },
  technical: { label: 'Technical Issues', icon: '🔧', color: 'text-gray-400' },
  regulatory: { label: 'Regulatory', icon: '⚖️', color: 'text-yellow-400' },
  security: { label: 'Security', icon: '🔒', color: 'text-red-400' },
};

const severityConfig: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Critical', icon: '🔴', color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-800' },
  high: { label: 'High', icon: '🟠', color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-800' },
  medium: { label: 'Medium', icon: '🟡', color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-800' },
  low: { label: 'Low', icon: '🟢', color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-800' },
};

export default async function MarketIssuesPage() {
  const issues = await getMarketIssues();

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-900 to-background py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Common Market Issues & Problems
          </h1>
          <p className="text-xl text-foreground/70 max-w-3xl leading-relaxed">
            Understanding the systemic issues that affect crypto exchanges, DEXs, and prediction markets.
            Learn what can go wrong, why it happens, and how platforms legally protect themselves.
          </p>
        </div>
      </section>

      {/* Issues Grid */}
      <section className="flex-1 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-foreground/60">
              Found {issues.length} documented market issues
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {issues.map((issue: any) => {
              const severity = severityConfig[issue.severity] || severityConfig.medium;
              const category = categoryConfig[issue.category] || categoryConfig.technical;

              return (
                <Link
                  key={issue._id}
                  href={`/crypto/market-issues/${issue.slug}`}
                  className={`block border ${severity.border} rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${severity.bg}`}
                >
                  <div className="p-6">
                    {/* Severity Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${severity.color} border ${severity.border}`}>
                        {severity.icon} {severity.label}
                      </span>
                      <span className={`text-xs ${category.color}`}>
                        {category.icon} {category.label}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-foreground mb-3">
                      {issue.title}
                    </h3>

                    {/* Summary */}
                    <p className="text-sm text-foreground/70 leading-relaxed mb-4 line-clamp-3">
                      {issue.summary}
                    </p>

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-xs text-foreground/50">
                      <span>{issue.platformCount} platforms</span>
                      <span>•</span>
                      <span>{issue.exampleCount} examples</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
