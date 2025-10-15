/**
 * Add mock risk data for demonstration purposes
 * This simulates what the parser would find with better tuning
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

async function main() {
  console.log('📝 Adding demonstration risk data...\n');

  // Update Binance with typical CEX risks
  const { data: binance } = await supabase
    .from('exchanges')
    .select('id')
    .eq('slug', 'binance')
    .single();

  if (binance) {
    await supabase
      .from('exchange_terms')
      .update({
        has_arbitration: true,
        has_class_action_waiver: true,
        has_termination_at_will: true,
        has_auto_deleveraging: true,
        has_forced_liquidation: true,
        liability_cap_amount: 100,
      })
      .eq('exchange_id', binance.id);

    console.log('✅ Updated Binance with risk flags');
  }

  // Update Coinbase
  const { data: coinbase } = await supabase
    .from('exchanges')
    .select('id')
    .eq('slug', 'coinbase')
    .single();

  if (coinbase) {
    await supabase
      .from('exchange_terms')
      .update({
        has_arbitration: true,
        has_class_action_waiver: true,
        has_termination_at_will: true,
        has_auto_deleveraging: false,
        has_forced_liquidation: true,
        liability_cap_amount: 50000,
      })
      .eq('exchange_id', coinbase.id);

    console.log('✅ Updated Coinbase with risk flags');
  }

  console.log('\n✨ Mock data added!\n');
}

main();
