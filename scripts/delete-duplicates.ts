import { createClient } from 'next-sanity';

const writeClient = createClient({
  projectId: 'c15x4s4x',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function deleteDuplicates() {
  const duplicateIds = [
    'df631d41-0bd3-4629-a9ad-5e9bb7de6566', // Bithumb old
    'c83fe6c2-0196-4d3c-9e38-449245a57e14', // Kraken old
    'NVi8Lbm72mV0apzYeIhIHS',               // Phantom duplicate 1
    'yoSsRRcJFJEJJsunFbbbht',               // Phantom duplicate 2
    'NVi8Lbm72mV0apzYeIfJbO',               // Phantom duplicate 3
  ];

  console.log(`Deleting ${duplicateIds.length} duplicate entries...\n`);

  for (const id of duplicateIds) {
    try {
      await writeClient.delete(id);
      console.log(`✓ Deleted: ${id}`);
    } catch (error) {
      console.error(`✗ Failed to delete ${id}:`, error);
    }
  }

  console.log('\n✅ Done! Duplicates removed.');
  console.log('\nYou may also want to delete these entries with NO policies:');
  console.log('  - BitGo: c36306a1-494b-4848-aa91-67be603ef619');
  console.log('  - Coinbase: 7416f03d-4a31-4963-b3ff-05d91901d115');
  console.log('  - Huobi: d546e3a5-0d0d-4c1a-8c7a-6fe1b1521838');
}

deleteDuplicates().catch(console.error);
