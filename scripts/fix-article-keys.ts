import { createClient } from 'next-sanity';
import crypto from 'crypto';

const writeClient = createClient({
  projectId: 'c15x4s4x',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function fixArticleKeys() {
  console.log('🔧 Fixing missing _key properties in article...\n');

  // Get the article
  const query = `*[_type == "article" && slug.current == "binance-oracle-failure-600m-loss"][0]{
    _id,
    content
  }`;

  const article = await writeClient.fetch(query);

  if (!article) {
    console.error('❌ Article not found');
    return;
  }

  // Add _key to each block and child
  const fixedContent = article.content.map((block: any) => ({
    ...block,
    _key: block._key || crypto.randomBytes(12).toString('hex'),
    children: block.children?.map((child: any) => ({
      ...child,
      _key: child._key || crypto.randomBytes(12).toString('hex'),
    })),
  }));

  // Update the article
  await writeClient
    .patch(article._id)
    .set({ content: fixedContent })
    .commit();

  console.log('✅ Article fixed successfully!');
  console.log(`   Added _key properties to ${fixedContent.length} blocks\n`);
}

fixArticleKeys().catch(console.error);
