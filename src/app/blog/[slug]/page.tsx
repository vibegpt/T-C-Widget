import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import type { Metadata } from "next";

const BLOG_DIR = path.join(process.cwd(), "src/content/blog");

function getPost(slug: string) {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return { frontmatter: data, content };
}

export async function generateStaticParams() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => ({ slug: f.replace(/\.mdx$/, "") }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const { frontmatter } = post;
  return {
    title: `${frontmatter.title} — PolicyCheck Blog`,
    description: frontmatter.excerpt ?? "",
    openGraph: {
      title: frontmatter.title,
      description: frontmatter.excerpt ?? "",
      type: "article",
      publishedTime: frontmatter.date,
      url: `https://policycheck.tools/blog/${slug}`,
      siteName: "PolicyCheck",
    },
    twitter: {
      card: "summary_large_image",
      title: frontmatter.title,
      description: frontmatter.excerpt ?? "",
    },
  };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const { frontmatter, content } = post;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e2e8f0]">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur border-b border-[#2a2a4a] h-14 flex items-center px-6">
        <Link href="/" className="text-lg font-semibold text-white hover:text-[#a78bfa] transition-colors">
          PolicyCheck
        </Link>
        <div className="ml-auto flex gap-4 text-sm">
          <Link href="/blog" className="text-[#94a3b8] hover:text-white transition-colors">Blog</Link>
          <Link href="/docs" className="text-[#94a3b8] hover:text-white transition-colors">Docs</Link>
          <a href="https://policycheck.tools/.well-known/agent.json" className="text-[#94a3b8] hover:text-white transition-colors">Agent Card</a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-28 pb-24">
        <Link href="/blog" className="text-sm text-[#64748b] hover:text-[#94a3b8] transition-colors mb-8 inline-block">
          ← All posts
        </Link>

        <article>
          <header className="mb-10">
            <p className="text-xs text-[#64748b] mb-3 font-[family-name:var(--font-geist-mono)]">
              {new Date(frontmatter.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h1 className="text-3xl font-bold leading-tight text-[#e2e8f0] mb-4">
              {frontmatter.title}
            </h1>
            {frontmatter.excerpt && (
              <p className="text-[#94a3b8] text-lg leading-relaxed">{frontmatter.excerpt}</p>
            )}
          </header>

          <div className="prose-blog">
            <MDXRemote source={content} />
          </div>
        </article>
      </main>
    </div>
  );
}
