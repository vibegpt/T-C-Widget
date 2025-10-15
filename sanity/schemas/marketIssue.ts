import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'marketIssue',
  title: 'Market Issue / Common Problem',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Issue Title',
      type: 'string',
      description: 'e.g., "Order Execution Failures During Volatility", "Auto-Deleveraging (ADL)"',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Issue Category',
      type: 'string',
      options: {
        list: [
          { title: 'Liquidity & Order Execution', value: 'liquidity' },
          { title: 'Risk Management & Liquidation', value: 'liquidation' },
          { title: 'Price Oracles & Pegs', value: 'pricing' },
          { title: 'System Failures & Outages', value: 'technical' },
          { title: 'Regulatory & Compliance', value: 'regulatory' },
          { title: 'Security & Hacks', value: 'security' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'severity',
      title: 'Severity',
      type: 'string',
      options: {
        list: [
          { title: '🔴 Critical - Can cause total loss', value: 'critical' },
          { title: '🟠 High - Significant financial impact', value: 'high' },
          { title: '🟡 Medium - Moderate impact', value: 'medium' },
          { title: '🟢 Low - Minor inconvenience', value: 'low' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Short Summary',
      type: 'text',
      rows: 3,
      description: '2-3 sentences explaining what this issue is',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'whatHappens',
      title: 'What Happens to Users',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Detailed explanation of how this issue affects users',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'whyItHappens',
      title: 'Why It Happens',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Technical/market explanation of root causes',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'legalFramework',
      title: 'Legal Framework / How Platforms Cover It',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'What the terms of service say about this issue',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'realWorldExamples',
      title: 'Real-World Examples',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'platform',
              title: 'Platform',
              type: 'string',
              description: 'e.g., "KuCoin", "Hyperliquid", "Binance"',
            },
            {
              name: 'platformType',
              title: 'Platform Type',
              type: 'string',
              options: {
                list: [
                  { title: 'CEX', value: 'cex' },
                  { title: 'DEX', value: 'dex' },
                  { title: 'Prediction Market', value: 'predictionMarket' },
                  { title: 'Third-Party App', value: 'thirdPartyApp' },
                ],
              },
            },
            {
              name: 'platformSlug',
              title: 'Platform Slug',
              type: 'string',
              description: 'For linking to platform detail page (e.g., "kucoin", "hyperliquid")',
            },
            {
              name: 'date',
              title: 'Date',
              type: 'date',
            },
            {
              name: 'description',
              title: 'What Happened',
              type: 'text',
              rows: 3,
            },
            {
              name: 'userImpact',
              title: 'User Impact',
              type: 'string',
              description: 'e.g., "Unable to close positions", "Forced liquidation", "Lost funds"',
            },
            {
              name: 'resolution',
              title: 'Resolution',
              type: 'text',
              rows: 2,
              description: 'How it was resolved (if at all)',
            },
          ],
        },
      ],
    }),
    defineField({
      name: 'protectYourself',
      title: 'How to Protect Yourself',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Actionable advice for users',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'redFlags',
      title: 'Red Flags to Watch For',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Warning signs that this issue might occur',
    }),
    defineField({
      name: 'relatedPlatforms',
      title: 'Platforms with This Issue',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'platformName',
              title: 'Platform Name',
              type: 'string',
            },
            {
              name: 'platformType',
              title: 'Type',
              type: 'string',
              options: {
                list: ['cex', 'dex', 'predictionMarket', 'thirdPartyApp'],
              },
            },
            {
              name: 'platformSlug',
              title: 'Slug',
              type: 'string',
            },
            {
              name: 'hasExplicitTerms',
              title: 'Explicitly Mentioned in Terms?',
              type: 'boolean',
            },
          ],
        },
      ],
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Last Updated',
      type: 'date',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      description: 'Show on main issues page',
      initialValue: true,
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display Order',
      type: 'number',
      description: 'Lower numbers appear first',
      validation: (Rule) => Rule.min(0),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      severity: 'severity',
    },
    prepare(selection) {
      const { title, category, severity } = selection;
      const severityEmoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
      }[severity] || '';
      return {
        title: `${severityEmoji} ${title}`,
        subtitle: category,
      };
    },
  },
});
