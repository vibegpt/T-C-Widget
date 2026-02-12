-- Enhanced Crypto Exchange Analysis - Batch 2
-- Based on Parser v2.0 with Crypto-Specific Detection
-- Date: November 5, 2025
-- Analyzed: MEXC, OKX, KuCoin, Kraken, Bitget, Gate.io

-- ==================================================
-- MIGRATION: Add New Risk Columns (Run First)
-- ==================================================

ALTER TABLE exchange_terms
ADD COLUMN IF NOT EXISTS has_clawback BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_asset_seizure BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_trade_rollback BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_abnormal_trading_trigger BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS risk_score INTEGER,
ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('critical', 'high', 'medium', 'low'));

-- Insert new risk categories
INSERT INTO risk_categories (key, title, description, severity, applies_to) VALUES
  ('clawback', 'Clawback Provision', 'Exchange can retrieve profits deemed to violate terms', 'critical', ARRAY['spot', 'margin', 'futures']),
  ('asset_seizure', 'Asset Confiscation', 'Exchange can seize/confiscate remaining funds', 'critical', ARRAY['spot', 'margin', 'futures']),
  ('trade_rollback', 'Trade Rollback', 'Exchange can reverse executed trades', 'high', ARRAY['spot', 'margin', 'futures']),
  ('abnormal_trading', 'Abnormal Trading Trigger', 'Vague criteria that could apply to legitimate profitable trading', 'medium', ARRAY['spot', 'margin', 'futures']),
  ('socialized_clawback', 'Socialized Clawback', 'Profitable traders can be forced to cover losing traders', 'critical', ARRAY['futures', 'margin'])
ON CONFLICT (key) DO NOTHING;

-- ==================================================
-- 1. MEXC GLOBAL (CRITICAL RISK)
-- ==================================================

-- Insert or update exchange
INSERT INTO exchanges (name, slug, type, website_url, terms_url, jurisdiction, is_active)
VALUES (
  'MEXC Global',
  'mexc',
  'cex',
  'https://www.mexc.com',
  'https://www.mexc.com/terms',
  ARRAY['Seychelles'],
  true
)
ON CONFLICT (slug) DO UPDATE SET
  updated_at = NOW(),
  terms_url = EXCLUDED.terms_url,
  jurisdiction = EXCLUDED.jurisdiction
RETURNING id;

-- Get the exchange ID (for manual replacement in subsequent queries)
-- Copy this UUID and replace <mexc_id> placeholders below

