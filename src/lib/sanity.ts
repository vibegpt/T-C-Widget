import { createClient } from 'next-sanity'

export const client = createClient({
  projectId: 'c15x4s4x',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false, // Set to true for production
})
