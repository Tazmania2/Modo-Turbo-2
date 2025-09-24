import { describe, it, expect, vi } from 'vitest'
import { formatNumber, formatPercentage, cn, truncateText, debounce, throttle } from '../utils'

describe('Utils', () => {
  describe('formatNumber', () => {
    it('should format numbers with locale formatting', () => {
      const result = formatNumber(1000)
      expect(typeof result).toBe('string')
      expect(result).toMatch(/1[.,]000/) // Allow for different locale separators
      
      const result2 = formatNumber(1234567)
      expect(typeof result2).toBe('string')
      expect(result2.length).toBeGreaterThan(6) // Should have separators
    })
  })

  describe('formatPercentage', () => {
    it('should format percentages correctly', () => {
      expect(formatPercentage(50.5)).toBe('50.5%')
      expect(formatPercentage(25)).toBe('25.0%')
      expect(formatPercentage(50.5, 0)).toBe('51%') // With rounding
    })
  })

  describe('truncateText', () => {
    it('should truncate text correctly', () => {
      expect(truncateText('Hello World', 5)).toBe('Hello...')
      expect(truncateText('Hi', 10)).toBe('Hi')
    })
  })

  describe('cn', () => {
    it('should merge class names correctly', () => {
      const result = cn('class1', 'class2')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
      
      const result2 = cn('class1', undefined, 'class2')
      expect(result2).toContain('class1')
      expect(result2).toContain('class2')
    })
  })

  describe('debounce', () => {
    it('should debounce function calls', () => {
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 100)
      
      debouncedFn()
      debouncedFn()
      debouncedFn()
      
      expect(mockFn).not.toHaveBeenCalled()
    })
  })

  describe('throttle', () => {
    it('should throttle function calls', () => {
      const mockFn = vi.fn()
      const throttledFn = throttle(mockFn, 100)
      
      throttledFn()
      throttledFn()
      throttledFn()
      
      expect(mockFn).toHaveBeenCalledTimes(1)
    })
  })
})