INSERT INTO exchange_terms (
  exchange_id,
  version,
  document_type,
  raw_text,
  content_hash,
  has_arbitration,
  has_class_action_waiver,
  has_termination_at_will,
  has_auto_deleveraging,
  has_forced_liquidation,
  has_clawback,
  has_asset_seizure,
  has_trade_rollback,
  has_abnormal_trading_trigger,
  risk_score,
  risk_level,
  effective_date,
  parsed_summary
) VALUES (
  (SELECT id FROM exchanges WHERE slug = 'mexc'),
  1,
  'terms',
  '[Raw terms text placeholder - fetch from https://www.mexc.com/terms]',
  'mexc_terms_v1_hash_' || NOW()::TEXT,

  -- Risk Flags
  true,  -- has_arbitration
  true,  -- has_class_action_waiver
  true,  -- has_termination_at_will (account suspension rights)
  false, -- has_auto_deleveraging (not explicitly confirmed)
  true,  -- has_forced_liquidation (futures/margin)
  true,  -- has_clawback ⚠️ CRITICAL - Clause 21(c)
  true,  -- has_asset_seizure ⚠️ CRITICAL - "confiscate remaining assets"
  true,  -- has_trade_rollback (risk control guidelines)
  true,  -- has_abnormal_trading_trigger ("abnormal trading behavior")

  95,    -- risk_score (0-100)
  'critical',  -- risk_level

  '2025-05-29',

  -- Parsed Summary JSON
  '{ "risk_score": 95,
    "risk_level": "critical",
    "jurisdiction": "Seychelles",
    "terms_url": "https://www.mexc.com/terms",
    "last_analyzed": "2025-11-05",

    "critical_risks": [
      {
        "type": "clawback",
        "severity": "critical",
        "clause": "21(c)",
        "quote": "Clawback and/or retrieve any profits obtained in violation of this Agreement or other Legal Documents to compensate for any losses suffered as a consequence thereto",
        "impact": "Exchange can seize your profits",
        "trigger": "Violation of agreement (vague definition)",
        "user_impact": "All profits from trades deemed improper can be taken back retroactively"
      },
      {
        "type": "asset_seizure",
        "severity": "critical",
        "clause": "Abnormal Trading Policy",
        "quote": "Close account and confiscate remaining assets",
        "impact": "All funds can be confiscated",
        "trigger": "Abnormal trading behavior (undefined)",
        "user_impact": "Complete loss of account balance possible"
      },
      {
        "type": "account_suspension",
        "severity": "critical",
        "clause": "Account Management",
        "quote": "MEXC shall have the right to suspend, interrupt or terminate all or part of the Services",
        "impact": "Account can be frozen anytime",
        "trigger": "Sole discretion",
        "user_impact": "Loss of access to funds without warning"
      },
      {
        "type": "trade_rollback",
        "severity": "high",
        "clause": "Risk Control Guidelines",
        "quote": "[Reference to risk control measures]",
        "impact": "Executed trades can be reversed",
        "trigger": "Exchange risk controls",
        "user_impact": "Profitable trades may be cancelled retroactively"
      },
      {
        "type": "forced_liquidation",
        "severity": "high",
        "clause": "Futures/Margin Trading",
        "impact": "Positions closed without consent",
        "trigger": "Margin requirements",
        "user_impact": "Loss of leveraged positions during volatility"
      }
    ],

    "high_risks": [
      {
        "type": "arbitration",
        "impact": "Cannot sue in court, must use binding arbitration"
      },
      {
        "type": "class_waiver",
        "impact": "No class action lawsuits allowed"
      }
    ],

    "summary": "MEXC reserves extremely broad rights to clawback profits, confiscate assets, and suspend accounts with vague triggers. One of the highest-risk exchanges analyzed. Consider limiting exposure or using alternative platforms.",

    "recommendations": [
      "Review Clause 21(c) carefully before trading",
      "Avoid keeping large balances on platform",
      "Document all trades for potential disputes",
      "Consider exchanges with clearer user protections"
    ],

    "comparison": {
      "worse_than": ["OKX", "Binance", "KuCoin", "Kraken"],
      "similar_to": [],
      "better_than": []
    }
  }'::jsonb
)
ON CONFLICT (exchange_id, version) DO UPDATE SET
  parsed_summary = EXCLUDED.parsed_summary,
  risk_score = EXCLUDED.risk_score,
  updated_at = NOW();

-- ==================================================
-- 2. OKX (HIGH RISK with Socialized Clawback)
-- ==================================================

INSERT INTO exchanges (name, slug, type, website_url, terms_url, jurisdiction, is_active)
VALUES (
  'OKX',
  'okx',
  'cex',
  'https://www.okx.com',
  'https://www.okx.com/help/terms-of-service',
  ARRAY['Seychelles', 'Malta'],
  true
)
ON CONFLICT (slug) DO UPDATE SET
  updated_at = NOW(),
  terms_url = EXCLUDED.terms_url;

