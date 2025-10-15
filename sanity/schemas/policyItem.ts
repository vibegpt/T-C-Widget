import { defineType } from 'sanity'

export default defineType({
  name: 'policyItem',
  title: 'Policy Item',
  type: 'object',
  fields: [
    {
      name: 'section',
      title: 'Policy Section',
      type: 'string',
      options: {
        list: [
          { title: 'Account Management', value: 'account' },
          { title: 'Trading & Funds', value: 'trading' },
          { title: 'Dispute Resolution', value: 'dispute' },
          { title: 'Liability & Risk', value: 'liability' },
          { title: 'Fees & Costs', value: 'fees' },
          { title: 'Data & Privacy', value: 'privacy' },
          { title: 'Other', value: 'other' },
        ],
      },
      description: 'Auto-categorized by analyzer',
    },
    {
      name: 'title',
      title: 'Policy Title',
      type: 'string',
      description: 'e.g., "Account Freezing", "Forced Liquidation", "Dispute Resolution"',
    },
    {
      name: 'category',
      title: 'Policy Type',
      type: 'string',
      options: {
        list: [
          { title: '✅ Good (User-Friendly)', value: 'good' },
          { title: '⚠️ Concerning (Risky)', value: 'bad' },
          { title: 'ℹ️ Standard (Common Practice)', value: 'common' },
        ],
      },
    },
    {
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 3,
      description: 'Brief explanation of what this policy means for users',
    },
    {
      name: 'details',
      title: 'Full Details',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Detailed breakdown with quotes from T&Cs',
    },
    {
      name: 'impact',
      title: 'User Impact',
      type: 'string',
      options: {
        list: [
          { title: 'Critical - Can lose all funds', value: 'critical' },
          { title: 'High - Significant restrictions', value: 'high' },
          { title: 'Medium - Notable limitations', value: 'medium' },
          { title: 'Low - Minor inconvenience', value: 'low' },
        ],
      },
    },
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      impact: 'impact',
    },
    prepare({ title, category, impact }) {
      const icons = {
        good: '✅',
        bad: '⚠️',
        common: 'ℹ️',
      }
      return {
        title: `${icons[category as keyof typeof icons] || ''} ${title}`,
        subtitle: impact ? `Impact: ${impact}` : undefined,
      }
    },
  },
})
