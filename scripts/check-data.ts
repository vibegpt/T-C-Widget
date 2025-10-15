import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

async function checkData() {
  console.log('📊 Checking database...\n');

  const { data: exchanges, error: exchangesError } = await supabase
    .from('exchanges')
    .select('name, slug')
    .order('name');

  if (exchangesError) {
    console.error('Error fetching exchanges:', exchangesError);
    return;
  }

  console.log(`Found ${exchanges?.length || 0} exchanges:`);
  exchanges?.forEach(ex => console.log(`  - ${ex.name} (${ex.slug})`));

  const { data: terms, error: termsError } = await supabase
    .from('exchange_terms')
    .select('exchange_id')
    .limit(1);

  if (termsError) {
    console.error('\nError fetching terms:', termsError);
  } else {
    console.log(`\n✅ Found ${terms?.length || 0} term records`);
  }
}

checkData();
