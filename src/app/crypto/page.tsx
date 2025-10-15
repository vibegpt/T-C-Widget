import Link from 'next/link';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import { client } from '@/lib/sanity';

async function getHeroContent() {
  const query = `*[_type == "hero" && active == true][0]{
    title,
    subtitle,
    buttons[]{
      text,
      link,
      style
    }
  }`;

  const data = await client.fetch(query);

  return data || {
    title: 'Know Your Exchange Rights',
    subtitle: 'Before you deposit $100K, understand what they can do with it. Plain-English analysis of cryptocurrency exchange terms and trader rights.',
    buttons: [
      { text: 'Latest News', link: '/crypto/exchanges', style: 'primary' },
      { text: 'Subscribe to Newsletter', link: '/crypto/legal', style: 'secondary' }
    ]
  };
}

async function getPlatformShowcases() {
  const query = `*[_type == "platform" && featured == true] | order(displayOrder asc)[0...3]{
    _id,
    name,
    "slug": slug.current,
    description,
    displayOrder
  }`;

  const data = await client.fetch(query);
  return data || [];
}

export default async function Home() {
  const [heroContent, platforms] = await Promise.all([
    getHeroContent(),
    getPlatformShowcases()
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-900 to-background py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              {heroContent.title.split(' ').slice(0, -2).join(' ')}
              <span className="text-blue-600"> {heroContent.title.split(' ').slice(-2).join(' ')}</span>
            </h1>
            <p className="text-xl text-foreground/70 mb-8">
              {heroContent.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {heroContent.buttons?.map((button: any, index: number) => (
                <Link
                  key={index}
                  href={button.link}
                  className={
                    button.style === 'primary'
                      ? 'bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors'
                      : 'border border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-medium hover:bg-blue-900/20 transition-colors'
                  }
                >
                  {button.text}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Latest Market Issues */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-foreground">Recent Market Issues</h2>
            <Link href="/crypto/market-issues" className="text-blue-600 hover:text-blue-700 font-medium">
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Binance USDe Depeg */}
            <article className="border border-red-800 rounded-lg p-6 hover:shadow-lg hover:border-red-700 transition-all bg-red-900/10">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-red-400 font-semibold">🔴 Critical</span>
                <span className="text-xs text-foreground/50">Jan 10, 2025</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Binance Oracle Failure: USDe Crashes to $0.65
              </h3>
              <p className="text-foreground/70 mb-4 text-sm leading-relaxed">
                Single-source oracle caused $600M in liquidations affecting 1.6M traders. USDe held $1.00 everywhere else. Oracle island effect exposed.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-foreground/50 bg-gray-800 px-2 py-1 rounded">
                  Binance
                </span>
                <Link href="/crypto/market-issues/stablecoin-depegging" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Read analysis →
                </Link>
              </div>
            </article>

            {/* KuCoin Order Execution */}
            <article className="border border-red-800 rounded-lg p-6 hover:shadow-lg hover:border-red-700 transition-all bg-red-900/10">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-red-400 font-semibold">🔴 Critical</span>
                <span className="text-xs text-foreground/50">Jan 15, 2025</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                KuCoin: Orders Failed During Volatility
              </h3>
              <p className="text-foreground/70 mb-4 text-sm leading-relaxed">
                "Shallow market depth" caused order execution failures. VIP users unable to open or close positions. Exchange calls it "normal phenomenon."
              </p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-foreground/50 bg-gray-800 px-2 py-1 rounded">
                  KuCoin
                </span>
                <Link href="/crypto/market-issues/order-execution-failures" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Read analysis →
                </Link>
              </div>
            </article>

            {/* Hyperliquid ADL */}
            <article className="border border-red-800 rounded-lg p-6 hover:shadow-lg hover:border-red-700 transition-all bg-red-900/10">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-red-400 font-semibold">🔴 Critical</span>
                <span className="text-xs text-foreground/50">Ongoing</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Auto-Deleveraging: Profitable Trades Forcibly Closed
              </h3>
              <p className="text-foreground/70 mb-4 text-sm leading-relaxed">
                Perpetual exchanges can close your winning positions without consent to cover insurance fund shortfalls. No opt-out available.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-foreground/50 bg-gray-800 px-2 py-1 rounded">
                  Hyperliquid, dYdX
                </span>
                <Link href="/crypto/market-issues/auto-deleveraging-adl" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Read analysis →
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="bg-gray-900/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Featured Exchanges</h2>
            <p className="text-foreground/70 max-w-2xl mx-auto">
              Compare policies across major cryptocurrency exchanges
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {platforms.map((platform: any) => (
              <div
                key={platform._id}
                className="bg-background border border-gray-800 rounded-lg p-6 hover:shadow-lg hover:border-gray-700 transition-all"
              >
                <h3 className="text-xl font-bold text-foreground mb-2">{platform.name}</h3>
                <p className="text-foreground/70 mb-4">{platform.description}</p>
                <Link
                  href={`/crypto/exchanges/${platform.slug}`}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Learn more →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-600 rounded-2xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Stay Informed</h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
              Get the latest analysis of exchange terms and trader rights delivered to your inbox.
            </p>
            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="submit"
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
