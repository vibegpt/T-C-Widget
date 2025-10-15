-- Crypto Exchanges Database Schema
-- Stores exchange terms, policies, and risk assessments with version tracking

-- Exchanges table: Master list of crypto exchanges
CREATE TABLE exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- e.g., "Binance", "Coinbase"
  slug TEXT NOT NULL UNIQUE, -- e.g., "binance", "coinbase"
  type TEXT NOT NULL CHECK (type IN ('cex', 'dex', 'hybrid')), -- centralized, decentralized, or hybrid
  website_url TEXT NOT NULL,
  terms_url TEXT, -- URL to terms of service
  jurisdiction TEXT[], -- e.g., ['Cayman Islands', 'United States']
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exchange Terms table: Versioned storage of terms and conditions
CREATE TABLE exchange_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
  version INTEGER NOT NULL, -- Incremental version number
  document_type TEXT NOT NULL CHECK (document_type IN ('terms', 'privacy', 'liquidation', 'risk_disclosure', 'other')),

  -- Raw content
  raw_text TEXT NOT NULL,
  content_hash TEXT NOT NULL, -- SHA-256 hash for change detection

  -- Parsed data (JSON)
  parsed_summary JSONB, -- Structured summary from parseTerms()

  -- Risk flags
  has_arbitration BOOLEAN DEFAULT false,
  has_class_action_waiver BOOLEAN DEFAULT false,
  has_termination_at_will BOOLEAN DEFAULT false,
  has_auto_deleveraging BOOLEAN DEFAULT false,
  has_forced_liquidation BOOLEAN DEFAULT false,
  liability_cap_amount DECIMAL,
  liability_cap_currency TEXT DEFAULT 'USD',
  opt_out_days INTEGER,

  -- Metadata
  effective_date DATE,
  last_modified_date DATE,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(exchange_id, document_type, version)
);

-- Risk Categories table: Specific risk types found in terms
CREATE TABLE risk_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE, -- e.g., "auto_deleveraging", "forced_liquidation"
  title TEXT NOT NULL, -- e.g., "Auto-Deleveraging (ADL)"
  description TEXT,
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  applies_to TEXT[] DEFAULT '{}', -- e.g., ['spot', 'margin', 'futures']
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exchange Risks table: Junction table linking exchanges to specific risks
CREATE TABLE exchange_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES exchange_terms(id) ON DELETE CASCADE,
  risk_category_id UUID NOT NULL REFERENCES risk_categories(id) ON DELETE CASCADE,

  -- Risk details
  summary TEXT NOT NULL, -- Plain-English explanation
  quote TEXT, -- Direct quote from terms
  section_reference TEXT, -- e.g., "Section 4.2"

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(exchange_id, term_id, risk_category_id)
);

-- Change Log table: Track when terms change
CREATE TABLE term_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
  old_term_id UUID REFERENCES exchange_terms(id) ON DELETE SET NULL,
  new_term_id UUID NOT NULL REFERENCES exchange_terms(id) ON DELETE CASCADE,

  change_type TEXT CHECK (change_type IN ('added', 'modified', 'removed', 'no_change')),
  change_summary TEXT, -- Human-readable summary of what changed
  diff_data JSONB, -- Structured diff data

  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_exchange_terms_exchange_id ON exchange_terms(exchange_id);
CREATE INDEX idx_exchange_terms_content_hash ON exchange_terms(content_hash);
CREATE INDEX idx_exchange_terms_version ON exchange_terms(exchange_id, version DESC);
CREATE INDEX idx_exchange_risks_exchange_id ON exchange_risks(exchange_id);
CREATE INDEX idx_term_changes_exchange_id ON term_changes(exchange_id);
CREATE INDEX idx_term_changes_detected_at ON term_changes(detected_at DESC);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to exchanges table
CREATE TRIGGER update_exchanges_updated_at
  BEFORE UPDATE ON exchanges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial risk categories
INSERT INTO risk_categories (key, title, description, severity, applies_to) VALUES
  ('auto_deleveraging', 'Auto-Deleveraging (ADL)', 'Exchange can automatically close profitable positions during high volatility to cover losses from bankruptcies', 'critical', ARRAY['margin', 'futures']),
  ('forced_liquidation', 'Forced Liquidation', 'Exchange can liquidate your positions if margin requirements are not met', 'critical', ARRAY['margin', 'futures']),
  ('liquidation_engine', 'Liquidation Engine Risk', 'How the exchange handles liquidations and potential socialized losses', 'high', ARRAY['margin', 'futures']),
  ('arbitration_required', 'Mandatory Arbitration', 'You must resolve disputes through arbitration, cannot sue in court', 'high', ARRAY['spot', 'margin', 'futures']),
  ('class_action_waiver', 'Class Action Waiver', 'You cannot participate in class action lawsuits', 'high', ARRAY['spot', 'margin', 'futures']),
  ('termination_at_will', 'Account Termination', 'Exchange can terminate your account at any time without notice', 'medium', ARRAY['spot', 'margin', 'futures']),
  ('liability_cap', 'Limited Liability', 'Maximum amount you can recover if exchange makes a mistake', 'high', ARRAY['spot', 'margin', 'futures']),
  ('jurisdiction', 'Governing Jurisdiction', 'Which country''s laws apply and where disputes are resolved', 'medium', ARRAY['spot', 'margin', 'futures']),
  ('kyc_requirements', 'KYC/Identity Verification', 'Level of identity verification required', 'low', ARRAY['spot', 'margin', 'futures']),
  ('withdrawal_limits', 'Withdrawal Restrictions', 'Limits on how much you can withdraw and when', 'medium', ARRAY['spot', 'margin', 'futures']),
  ('fund_security', 'Fund Security', 'How customer funds are protected and insured', 'critical', ARRAY['spot', 'margin', 'futures']),
  ('trading_halt', 'Trading Halt Authority', 'Exchange can halt trading or freeze assets during volatility', 'high', ARRAY['spot', 'margin', 'futures']);

-- Comments for documentation
COMMENT ON TABLE exchanges IS 'Master list of cryptocurrency exchanges';
COMMENT ON TABLE exchange_terms IS 'Versioned storage of exchange terms and conditions with change detection';
COMMENT ON TABLE risk_categories IS 'Predefined risk types that can appear in exchange terms';
COMMENT ON TABLE exchange_risks IS 'Specific risks identified in each exchange terms';
COMMENT ON TABLE term_changes IS 'Audit log of changes to exchange terms over time';