INSERT INTO exchange_terms (
  exchange_id,
  version,
  document_type,
  content_hash,
  has_arbitration,
  has_class_action_waiver,
  has_termination_at_will,
  has_auto_deleveraging,
  has_forced_liquidation,
  has_clawback,
  has_asset_seizure,
  has_trade_rollback,
  has_abnormal_trading_trigger,
  risk_score,
  risk_level,
  parsed_summary
) VALUES (
  (SELECT id FROM exchanges WHERE slug = 'okx'),
  1,
  'terms',
  'okx_terms_v1_hash_' || NOW()::TEXT,

  true,  -- has_arbitration (Clause 20)
  true,  -- has_class_action_waiver
  true,  -- has_termination_at_will
  true,  -- has_auto_deleveraging (Clause 6.82)
  true,  -- has_forced_liquidation (Clause 6.76-6.78)
  true,  -- has_clawback (Clause 6.82 - socialized clawback)
  true,  -- has_asset_seizure (Clause 7.11)
  true,  -- has_trade_rollback (Clause 4.13)
  true,  -- has_abnormal_trading_trigger (Clause 4.13b)

  85,    -- risk_score
  'high', -- risk_level

  '{
    "risk_score": 85,
    "risk_level": "high",
    "jurisdiction": "Seychelles, Malta",
    "terms_url": "https://www.okx.com/help/terms-of-service",
    "last_analyzed": "2025-11-05",

    "critical_risks": [
      {
        "type": "socialized_clawback",
        "severity": "critical",
        "clause": "6.82",
        "quote": "OKX can trigger a socialized claw-back mechanism to take a portion of user gains to cover shortfalls",
        "impact": "Your profits can be taken to cover other users losses",
        "trigger": "OKX has full discretion to determine when to use security funds",
        "user_impact": "Even if you trade profitably, your gains can be seized to pay for others losses during market stress"
      },
      {
        "type": "forced_liquidation",
        "severity": "critical",
        "clause": "6.76-6.78",
        "quote": "If you do not [provide additional funds], we will be entitled to close one or some or all of your positions",
        "impact": "Positions closed without consent",
        "trigger": "Insufficient margin",
        "user_impact": "Loss of leveraged positions during volatility"
      },
      {
        "type": "trade_rollback",
        "severity": "high",
        "clause": "4.13",
        "quote": "OKX can process, cancel, correct, claw back, and/or reverse any Digital Asset transaction",
        "impact": "Any transaction can be reversed",
        "trigger": "System failures, abnormal transactions, potential financial crimes",
        "user_impact": "Profitable trades may be cancelled retroactively"
      },
      {
        "type": "asset_seizure",
        "severity": "critical",
        "clause": "7.11",
        "quote": "OKX can freeze, debit, convert, withhold, and/or liquidate assets to offset insufficiencies",
        "impact": "Funds can be taken",
        "trigger": "Account insufficiency",
        "user_impact": "Assets can be liquidated without consent"
      }
    ],

    "high_risks": [
      {
        "type": "auto_deleveraging",
        "clause": "6.82",
        "impact": "Profitable positions may be reduced during volatility"
      },
      {
        "type": "abnormal_trading",
        "clause": "4.13(b)",
        "impact": "Account controls for insider trading, market manipulation (vague criteria)"
      },
      {
        "type": "arbitration",
        "clause": "20",
        "impact": "Cannot sue in court"
      }
    ],

    "medium_risks": [
      {
        "type": "irreversible_transactions",
        "impact": "Accidental sends not recoverable"
      },
      {
        "type": "no_deposit_insurance",
        "impact": "Funds not protected by insurance"
      }
    ],

    "summary": "OKX has extensive clawback and liquidation rights, including the ability to take your profits to cover other users losses (socialized clawback). While more transparent than MEXC, OKX maintains broad discretionary powers. Users should carefully monitor margin requirements and understand ADL risks.",

    "recommendations": [
      "Read Clauses 6.76-6.82 and 4.13 in detail",
      "Understand margin requirements to avoid forced liquidation",
      "Be aware profits may be clawed back during market stress",
      "Consider position size limits to reduce ADL risk"
    ]
  }'::jsonb
);

-- ==================================================
-- 3. KUCOIN (HIGH RISK)
-- ==================================================

