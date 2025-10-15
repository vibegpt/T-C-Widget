import { describe, it, expect } from 'vitest'
import { parseTerms } from '@/components/LegalEasySummary'

describe('parseTerms', () => {
  it('should parse basic terms text', () => {
    const termsText = `
      Zora Terms of Service
      Last updated July 29, 2025
      
      You must be at least 18 years of age.
      Disputes go to binding individual arbitration through JAMS.
      Class actions are waived.
      You can opt out within 30 days by mail.
      Maximum liability is $100.
      Transactions are final and gas fees are non-refundable.
      Zora does not have custody of your wallet or keys.
      These terms are governed by the laws of Delaware.
    `

    const result = parseTerms(termsText)

    expect(result.parsed.product).toBe('Zora')
    expect(result.parsed.updatedAt).toBe('2025-07-28')
    expect(result.parsed.jurisdiction).toEqual(['Delaware'])
    expect(result.parsed.sections).toHaveLength(6) // eligibility, wallet, risks, disputes, liability, governing_law
  })

  it('should detect risk flags correctly', () => {
    const termsText = `
      Disputes resolved by binding individual arbitration with JAMS.
      You may opt out within 30 days by mail.
      Maximum aggregate liability is $100.
      Transactions are final and irreversible.
      Platform do not have custody of your wallet or keys.
    `

    const result = parseTerms(termsText)

    expect(result.risks.arbitration).toBe(true)
    expect(result.risks.optOutDays).toBe(30)
    expect(result.risks.liabilityCap).toBe(100)
    expect(result.risks.irreversibleTxs).toBe(true)
    expect(result.risks.walletSelfCustody).toBe(true)
  })

  it('should parse Zora network specifics', () => {
    const termsText = `
      This is an OP Stack rollup.
      Sequencer operated by ConduitXYZ, Inc.
      Withdrawals subject to a seven-day dispute period.
    `

    const result = parseTerms(termsText)

    const zoraSection = result.parsed.sections.find(s => s.key === 'zora_network')
    expect(zoraSection).toBeDefined()
    expect(zoraSection?.facts?.stack).toBe('OP Stack')
    expect(zoraSection?.facts?.sequencerOperator).toBe('ConduitXYZ, Inc.')
    expect(zoraSection?.facts?.disputePeriodDays).toBe(7)
  })

  it('should handle product hint option', () => {
    const termsText = `
      Last updated: January 1, 2024
      You must be at least 18 years of age.
    `

    const result = parseTerms(termsText, { productHint: 'MyApp' })

    expect(result.parsed.product).toBe('MyApp')
  })

  it('should detect California Civil Code §1542', () => {
    const termsText = `
      California Civil Code §1542 waiver is noted.
    `

    const result = parseTerms(termsText)

    const californiaSection = result.parsed.sections.find(s => s.key === 'california_notice')
    expect(californiaSection).toBeDefined()
    expect(californiaSection?.facts?.ccp1542Waiver).toBe(true)
  })

  it('should parse age requirements', () => {
    const termsText = `
      You must be at least 21 years of age to use this service.
    `

    const result = parseTerms(termsText)

    const eligibilitySection = result.parsed.sections.find(s => s.key === 'eligibility')
    expect(eligibilitySection).toBeDefined()
    expect(eligibilitySection?.facts?.ageMin).toBe(21)
    expect(eligibilitySection?.bullets?.[0]).toContain('21')
  })

  it('should handle empty or minimal text', () => {
    const result = parseTerms('')

    expect(result.parsed.product).toBeUndefined()
    expect(result.parsed.updatedAt).toBeUndefined()
    expect(result.parsed.jurisdiction).toBeUndefined()
    expect(result.parsed.sections).toHaveLength(0)
  })

  it('should extract DMCA information', () => {
    const termsText = `
      DMCA notices should be sent to dmca@example.com.
      Our DMCA address is 110 Green Street, San Francisco, CA 94111.
    `

    const result = parseTerms(termsText)

    const dmcaSection = result.parsed.sections.find(s => s.key === 'dmca')
    expect(dmcaSection).toBeDefined()
    expect(dmcaSection?.facts?.dmcaEmail).toBe('dmca@example.com.')
    expect(dmcaSection?.facts?.dmcaAddress).toContain('110 Green Street')
  })

  it('should detect termination at will', () => {
    const termsText = `
      We may suspend or terminate your account at our sole discretion at any time.
    `

    const result = parseTerms(termsText)

    const terminationSection = result.parsed.sections.find(s => s.key === 'termination')
    expect(terminationSection).toBeDefined()
    expect(result.risks.terminationAtWill).toBe(true)
  })

  it('should detect modifications without notice', () => {
    const termsText = `
      We can revise these terms effective immediately without prior notice.
    `

    const result = parseTerms(termsText)

    const modificationsSection = result.parsed.sections.find(s => s.key === 'modifications')
    expect(modificationsSection).toBeDefined()
    expect(modificationsSection?.facts?.termsChangeEffectiveImmediately).toBe(true)
  })
})
