import Link from 'next/link';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import { client } from '@/lib/sanity';

async function getArticles() {
  const query = `*[_type == "article" && published == true] | order(publishedDate desc){
    _id,
    title,
    "slug": slug.current,
    excerpt,
    publishedDate,
    featured,
    "category": category->name
  }`;

  return await client.fetch(query);
}

export default async function NewsPage() {
  const articles = await getArticles();

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Latest News & Analysis
            </h1>
            <p className="text-xl text-foreground/70 max-w-3xl">
              Deep dives into crypto exchange incidents, market failures, and what they mean for traders.
            </p>
          </div>

          {/* Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article: any) => (
              <article
                key={article._id}
                className={`border rounded-lg p-6 hover:shadow-lg transition-all ${
                  article.featured
                    ? 'border-blue-600 bg-blue-600/10'
                    : 'border-gray-800 bg-background'
                }`}
              >
                {article.category && (
                  <div className="mb-3">
                    <span className="inline-block px-2 py-1 bg-gray-800 text-foreground/70 rounded text-xs font-medium">
                      {article.category}
                    </span>
                  </div>
                )}

                <h3 className="text-xl font-bold text-foreground mb-3">
                  {article.title}
                </h3>

                <p className="text-foreground/70 mb-4 text-sm leading-relaxed">
                  {article.excerpt}
                </p>

                <div className="flex items-center justify-between">
                  <time className="text-xs text-foreground/50">
                    {new Date(article.publishedDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                  <Link
                    href={`/crypto/news/${article.slug}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Read more →
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {articles.length === 0 && (
            <div className="text-center py-12">
              <p className="text-foreground/50">No articles published yet.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
