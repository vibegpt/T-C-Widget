import { createClient } from 'next-sanity';

const readClient = createClient({
  projectId: 'c15x4s4x',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function searchHyperliquidADL() {
  console.log('🔍 Searching Hyperliquid policies for auto-deleveraging mentions...\n');

  const result = await readClient.fetch(
    `*[_type == "dex" && slug.current == "hyperliquid"][0]{ _id, name, policies }`
  );

  if (!result) {
    console.log('❌ Hyperliquid not found in database');
    return;
  }

  console.log(`✓ Found Hyperliquid with ${result.policies?.length || 0} policies\n`);

  const adlPolicies = result.policies.filter((p: any) => {
    const title = (p.title || '').toLowerCase();
    const summary = (p.summary || '').toLowerCase();
    const details = JSON.stringify(p.details || {}).toLowerCase();
    const text = title + ' ' + summary + ' ' + details;

    return (
      (text.includes('auto') && text.includes('deleverag')) ||
      text.includes('adl') ||
      (text.includes('liquidation') && text.includes('counter')) ||
      (text.includes('position') && text.includes('reduc')) ||
      (text.includes('socialized') && text.includes('loss'))
    );
  });

  if (adlPolicies.length > 0) {
    console.log(`✅ Found ${adlPolicies.length} policy/policies mentioning auto-deleveraging:\n`);

    adlPolicies.forEach((policy: any, idx: number) => {
      console.log(`${idx + 1}. ${policy.title}`);
      console.log(`   Category: ${policy.category} | Impact: ${policy.impact}`);
      console.log(`   Summary: ${policy.summary}\n`);
    });
  } else {
    console.log('❌ No auto-deleveraging mentions found in Hyperliquid policies');
    console.log('\nSearching for general liquidation mentions...\n');

    const liquidationPolicies = result.policies.filter((p: any) => {
      const text = ((p.title || '') + ' ' + (p.summary || '')).toLowerCase();
      return text.includes('liquidat');
    });

    if (liquidationPolicies.length > 0) {
      console.log(`Found ${liquidationPolicies.length} liquidation-related policy/policies:\n`);
      liquidationPolicies.forEach((policy: any, idx: number) => {
        console.log(`${idx + 1}. ${policy.title}`);
        console.log(`   ${policy.summary}\n`);
      });
    }
  }

  console.log('\n📋 All Hyperliquid policies:');
  result.policies.forEach((p: any, idx: number) => {
    console.log(`${idx + 1}. ${p.title} (${p.category}, ${p.impact})`);
  });
}

searchHyperliquidADL().catch(console.error);
