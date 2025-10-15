/**
 * Script to fetch and analyze cryptocurrency exchange terms
 * Usage: tsx scripts/fetch-exchange-terms.ts
 */

import { createClient } from '@supabase/supabase-js';
import {
  MAJOR_EXCHANGES,
  analyzeExchanges,
  calculateRiskScore,
  type ExchangeAnalysis,
} from '../src/lib/crypto/analyzeExchange';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🚀 Starting exchange terms analysis...\n');

  // Analyze first 5 exchanges to start (to avoid rate limits)
  const exchangesToAnalyze = MAJOR_EXCHANGES.slice(0, 5);

  console.log(`Analyzing ${exchangesToAnalyze.length} exchanges:`);
  exchangesToAnalyze.forEach(ex => console.log(`  - ${ex.name}`));
  console.log();

  const analyses = await analyzeExchanges(exchangesToAnalyze);

  console.log(`\n✅ Successfully analyzed ${analyses.length} exchanges\n`);

  // Insert into database
  for (const analysis of analyses) {
    try {
      console.log(`\n📊 Processing ${analysis.exchange.name}...`);

      // 1. Insert or update exchange
      const { data: exchangeData, error: exchangeError } = await supabase
        .from('exchanges')
        .upsert({
          name: analysis.exchange.name,
          slug: analysis.exchange.slug,
          type: analysis.exchange.type,
          website_url: analysis.exchange.websiteUrl,
          terms_url: analysis.exchange.termsUrl,
          jurisdiction: analysis.exchange.jurisdiction,
          logo_url: analysis.exchange.logoUrl,
          is_active: true,
        }, {
          onConflict: 'slug',
        })
        .select()
        .single();

      if (exchangeError) {
        console.error(`  ❌ Error inserting exchange:`, exchangeError);
        continue;
      }

      console.log(`  ✓ Exchange record created/updated`);

      // 2. Insert terms
      const { data: termsData, error: termsError } = await supabase
        .from('exchange_terms')
        .insert({
          exchange_id: exchangeData.id,
          version: analysis.version,
          document_type: 'terms',
          raw_text: analysis.rawText,
          content_hash: analysis.contentHash,
          parsed_summary: analysis.parsedSummary,
          has_arbitration: analysis.risks.hasArbitration,
          has_class_action_waiver: analysis.risks.hasClassActionWaiver,
          has_termination_at_will: analysis.risks.hasTerminationAtWill,
          has_auto_deleveraging: analysis.risks.hasAutoDeleveraging,
          has_forced_liquidation: analysis.risks.hasForcedLiquidation,
          liability_cap_amount: analysis.risks.liabilityCap,
          opt_out_days: analysis.risks.optOutDays,
          fetched_at: analysis.fetchedAt.toISOString(),
        })
        .select()
        .single();

      if (termsError) {
        console.error(`  ❌ Error inserting terms:`, termsError);
        continue;
      }

      console.log(`  ✓ Terms record created (hash: ${analysis.contentHash.substring(0, 8)}...)`);

      // 3. Insert identified risks
      for (const risk of analysis.identifiedRisks) {
        // Find or create risk category
        const { data: categoryData } = await supabase
          .from('risk_categories')
          .select()
          .eq('key', risk.key)
          .single();

        if (categoryData) {
          // Insert exchange risk
          const { error: riskError } = await supabase
            .from('exchange_risks')
            .insert({
              exchange_id: exchangeData.id,
              term_id: termsData.id,
              risk_category_id: categoryData.id,
              summary: risk.summary,
              quote: risk.quote,
            });

          if (riskError && !riskError.message.includes('duplicate')) {
            console.error(`  ⚠️  Error inserting risk ${risk.key}:`, riskError.message);
          } else {
            console.log(`  ✓ Risk recorded: ${risk.title}`);
          }
        }
      }

      // Calculate and display risk score
      const riskScore = calculateRiskScore(analysis);
      console.log(`  📈 Risk Score: ${riskScore}/100`);
      console.log(`  🔍 Key Findings:`);
      analysis.keyFindings.forEach(finding => {
        console.log(`     ${finding}`);
      });

    } catch (error) {
      console.error(`  ❌ Error processing ${analysis.exchange.name}:`, error);
    }
  }

  console.log('\n✨ Done!\n');
}

main().catch(console.error);
