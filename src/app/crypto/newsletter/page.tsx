import Navigation from '@/components/navigation';
import Footer from '@/components/footer';

export default function NewsletterPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      {/* Newsletter Signup Section */}
      <section className="flex-1 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
              Subscribe to Our Newsletter
            </h1>
            <p className="text-xl text-foreground/70">
              Get the latest analysis of cryptocurrency exchange terms, trader rights,
              and legal updates delivered to your inbox weekly.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 md:p-12">
            <form className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-4 py-3 rounded-lg bg-background border border-gray-700 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-4 py-3 rounded-lg bg-background border border-gray-700 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Topics of Interest
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2 rounded" />
                    <span className="text-foreground/80">Exchange Terms & Policies</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2 rounded" />
                    <span className="text-foreground/80">Trader Rights & Protections</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2 rounded" />
                    <span className="text-foreground/80">Legal Updates & Regulations</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2 rounded" />
                    <span className="text-foreground/80">Market Analysis</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Subscribe
              </button>

              <p className="text-sm text-foreground/60 text-center">
                We respect your privacy. Unsubscribe at any time.
              </p>
            </form>
          </div>

          {/* Benefits Section */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl mb-3">📬</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Weekly Updates</h3>
              <p className="text-foreground/70 text-sm">
                Curated insights delivered every week
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">⚖️</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Legal Analysis</h3>
              <p className="text-foreground/70 text-sm">
                Plain-English explanations of complex terms
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">🔔</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Breaking News</h3>
              <p className="text-foreground/70 text-sm">
                Alerts for major policy changes
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
