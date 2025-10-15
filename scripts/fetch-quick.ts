/**
 * Quick script to fetch just Binance and Coinbase for MVP
 */

import { createClient } from '@supabase/supabase-js';
import { analyzeExchange, calculateRiskScore } from '../src/lib/crypto/analyzeExchange';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// Just Binance and Coinbase for quick MVP
const exchanges = [
  {
    name: 'Binance',
    slug: 'binance',
    type: 'cex' as const,
    websiteUrl: 'https://www.binance.com',
    termsUrl: 'https://www.binance.com/en/terms',
    jurisdiction: ['Cayman Islands'],
  },
  {
    name: 'Coinbase',
    slug: 'coinbase',
    type: 'cex' as const,
    websiteUrl: 'https://www.coinbase.com',
    termsUrl: 'https://www.coinbase.com/legal/user_agreement',
    jurisdiction: ['United States'],
  },
];

async function main() {
  console.log('🚀 Quick fetch: Analyzing 2 exchanges...\n');

  for (const config of exchanges) {
    try {
      console.log(`\n📊 Analyzing ${config.name}...`);

      const analysis = await analyzeExchange(config);

      // Insert exchange
      const { data: exchangeData, error: exchangeError } = await supabase
        .from('exchanges')
        .upsert({
          name: config.name,
          slug: config.slug,
          type: config.type,
          website_url: config.websiteUrl,
          terms_url: config.termsUrl,
          jurisdiction: config.jurisdiction,
          is_active: true,
        }, {
          onConflict: 'slug',
        })
        .select()
        .single();

      if (exchangeError) {
        console.error(`  ❌ Error: ${exchangeError.message}`);
        continue;
      }

      console.log(`  ✓ Exchange record created`);

      // Insert terms
      const { data: termsData, error: termsError } = await supabase
        .from('exchange_terms')
        .insert({
          exchange_id: exchangeData.id,
          version: 1,
          document_type: 'terms',
          raw_text: analysis.rawText.substring(0, 50000), // Limit size
          content_hash: analysis.contentHash,
          parsed_summary: analysis.parsedSummary,
          has_arbitration: analysis.risks.hasArbitration,
          has_class_action_waiver: analysis.risks.hasClassActionWaiver,
          has_termination_at_will: analysis.risks.hasTerminationAtWill,
          has_auto_deleveraging: analysis.risks.hasAutoDeleveraging,
          has_forced_liquidation: analysis.risks.hasForcedLiquidation,
          liability_cap_amount: analysis.risks.liabilityCap,
          opt_out_days: analysis.risks.optOutDays,
        })
        .select()
        .single();

      if (termsError) {
        console.error(`  ❌ Error: ${termsError.message}`);
        continue;
      }

      console.log(`  ✓ Terms saved`);

      const riskScore = calculateRiskScore(analysis);
      console.log(`  📈 Risk Score: ${riskScore}/100`);
      console.log(`  🔍 Key Findings:`);
      analysis.keyFindings.forEach(f => console.log(`     ${f}`));

    } catch (error: any) {
      console.error(`  ❌ Failed: ${error.message}`);
    }
  }

  console.log('\n✨ Done!\n');
}

main();
