import { createClient } from 'next-sanity';

const client = createClient({
  projectId: 'c15x4s4x',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
});

async function searchWithdrawalPolicies() {
  const query = `*[_id == "pPkuniS6qVZF4B8OpWIemW"][0]{
    name,
    policies[]{
      title,
      category,
      summary,
      impact,
      section,
      details
    }
  }`;

  const result = await client.fetch(query);

  console.log('📋 Searching MEXC policies for withdrawal/payout restrictions...\n');

  const relevantPolicies = result.policies.filter((p: any) => {
    const text = (p.title + ' ' + p.summary + ' ' + JSON.stringify(p.details)).toLowerCase();
    return text.includes('withdraw') ||
           text.includes('payout') ||
           text.includes('suspend') ||
           text.includes('freeze') ||
           text.includes('terminate') ||
           text.includes('liquidat') ||
           text.includes('seize') ||
           text.includes('confiscate') ||
           text.includes('restriction') ||
           text.includes('prohibit');
  });

  console.log(`Found ${relevantPolicies.length} relevant policies:\n`);

  relevantPolicies.forEach((policy: any, idx: number) => {
    console.log(`${idx + 1}. ${policy.title} [${policy.section}]`);
    console.log(`   Category: ${policy.category} | Impact: ${policy.impact}`);
    console.log(`   Summary: ${policy.summary}`);
    if (policy.details && policy.details[0]?.children?.[0]?.text) {
      console.log(`   Details: ${policy.details[0].children[0].text}`);
    }
    console.log('');
  });
}

searchWithdrawalPolicies().catch(console.error);
