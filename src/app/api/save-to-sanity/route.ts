import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'next-sanity';

// Create a write client with authentication
const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'c15x4s4x',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

export async function POST(request: NextRequest) {
  try {
    const { exchangeId, exchangeName, slug, analysis, termsUrl, founded, jurisdiction, exchangeType } = await request.json();

    if (!exchangeName || !analysis) {
      return NextResponse.json(
        { error: 'Missing required fields: exchangeName and analysis' },
        { status: 400 }
      );
    }

    // Convert the details string to portable text format for Sanity
    const convertToPortableText = (details: string) => {
      return [
        {
          _type: 'block',
          style: 'normal',
          children: [
            {
              _type: 'span',
              text: details,
              marks: [],
            },
          ],
        },
      ];
    };

    const policies = analysis.policies?.map((policy: any) => ({
      _type: 'policyItem',
      section: policy.section,
      title: policy.title,
      category: policy.category,
      summary: policy.summary,
      details: convertToPortableText(policy.details),
      impact: policy.impact,
    })) || [];

    //Determine content type based on exchangeType from request
    const contentType = exchangeType === 'Third Party App' ? 'thirdPartyApp' :
                        exchangeType === 'DEX' ? 'dex' : 'cex';

    const exchangeData = {
      _type: contentType,
      name: exchangeName,
      slug: slug ? { _type: 'slug', current: slug } : { _type: 'slug', current: exchangeName.toLowerCase().replace(/\s+/g, '-') },
      description: analysis.quickSummary || '',
      overallRating: analysis.overallRating,
      riskScore: analysis.riskScore,
      quickSummary: analysis.quickSummary,
      termsUrl: termsUrl || undefined,
      founded: founded || undefined,
      jurisdiction: jurisdiction || undefined,
      policies,
      keyTakeaways: analysis.keyTakeaways || [],
      featured: true,
      displayOrder: 999,
    };

    let result;

    if (exchangeId) {
      // Update existing exchange
      result = await writeClient
        .patch(exchangeId)
        .set({
          overallRating: exchangeData.overallRating,
          riskScore: exchangeData.riskScore,
          quickSummary: exchangeData.quickSummary,
          policies: exchangeData.policies,
          keyTakeaways: exchangeData.keyTakeaways,
          termsUrl: exchangeData.termsUrl,
          founded: exchangeData.founded,
          jurisdiction: exchangeData.jurisdiction,
        })
        .commit();
    } else {
      // Create new exchange
      result = await writeClient.create(exchangeData);
    }

    return NextResponse.json({
      success: true,
      exchangeId: result._id,
      message: exchangeId ? 'Exchange updated successfully' : 'Exchange created successfully',
    });
  } catch (error: unknown) {
    console.error('Save to Sanity error:', error);
    return NextResponse.json(
      { error: 'Failed to save to Sanity', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
