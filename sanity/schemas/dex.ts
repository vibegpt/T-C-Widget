import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'dex',
  title: 'Decentralized Exchanges (DEX)',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'DEX Name',
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
      name: 'blockchain',
      title: 'Blockchain',
      type: 'string',
      placeholder: 'Ethereum, Multi-chain, etc.',
    }),
    defineField({
      name: 'tvl',
      title: 'Total Value Locked (TVL)',
      type: 'string',
      placeholder: '$4B+',
      description: 'Approximate TVL amount',
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
      description: 'Show this DEX on the main DEX page',
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'blockchain',
      media: 'image',
    },
  },
})
