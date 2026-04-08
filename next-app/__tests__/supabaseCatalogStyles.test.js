import { describe, it, expect } from 'vitest'
import { isValidCssColor, normalizeHex, sanitizeStyles } from '../utils/supabaseCatalogStyles'

describe('supabaseCatalogStyles helpers', () => {
  it('isValidCssColor recognizes hex colors and rgb', () => {
    expect(isValidCssColor('#fff')).toBeTruthy()
    expect(isValidCssColor('#ffffff')).toBeTruthy()
    expect(isValidCssColor('#FFFFFFFF')).toBeTruthy()
    expect(isValidCssColor('rgb(255,0,0)')).toBeTruthy()
    expect(isValidCssColor('rgba(255,0,0,0.5)')).toBeTruthy()
    expect(isValidCssColor('invalid-color')).toBeFalsy()
    expect(isValidCssColor('')).toBeFalsy()
  })

  it('normalizeHex expands short hex and normalizes case', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc')
    expect(normalizeHex('abc')).toBe('#aabbcc')
    expect(normalizeHex('#AABBCC')).toBe('#aabbcc')
    expect(normalizeHex('AABBCC')).toBe('#aabbcc')
    expect(normalizeHex('#12345678')).toBe('#12345678')
    expect(normalizeHex('wrong')).toBe('')
  })

  it('sanitizeStyles normalizes known color keys and strips invalid values', () => {
    const input = {
      headerBg: ' #ABC ',
      buttonBg: 'rgb(10,20,30)',
      badgeBg: 'not-a-color',
      other: 'keep'
    }
    const { cleaned, normalizedKeys } = sanitizeStyles(input)
    expect(cleaned.headerBg).toBe('#aabbcc')
    expect(cleaned.buttonBg).toBe('rgb(10,20,30)')
    expect(cleaned.badgeBg).toBe('')
    expect(normalizedKeys).toEqual(expect.arrayContaining(['headerBg','badgeBg']))
    expect(cleaned.other).toBe('keep')
  })
})
