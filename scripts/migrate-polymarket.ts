import { createClient } from 'next-sanity';

const writeClient = createClient({
  projectId: 'c15x4s4x',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function migratePolymarket() {
  console.log('🔄 Migrating Polymarket from thirdPartyApp to predictionMarket...\n');

  // Fetch the existing Polymarket document
  const existingDoc = await writeClient.fetch(
    `*[_id == "yoRegLyjAjsStViXmQJtiq"][0]`
  );

  if (!existingDoc) {
    console.error('❌ Polymarket document not found');
    return;
  }

  console.log(`✓ Found Polymarket document (type: ${existingDoc._type})\n`);

  // Create new document with predictionMarket type
  const newDoc = {
    _type: 'predictionMarket',
    name: existingDoc.name,
    slug: existingDoc.slug,
    description: existingDoc.description,
    image: existingDoc.image,
    founded: existingDoc.founded,
    jurisdiction: existingDoc.jurisdiction,
    tradingVolume: undefined, // Can be added manually later
    users: undefined, // Can be added manually later
    displayOrder: existingDoc.displayOrder || 999,
    featured: existingDoc.featured !== false,
    overallRating: existingDoc.overallRating,
    riskScore: existingDoc.riskScore,
    quickSummary: existingDoc.quickSummary,
    termsUrl: existingDoc.termsUrl,
    policies: existingDoc.policies,
    keyTakeaways: existingDoc.keyTakeaways,
  };

  console.log('➕ Creating new predictionMarket document...\n');

  const result = await writeClient.create(newDoc);

  console.log(`✅ Created new document with ID: ${result._id}\n`);

  console.log('🗑️  Deleting old thirdPartyApp document...\n');

  await writeClient.delete('yoRegLyjAjsStViXmQJtiq');

  console.log('✅ Migration complete!\n');
  console.log(`New Polymarket ID: ${result._id}`);
  console.log(`Type: predictionMarket`);
  console.log(`Policies preserved: ${result.policies?.length || 0}`);
}

migratePolymarket().catch(console.error);
