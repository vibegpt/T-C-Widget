import { createClient } from 'next-sanity';

const client = createClient({
  projectId: 'c15x4s4x',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function checkArticle() {
  const query = `*[_type == "article" && slug.current == "binance-oracle-failure-600m-loss"][0]{
    _id,
    title,
    excerpt,
    content,
    publishedDate,
    featured,
    published
  }`;
  
  const article = await client.fetch(query);
  console.log('Article content:', JSON.stringify(article, null, 2));
}

checkArticle().catch(console.error);