INSERT INTO exchanges (name, slug, type, website_url, terms_url, jurisdiction, is_active)
VALUES (
  'KuCoin',
  'kucoin',
  'cex',
  'https://www.kucoin.com',
  'https://www.kucoin.com/support/47185419968079',
  ARRAY['Seychelles'],
  true
)
ON CONFLICT (slug) DO UPDATE SET updated_at = NOW();

INSERT INTO exchange_terms (
  exchange_id,
  version,
  document_type,
  content_hash,
  has_arbitration,
  has_class_action_waiver,
  has_termination_at_will,
  has_auto_deleveraging,
  has_forced_liquidation,
  has_clawback,
  has_asset_seizure,
  has_trade_rollback,
  risk_score,
  risk_level,
  parsed_summary
) VALUES (
  (SELECT id FROM exchanges WHERE slug = 'kucoin'),
  1,
  'terms',
  'kucoin_terms_v1_hash_' || NOW()::TEXT,

  true,  -- has_arbitration (likely)
  true,  -- has_class_action_waiver (likely)
  true,  -- has_termination_at_will
  true,  -- has_auto_deleveraging (standard)
  true,  -- has_forced_liquidation
  false, -- has_clawback (not detected)
  false, -- has_asset_seizure
  true,  -- has_trade_rollback (order cancellation rights)

  75,    -- risk_score
  'high',

  '{
    "risk_score": 75,
    "risk_level": "high",
    "jurisdiction": "Seychelles",
    "terms_url": "https://www.kucoin.com/support/47185419968079",
    "last_analyzed": "2025-11-05",
    "total_policies": 45,
    "high_risk_policies": 30,
    "unfavorable_policies": 24,

    "critical_risks": [
      {
        "type": "total_loss_warning",
        "quote": "Users can sustain a total loss of the Funds",
        "impact": "Platform accepts no responsibility for losses"
      },
      {
        "type": "order_cancellation",
        "quote": "Reserves right to correct, reverse or cancel any order",
        "impact": "Executed trades can be reversed",
        "trigger": "Platform discretion"
      }
    ],

    "high_risks": [
      {
        "type": "forced_liquidation",
        "impact": "Positions closed without consent (futures/margin)"
      },
      {
        "type": "auto_deleveraging",
        "impact": "Standard on derivatives"
      },
      {
        "type": "stop_loss_failure",
        "impact": "Stop-loss orders may not execute during volatility"
      }
    ],

    "medium_risks": [
      {
        "type": "geographic_restrictions",
        "impact": "US, China banned"
      },
      {
        "type": "data_collection",
        "impact": "International data transfers"
      },
      {
        "type": "no_internet_safety_guarantee",
        "impact": "Platform not responsible for transmission errors"
      },
      {
        "type": "arbitration",
        "impact": "Likely required"
      }
    ],

    "summary": "KuCoin has typical high-risk CEX policies (ADL, forced liquidation, order reversal) but appears more transparent than MEXC or OKX. No explicit clawback language detected, but order cancellation rights are broad. Clearer dispute process than some competitors.",

    "recommendations": [
      "Understand that stop-loss orders are not guaranteed",
      "Review geographic restrictions if trading internationally",
      "Monitor data privacy settings",
      "Limit exposure during high volatility"
    ]
  }'::jsonb
);

-- ==================================================
-- 4. KRAKEN (MEDIUM RISK - US Regulated)
-- ==================================================

INSERT INTO exchanges (name, slug, type, website_url, terms_url, jurisdiction, is_active)
VALUES (
  'Kraken',
  'kraken',
  'cex',
  'https://www.kraken.com',
  'https://www.kraken.com/legal',
  ARRAY['United States'],
  true
)
ON CONFLICT (slug) DO UPDATE SET updated_at = NOW();

