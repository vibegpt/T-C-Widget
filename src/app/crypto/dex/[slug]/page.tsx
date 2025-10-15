import { client } from '@/lib/sanity';
import imageUrlBuilder from '@sanity/image-url';
import ExchangeDetail from './ExchangeDetail';

const builder = imageUrlBuilder(client);

function urlFor(source: any) {
  return builder.image(source);
}

async function getExchange(slug: string) {
  const query = `*[_type == "dex" && slug.current == $slug][0]{
    _id,
    name,
    description,
    image,
    founded,
    jurisdiction,
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

  const exchange = await client.fetch(query, { slug });

  // Add image URL to exchange data
  if (exchange?.image) {
    exchange.imageUrl = urlFor(exchange.image).width(200).height(200).url();
  }

  return exchange;
}

export default async function Page({ params }: { params: { slug: string } }) {
  const exchange = await getExchange(params.slug);
  return <ExchangeDetail exchange={exchange} />;
}
