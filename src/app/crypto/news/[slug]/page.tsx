import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import { client } from '@/lib/sanity';
import { PortableText } from '@portabletext/react';

async function getArticle(slug: string) {
  const query = `*[_type == "article" && slug.current == $slug][0]{
    _id,
    title,
    excerpt,
    content,
    publishedDate,
    "category": category->name
  }`;

  return await client.fetch(query, { slug });
}

export default async function ArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const article = await getArticle(params.slug);

  if (!article) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 py-16">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-8">
            <Link
              href="/crypto"
              className="text-sm text-foreground/60 hover:text-foreground"
            >
              ← Back to Home
            </Link>
          </div>

          {/* Article Header */}
          <header className="mb-12">
            {article.category && (
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm font-medium">
                  {article.category}
                </span>
              </div>
            )}
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              {article.title}
            </h1>
            <p className="text-xl text-foreground/70 mb-4">{article.excerpt}</p>
            <div className="flex items-center gap-4 text-sm text-foreground/50">
              <time dateTime={article.publishedDate}>
                {new Date(article.publishedDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </div>
          </header>

          {/* Article Content */}
          <div className="prose prose-invert prose-lg max-w-none">
            <PortableText
              value={article.content}
              components={{
                block: {
                  normal: ({ children }) => (
                    <p className="mb-6 text-foreground/90 leading-relaxed">
                      {children}
                    </p>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-3xl font-bold text-foreground mt-12 mb-6">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-2xl font-bold text-foreground mt-8 mb-4">
                      {children}
                    </h3>
                  ),
                },
                marks: {
                  strong: ({ children }) => (
                    <strong className="font-bold text-foreground">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-foreground/90">{children}</em>
                  ),
                  link: ({ value, children }) => {
                    const target = (value?.href || '').startsWith('http')
                      ? '_blank'
                      : undefined;
                    return (
                      <a
                        href={value?.href}
                        target={target}
                        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        {children}
                      </a>
                    );
                  },
                },
              }}
            />
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