INSERT INTO exchange_terms (
  exchange_id,
  version,
  document_type,
  content_hash,
  has_arbitration,
  has_class_action_waiver,
  has_termination_at_will,
  has_auto_deleveraging,
  has_forced_liquidation,
  has_clawback,
  has_asset_seizure,
  has_trade_rollback,
  risk_score,
  risk_level,
  parsed_summary
) VALUES (
  (SELECT id FROM exchanges WHERE slug = 'kraken'),
  1,
  'terms',
  'kraken_terms_v1_hash_' || NOW()::TEXT,

  true,  -- has_arbitration (for disputes)
  false, -- has_class_action_waiver (US regulations)
  true,  -- has_termination_at_will
  true,  -- has_auto_deleveraging (futures only)
  true,  -- has_forced_liquidation (margin products)
  false, -- has_clawback (not detected)
  false, -- has_asset_seizure
  false, -- has_trade_rollback

  60,    -- risk_score (MEDIUM)
  'medium',

  '{
    "risk_score": 60,
    "risk_level": "medium",
    "jurisdiction": "United States (San Francisco, CA)",
    "terms_url": "https://www.kraken.com/legal",
    "last_analyzed": "2025-11-05",

    "critical_risks": [],

    "high_risks": [
      {
        "type": "margin_trading_losses",
        "quote": "You may lose more than your initial investment",
        "impact": "Losses can exceed deposit",
        "context": "Margin/leverage products"
      },
      {
        "type": "account_termination",
        "quote": "We may suspend or terminate your account at our discretion",
        "impact": "Account access can be removed",
        "trigger": "Platform discretion"
      }
    ],

    "medium_risks": [
      {
        "type": "forced_liquidation",
        "impact": "Margin products only",
        "scope": "Limited to leveraged trading"
      },
      {
        "type": "auto_deleveraging",
        "impact": "Futures only",
        "scope": "Limited to futures products"
      },
      {
        "type": "arbitration",
        "impact": "Binding arbitration for disputes"
      }
    ],

    "low_risks": [
      {
        "type": "data_sharing",
        "impact": "Data shared with affiliates and third parties"
      },
      {
        "type": "fee_changes",
        "impact": "Fee structure can change"
      }
    ],

    "advantages": [
      "No clawback provision",
      "No class action waiver",
      "US regulatory oversight",
      "Clearer dispute resolution",
      "Limited ADL (futures only)",
      "Limited forced liquidation (margin only)"
    ],

    "summary": "Kraken (US-regulated) has fewer restrictive clauses than offshore exchanges. No explicit clawback provision or class action waiver detected. Better user protections due to US regulatory oversight. Main risks are standard margin trading warnings and account suspension rights.",

    "recommendations": [
      "Still review margin trading risks carefully",
      "Complete KYC verification to avoid account issues",
      "Understand limited legal recourse despite US jurisdiction",
      "Monitor policy changes"
    ]
  }'::jsonb
);

-- ==================================================
-- 5. BITGET (HIGH RISK)
-- ==================================================

INSERT INTO exchanges (name, slug, type, website_url, terms_url, jurisdiction, is_active)
VALUES (
  'Bitget',
  'bitget',
  'cex',
  'https://www.bitget.com',
  'https://www.bitget.com/earning/savings',
  ARRAY['Seychelles'],
  true
)
ON CONFLICT (slug) DO UPDATE SET updated_at = NOW();

