import { client } from '@/lib/sanity';
import imageUrlBuilder from '@sanity/image-url';
import ThirdPartyAppDetail from './ThirdPartyAppDetail';

const builder = imageUrlBuilder(client);

function urlFor(source: any) {
  return builder.image(source);
}

async function getThirdPartyApp(slug: string) {
  const query = `*[_type == "thirdPartyApp" && slug.current == $slug][0]{
    _id,
    name,
    description,
    image,
    category,
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

  const app = await client.fetch(query, { slug });

  // Add image URL to app data
  if (app?.image) {
    app.imageUrl = urlFor(app.image).width(200).height(200).url();
  }

  return app;
}

export default async function Page({ params }: { params: { slug: string } }) {
  const app = await getThirdPartyApp(params.slug);
  return <ThirdPartyAppDetail app={app} />;
}
