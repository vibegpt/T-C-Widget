-- CMS Tables for managing crypto site content

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT 'blue',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Articles table
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT,
  category_id UUID REFERENCES public.categories(id),
  published BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  author TEXT DEFAULT 'LegalEasy Team',
  published_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platforms/Exchanges showcase table
CREATE TABLE IF NOT EXISTS public.platform_showcases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  featured BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hero section content
CREATE TABLE IF NOT EXISTS public.hero_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  cta_primary_text TEXT DEFAULT 'Latest News',
  cta_primary_link TEXT DEFAULT '/crypto/exchanges',
  cta_secondary_text TEXT DEFAULT 'Subscribe to Newsletter',
  cta_secondary_link TEXT DEFAULT '/crypto/legal',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO public.categories (name, slug, description, color) VALUES
  ('Platform News', 'platform-news', 'News about cryptocurrency exchanges', 'blue'),
  ('Analysis', 'analysis', 'In-depth analysis of exchange policies', 'purple'),
  ('Legal Updates', 'legal-updates', 'Legal and regulatory updates', 'red'),
  ('User Rights', 'user-rights', 'Information about trader rights', 'green')
ON CONFLICT (slug) DO NOTHING;

-- Insert default hero content
INSERT INTO public.hero_content (title, subtitle, active) VALUES
  ('Know Your Exchange Rights', 'Before you deposit $100K, understand what they can do with it. Plain-English analysis of cryptocurrency exchange terms and trader rights.', true)
ON CONFLICT DO NOTHING;

-- Insert sample articles
INSERT INTO public.articles (title, slug, excerpt, content, category_id, published, featured, published_date)
SELECT
  'Binance Terms Analysis',
  'binance-terms-analysis',
  'Detailed breakdown of Binance''s ADL policies, liability caps, and arbitration clauses.',
  'Full analysis of Binance terms of service...',
  (SELECT id FROM public.categories WHERE slug = 'platform-news'),
  true,
  true,
  '2025-10-11'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.articles (title, slug, excerpt, content, category_id, published, featured, published_date)
SELECT
  'The Rise of Exchange Rights',
  'rise-of-exchange-rights',
  'How cryptocurrency traders are demanding more transparency from centralized exchanges.',
  'An in-depth look at the growing movement...',
  (SELECT id FROM public.categories WHERE slug = 'analysis'),
  true,
  true,
  '2025-10-10'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.articles (title, slug, excerpt, content, category_id, published, featured, published_date)
SELECT
  'Coinbase Updates Terms',
  'coinbase-updates-terms',
  'Major changes coming to Coinbase as they update their user agreement.',
  'Coinbase has announced significant updates...',
  (SELECT id FROM public.categories WHERE slug = 'platform-news'),
  true,
  true,
  '2025-10-09'
ON CONFLICT (slug) DO NOTHING;

-- Insert sample platform showcases
INSERT INTO public.platform_showcases (name, slug, description, featured, display_order) VALUES
  ('Binance', 'binance', 'World''s largest cryptocurrency exchange by volume', true, 1),
  ('Coinbase', 'coinbase', 'Leading US-based cryptocurrency exchange', true, 2),
  ('Kraken', 'kraken', 'Security-focused exchange with strong reputation', true, 3)
ON CONFLICT (slug) DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_articles_published ON public.articles(published, published_date DESC);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON public.articles(featured, published_date DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles(category_id);
CREATE INDEX IF NOT EXISTS idx_platform_showcases_order ON public.platform_showcases(display_order);

-- Enable Row Level Security (optional - can be customized based on your needs)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_showcases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_content ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read access
CREATE POLICY "Allow public read access to categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access to published articles" ON public.articles FOR SELECT USING (published = true);
CREATE POLICY "Allow public read access to featured platforms" ON public.platform_showcases FOR SELECT USING (featured = true);
CREATE POLICY "Allow public read access to active hero content" ON public.hero_content FOR SELECT USING (active = true);

COMMENT ON TABLE public.categories IS 'Categories for organizing articles';
COMMENT ON TABLE public.articles IS 'News articles and analysis posts';
COMMENT ON TABLE public.platform_showcases IS 'Featured exchanges/platforms to showcase';
COMMENT ON TABLE public.hero_content IS 'Hero section content management';
