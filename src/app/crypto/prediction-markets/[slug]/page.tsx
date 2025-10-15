import { client } from '@/lib/sanity';
import imageUrlBuilder from '@sanity/image-url';
import PredictionMarketDetail from './PredictionMarketDetail';

const builder = imageUrlBuilder(client);

function urlFor(source: any) {
  return builder.image(source);
}

async function getPredictionMarket(slug: string) {
  const query = `*[_type == "predictionMarket" && slug.current == $slug][0]{
    _id,
    name,
    description,
    image,
    founded,
    jurisdiction,
    tradingVolume,
    users,
    overallRating,
    quickSummary,
    termsUrl,
    riskScore,
    policies[]{
      section,
      title,
      category,
      summary,
      details,
      impact
    },
    keyTakeaways
  }`;

  const platform = await client.fetch(query, { slug });

  // Add image URL to platform data
  if (platform?.image) {
    platform.imageUrl = urlFor(platform.image).width(200).height(200).url();
  }

  return platform;
}

export default async function Page({ params }: { params: { slug: string } }) {
  const platform = await getPredictionMarket(params.slug);
  return <PredictionMarketDetail platform={platform} />;
}
