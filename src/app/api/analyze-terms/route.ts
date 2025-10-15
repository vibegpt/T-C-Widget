import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Sanitize API key by removing problematic Unicode characters
const sanitizedApiKey = process.env.OPENAI_API_KEY?.replace(/[\u2028\u2029]/g, '').trim();

const openai = new OpenAI({
  apiKey: sanitizedApiKey,
});

export async function POST(request: NextRequest) {
  try {
    const { text, exchangeName, exchangeType } = await request.json();

    if (!text || !exchangeName) {
      return NextResponse.json(
        { error: 'Missing required fields: text and exchangeName' },
        { status: 400 }
      );
    }

    // Sanitize text by removing problematic Unicode characters
    const sanitizedText = text
      .replace(/[\u2028\u2029]/g, '\n')
      .replace(/[^\x00-\x7F\u0080-\uFFFF]/g, '');

    // Helper to sanitize all prompts
    const sanitizePrompt = (str: string) => str.replace(/[\u2028\u2029]/g, '\n');

    const systemPrompt = sanitizePrompt('You are a legal analyst specializing in cryptocurrency exchange terms and conditions. Analyze the provided terms and conditions and extract key policies that affect users. Categorize each policy as: "good" (user-friendly, protective of users), "bad" (risky, favors exchange over users), "common" (standard industry practice). Rate the impact as: "critical" (can lose all funds), "high" (significant restrictions), "medium" (notable limitations), "low" (minor inconvenience). Provide a concise summary and detailed analysis for each policy.');

    const userPrompt = sanitizePrompt(`Analyze these Terms & Conditions for ${exchangeName} (${exchangeType || 'CEX'}):

${sanitizedText}

Please provide:
1. Overall rating (good/mixed/risky)
2. Risk score (0-10, where 10 is highest risk)
3. Quick summary (2-3 sentences in plain English)
4. 5-10 key policies with:
   - Section (account/trading/dispute/liability/fees/privacy/other)
   - Title (short, descriptive)
   - Category (good/bad/common)
   - Summary (1-2 sentences, plain English)
   - Impact level (critical/high/medium/low)
   - Detailed explanation with relevant quotes from T&C
5. 3-5 key takeaways (plain English, actionable)

AUTO-CATEGORIZE policies into sections:
- account: Account management, freezing, suspension, KYC, verification
- trading: Trading rules, liquidation, margin, withdrawals, deposits
- dispute: Arbitration, complaints, class actions, legal recourse
- liability: Insurance, loss protection, custody, liability limits
- fees: Trading fees, withdrawal fees, hidden costs
- privacy: Data sharing, tracking, security, surveillance
- other: Anything else

Format as JSON with this structure:
{
  "overallRating": "good|mixed|risky",
  "riskScore": 0-10,
  "quickSummary": "string",
  "policies": [
    {
      "section": "account|trading|dispute|liability|fees|privacy|other",
      "title": "string",
      "category": "good|bad|common",
      "summary": "string",
      "impact": "critical|high|medium|low",
      "details": "string with quotes from T&C"
    }
  ],
  "keyTakeaways": ["string"]
}`);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');

    return NextResponse.json({
      success: true,
      analysis,
      usage: completion.usage,
    });
  } catch (error: unknown) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze terms', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
