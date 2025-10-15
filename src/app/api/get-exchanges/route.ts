import { NextResponse } from 'next/server';
import { client } from '@/lib/sanity';

export async function GET() {
  try {
    const query = `*[_type == "cex"] | order(name asc) {
      _id,
      name,
      slug
    }`;

    const exchanges = await client.fetch(query);

    return NextResponse.json({
      success: true,
      exchanges,
    });
  } catch (error: unknown) {
    console.error('Fetch exchanges error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchanges', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
