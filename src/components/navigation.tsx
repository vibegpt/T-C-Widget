import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/crypto" className="text-xl font-bold text-foreground">
              LegalEasy<span className="text-blue-600">.crypto</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/crypto" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              News
            </Link>
            <Link href="/crypto/exchanges" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              Platforms
            </Link>
            <Link href="/crypto/market-issues" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              Market Issues
            </Link>
            <Link href="/crypto/legal" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              About
            </Link>
            <Link
              href="/crypto/exchanges"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Subscribe
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="text-foreground p-2">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
