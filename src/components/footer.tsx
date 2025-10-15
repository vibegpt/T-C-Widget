import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-bold mb-4">
              LegalEasy<span className="text-blue-600">.crypto</span>
            </h3>
            <p className="text-sm text-foreground/60 mb-4 max-w-md">
              Understanding your rights on cryptocurrency exchanges.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm">Navigate</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/crypto" className="text-foreground/60 hover:text-foreground transition-colors">
                  News
                </Link>
              </li>
              <li>
                <Link href="/crypto/exchanges" className="text-foreground/60 hover:text-foreground transition-colors">
                  Platforms
                </Link>
              </li>
              <li>
                <Link href="/crypto/legal" className="text-foreground/60 hover:text-foreground transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/crypto/exchanges" className="text-foreground/60 hover:text-foreground transition-colors">
                  Newsletter
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm">Connect</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://twitter.com/legaleasytools" className="text-foreground/60 hover:text-foreground transition-colors">
                  Twitter
                </a>
              </li>
              <li>
                <a href="https://github.com/legaleasy" className="text-foreground/60 hover:text-foreground transition-colors">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-foreground/60 text-center">
          <p>&copy; {new Date().getFullYear()} LegalEasy.crypto. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