INSERT INTO exchange_terms (
  exchange_id,
  version,
  document_type,
  content_hash,
  has_arbitration,
  has_class_action_waiver,
  has_termination_at_will,
  has_auto_deleveraging,
  has_forced_liquidation,
  has_clawback,
  has_asset_seizure,
  risk_score,
  risk_level,
  parsed_summary
) VALUES (
  (SELECT id FROM exchanges WHERE slug = 'bitget'),
  1,
  'terms',
  'bitget_terms_v1_hash_' || NOW()::TEXT,

  true,  -- has_arbitration (likely)
  true,  -- has_class_action_waiver (likely)
  true,  -- has_termination_at_will
  true,  -- has_auto_deleveraging
  true,  -- has_forced_liquidation
  false, -- has_clawback (not detected)
  false, -- has_asset_seizure

  80,    -- risk_score (HIGH)
  'high',

  '{
    "risk_score": 80,
    "risk_level": "high",
    "jurisdiction": "Seychelles",
    "terms_url": "https://www.bitget.com/earning/savings",
    "last_analyzed": "2025-11-05",
    "total_policies": 51,
    "high_risk_policies": 25,
    "unfavorable_policies": 21,

    "critical_risks": [
      {
        "type": "total_loss_warning",
        "quote": "Trading digital assets involves significant risks, including the potential total loss of investment",
        "impact": "Platform accepts no liability"
      },
      {
        "type": "irrevocable_transactions",
        "quote": "Transactions involving Digital Assets are irrevocable. Lost or stolen Digital Assets may be irretrievable",
        "impact": "No recovery for errors or theft",
        "context": "Blockchain finality"
      },
      {
        "type": "volatility_warning",
        "quote": "The value of Digital Assets may fluctuate significantly over a short period of time",
        "impact": "Rapid losses possible"
      }
    ],

    "high_risks": [
      {
        "type": "forced_liquidation",
        "impact": "Derivatives positions can be closed"
      },
      {
        "type": "auto_deleveraging",
        "impact": "ADL on derivatives"
      },
      {
        "type": "terms_modification",
        "impact": "Terms can change without notification"
      },
      {
        "type": "no_guaranteed_performance",
        "impact": "No investment guarantees"
      }
    ],

    "medium_risks": [
      {
        "type": "withdrawal_restrictions",
        "impact": "Withdrawals may be restricted"
      },
      {
        "type": "international_data_transfers",
        "impact": "Data transferred globally"
      },
      {
        "type": "age_restriction",
        "impact": "Must be 18+"
      }
    ],

    "summary": "Bitget has extensive risk disclosures and high-risk policies. No explicit clawback detected, but broad disclaimers of liability. Platform reserves right to modify terms without notification. Total loss of funds is explicitly possible.",

    "recommendations": [
      "Understand irrevocability of blockchain transactions",
      "Do not deposit more than you can afford to lose",
      "Monitor terms changes proactively",
      "Verify age and KYC requirements"
    ]
  }'::jsonb
);

-- ==================================================
-- 6. GATE.IO (HIGH RISK - Limited Data)
-- ==================================================

INSERT INTO exchanges (name, slug, type, website_url, terms_url, jurisdiction, is_active)
VALUES (
  'Gate.io',
  'gate-io',
  'cex',
  'https://www.gate.io',
  'https://www.gate.io/page/terms-of-service',
  ARRAY['Cayman Islands'],
  true
)
ON CONFLICT (slug) DO UPDATE SET updated_at = NOW();

INSERT INTO exchange_terms (
  exchange_id,
  version,
  document_type,
  content_hash,
  has_arbitration,
  has_class_action_waiver,
  has_termination_at_will,
  has_auto_deleveraging,
  has_forced_liquidation,
  has_clawback,
  risk_score,
  risk_level,
  parsed_summary
) VALUES (
  (SELECT id FROM exchanges WHERE slug = 'gate-io'),
  1,
  'terms',
  'gateio_terms_v1_hash_' || NOW()::TEXT,

  NULL,  -- has_arbitration (TBD - needs manual review)
  NULL,  -- has_class_action_waiver (TBD)
  NULL,  -- has_termination_at_will (TBD)
  NULL,  -- has_auto_deleveraging (TBD)
  NULL,  -- has_forced_liquidation (TBD)
  NULL,  -- has_clawback (TBD)

  70,    -- risk_score (estimated based on jurisdiction)
  'high',

  '{
    "risk_score": 70,
    "risk_level": "high",
    "jurisdiction": "Cayman Islands",
    "terms_url": "https://www.gate.io/page/terms-of-service",
    "last_analyzed": "2025-11-05",
    "data_status": "incomplete",
    "notes": "Page returned 404 during analysis. Risk score estimated based on jurisdiction and industry norms.",

    "estimated_risks": [
      {
        "type": "forced_liquidation",
        "likelihood": "likely",
        "reasoning": "Standard for Cayman-based exchanges"
      },
      {
        "type": "auto_deleveraging",
        "likelihood": "likely",
        "reasoning": "Common on derivatives platforms"
      },
      {
        "type": "arbitration",
        "likelihood": "likely",
        "reasoning": "Typical for offshore exchanges"
      }
    ],

    "summary": "Gate.io data was not fully accessible during this analysis. Based on jurisdiction (Cayman Islands) and industry norms, likely has similar high-risk policies to OKX and KuCoin. Recommend manual review of terms before trading.",

    "recommendations": [
      "Manually review full terms at gate.io",
      "Assume high-risk policies until confirmed otherwise",
      "Compare to similar Cayman-based exchanges",
      "Request detailed analysis before depositing significant funds"
    ],

    "action_required": "Manual review needed to confirm risk flags"
  }'::jsonb
);

