import fs from "fs";
import path from "path";
import matter from "gray-matter";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — PolicyCheck",
  description: "Insights on AI agents, seller policies, and autonomous purchasing.",
};

type Post = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
};

function getPosts(): Post[] {
  const dir = path.join(process.cwd(), "src/content/blog");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf-8");
      const { data } = matter(raw);
      return {
        slug: f.replace(/\.mdx$/, ""),
        title: data.title ?? "Untitled",
        date: data.date ?? "",
        excerpt: data.excerpt ?? "",
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export default function BlogPage() {
  const posts = getPosts();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e2e8f0]">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur border-b border-[#2a2a4a] h-14 flex items-center px-6">
        <Link href="/" className="text-lg font-semibold text-white hover:text-[#a78bfa] transition-colors">
          PolicyCheck
        </Link>
        <div className="ml-auto flex gap-4 text-sm">
          <Link href="/blog" className="text-white transition-colors">Blog</Link>
          <Link href="/docs" className="text-[#94a3b8] hover:text-white transition-colors">Docs</Link>
          <a href="https://policycheck.tools/.well-known/agent.json" className="text-[#94a3b8] hover:text-white transition-colors">Agent Card</a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-28 pb-24">
        <h1 className="text-3xl font-bold mb-2">Blog</h1>
        <p className="text-[#94a3b8] mb-10">Insights on AI agents, seller policies, and autonomous purchasing.</p>

        {posts.length === 0 ? (
          <p className="text-[#64748b]">No posts yet.</p>
        ) : (
          <ul className="space-y-8">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group block">
                  <p className="text-xs text-[#64748b] mb-1 font-[family-name:var(--font-geist-mono)]">
                    {new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                  <h2 className="text-xl font-semibold text-[#e2e8f0] group-hover:text-[#a78bfa] transition-colors mb-2">
                    {post.title}
                  </h2>
                  <p className="text-[#94a3b8] text-sm leading-relaxed">{post.excerpt}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
