import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'hero',
  title: 'Hero Section',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      type: 'text',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'buttons',
      title: 'CTA Buttons',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'text',
              title: 'Button Text',
              type: 'string',
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: 'link',
              title: 'Button Link',
              type: 'string',
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: 'style',
              title: 'Button Style',
              type: 'string',
              options: {
                list: [
                  { title: 'Primary (Filled)', value: 'primary' },
                  { title: 'Secondary (Outline)', value: 'secondary' },
                ],
              },
              initialValue: 'primary',
            },
          ],
          preview: {
            select: {
              title: 'text',
              subtitle: 'link',
            },
          },
        },
      ],
      validation: (Rule) => Rule.max(3).warning('Maximum 3 buttons recommended'),
    }),
    defineField({
      name: 'active',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
    }),
  ],
})
