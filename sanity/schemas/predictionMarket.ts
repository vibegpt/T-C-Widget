import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'predictionMarket',
  title: 'Prediction Markets',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Platform Name',
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
      title: 'Platform Logo/Image',
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
      name: 'founded',
      title: 'Founded Year',
      type: 'string',
      placeholder: '2020',
    }),
    defineField({
      name: 'jurisdiction',
      title: 'Primary Jurisdiction',
      type: 'string',
      placeholder: 'Panama',
    }),
    defineField({
      name: 'tradingVolume',
      title: 'Trading Volume',
      type: 'string',
      placeholder: '$500M+',
      description: 'Approximate trading volume',
    }),
    defineField({
      name: 'users',
      title: 'Number of Users',
      type: 'string',
      placeholder: '100K+',
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
      description: 'Show this platform on the main Prediction Markets page',
      initialValue: true,
    }),
    defineField({
      name: 'overallRating',
      title: 'Overall Rating',
      type: 'string',
      options: {
        list: [
          { title: '🟢 Fair Terms', value: 'good' },
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
      subtitle: 'jurisdiction',
      media: 'image',
    },
  },
})
