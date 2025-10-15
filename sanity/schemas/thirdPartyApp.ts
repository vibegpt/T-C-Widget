import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'thirdPartyApp',
  title: 'Third Party Apps',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'App Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Card Image',
      type: 'image',
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative Text',
        }
      ],
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Wallet', value: 'Wallet' },
          { title: 'Hardware Wallet', value: 'Hardware Wallet' },
          { title: 'Portfolio Tracker', value: 'Portfolio Tracker' },
          { title: 'Analytics', value: 'Analytics' },
          { title: 'Protocol', value: 'Protocol' },
          { title: 'Exchange Aggregator', value: 'Exchange Aggregator' },
          { title: 'Tax Software', value: 'Tax Software' },
          { title: 'Other', value: 'Other' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'users',
      title: 'Number of Users',
      type: 'string',
      placeholder: '30M+',
      description: 'Approximate user count',
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display Order',
      type: 'number',
      description: 'Lower numbers appear first',
      initialValue: 999,
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      description: 'Show this app on the main Third Party Apps page',
      initialValue: true,
    }),
    defineField({
      name: 'overallRating',
      title: 'Overall Rating',
      type: 'string',
      options: {
        list: [
          { title: '🟢 User-Friendly', value: 'good' },
          { title: '🟡 Mixed Policies', value: 'mixed' },
          { title: '🔴 High Risk', value: 'risky' },
        ],
      },
    }),
    defineField({
      name: 'riskScore',
      title: 'Risk Score',
      type: 'number',
      description: 'Overall risk score out of 10 (auto-calculated)',
      validation: (Rule) => Rule.min(0).max(10),
    }),
    defineField({
      name: 'quickSummary',
      title: 'Quick Summary',
      type: 'text',
      rows: 4,
      description: '2-3 sentence overview of their policies',
    }),
    defineField({
      name: 'termsUrl',
      title: 'Terms & Conditions URL',
      type: 'url',
      description: 'Link to their official T&Cs',
    }),
    defineField({
      name: 'policies',
      title: 'Policy Breakdown',
      type: 'array',
      of: [{ type: 'policyItem' }],
      description: 'Add individual policies with good/bad/common categorization',
    }),
    defineField({
      name: 'keyTakeaways',
      title: 'Key Takeaways',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Bullet points summarizing the most important points',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'category',
      media: 'image',
    },
  },
})