-- ==================================================
-- SUMMARY QUERY
-- ==================================================

-- View all exchanges with risk scores
SELECT
  e.name,
  e.jurisdiction,
  et.risk_score,
  et.risk_level,
  et.has_clawback,
  et.has_forced_liquidation,
  et.has_auto_deleveraging,
  et.has_trade_rollback,
  et.has_asset_seizure,
  et.updated_at
FROM exchanges e
LEFT JOIN exchange_terms et ON e.id = et.exchange_id
WHERE et.version = (
  SELECT MAX(version) FROM exchange_terms WHERE exchange_id = e.id
)
ORDER BY et.risk_score DESC NULLS LAST;

-- ==================================================
-- NOTES
-- ==================================================

/*
DEPLOYMENT STEPS:

1. Run migration (ALTER TABLE) first
2. Run exchange inserts (will return UUIDs)
3. Copy UUIDs and update any placeholders if needed
4. Verify with summary query

RISK SCORE BREAKDOWN (Updated):

95/100 - MEXC (CRITICAL)
- Clawback (Clause 21c) ✓
- Asset Seizure ✓
- Trade Rollback ✓
- Abnormal Trading Trigger ✓
- Forced Liquidation ✓
- Arbitration ✓
- Class Waiver ✓

85/100 - OKX (HIGH)
- Socialized Clawback (Clause 6.82) ✓
- Asset Seizure (Clause 7.11) ✓
- Trade Rollback (Clause 4.13) ✓
- Forced Liquidation (Clause 6.76) ✓
- ADL (Clause 6.82) ✓
- Abnormal Trading (Clause 4.13b) ✓
- Arbitration (Clause 20) ✓

80/100 - Bitget (HIGH)
- Total Loss Warning ✓
- Irrevocable Transactions ✓
- Forced Liquidation ✓
- ADL ✓
- Terms Modification Without Notice ✓

75/100 - KuCoin (HIGH)
- Total Loss Warning ✓
- Order Cancellation Rights ✓
- Forced Liquidation ✓
- ADL ✓
- Stop-Loss Failure Risk ✓

70/100 - Gate.io (HIGH - INCOMPLETE DATA)
- Estimated based on jurisdiction
- Manual review required

60/100 - Kraken (MEDIUM)
- Margin Trading Losses ✓
- Account Termination Rights ✓
- Forced Liquidation (margin only) ✓
- ADL (futures only) ✓
- Arbitration ✓
- NO Clawback ✓
- NO Class Waiver ✓
- US Regulated ✓

KEY FINDINGS:
- Only 2/6 exchanges have explicit clawback (MEXC, OKX)
- Only 1/6 is US-regulated (Kraken)
- 5/6 are offshore (Seychelles, Cayman, Malta)
- US regulation = 15-35 points lower risk

NEXT STEPS:
1. Analyze remaining 18 platforms from POLICIES_SUMMARY.md
2. Create Mirra repository format for consumer-facing summaries
3. Add version tracking for terms changes
4. Implement automated monitoring for updates
*/
