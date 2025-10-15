import { createClient } from 'next-sanity';

const client = createClient({
  projectId: 'c15x4s4x',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
});

async function findDuplicates() {
  const query = `*[_type == 'cex']{
    _id,
    name,
    'slug': slug.current,
    'policyCount': count(policies),
    _createdAt,
    featured
  } | order(name asc, _createdAt desc)`;

  const results = await client.fetch(query);

  // Group by name
  const grouped: Record<string, any[]> = {};
  results.forEach((item: any) => {
    if (!grouped[item.name]) {
      grouped[item.name] = [];
    }
    grouped[item.name].push(item);
  });

  console.log('=== DUPLICATE CEX ENTRIES ===\n');

  const duplicates: any[] = [];

  Object.entries(grouped).forEach(([name, items]) => {
    if (items.length > 1) {
      console.log(`${name}: ${items.length} duplicates`);
      items.forEach((item: any, idx: number) => {
        const date = new Date(item._createdAt).toISOString().split('T')[0];
        const keep = idx === 0 ? '✓ KEEP (newest)' : '❌ DELETE';
        console.log(`  [${keep}] ID: ${item._id} | Created: ${date} | Policies: ${item.policyCount || 0}`);

        if (idx > 0) {
          duplicates.push(item._id);
        }
      });
      console.log('');
    }
  });

  // Entries with no policies
  console.log('\n=== ENTRIES WITH NO POLICIES (Consider deleting) ===\n');
  const noPolicies = results.filter((r: any) => !r.policyCount || r.policyCount === 0);
  noPolicies.forEach((item: any) => {
    console.log(`${item.name}: ID ${item._id}`);
  });

  console.log(`\n\n=== SUMMARY ===`);
  console.log(`Total duplicate entries to delete: ${duplicates.length}`);
  console.log(`Entries with no policies: ${noPolicies.length}`);

  console.log(`\n\n=== HOW TO DELETE ===`);
  console.log(`1. Go to: https://legaleasy.sanity.studio/`);
  console.log(`2. Navigate to "Centralized Exchanges (CEX)"`);
  console.log(`3. Delete these duplicate IDs:\n`);
  duplicates.forEach(id => console.log(`   - ${id}`));
}

findDuplicates().catch(console.error);
