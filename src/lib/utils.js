import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind class strings safely, resolving conflicts.
 * @param  {...any} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number with a fixed number of decimal places,
 * returning the integer and decimal parts separately so we can
 * style the decimal portion as muted.
 * @param {number} value
 * @param {number} [decimals=2]
 * @returns {{ integer: string, decimal: string }}
 */
export function splitNumber(value, decimals = 2) {
  if (value == null || isNaN(value)) return { integer: '—', decimal: '' }
  const fixed = Number(value).toFixed(decimals)
  const [integer, decimal] = fixed.split('.')
  return {
    integer: Number(integer).toLocaleString(),
    decimal: decimal ? `.${decimal}` : '',
  }
}

/**
 * Format a percentage delta for StatCard chips.
 * @param {number} delta   e.g. 12.1  (positive = good)
 * @returns {string}       "+12.1%" or "−2.4%"
 */
export function formatDelta(delta) {
  if (delta == null || isNaN(delta)) return '—'
  const prefix = delta >= 0 ? '+' : '−'
  return `${prefix}${Math.abs(delta).toFixed(1)}%`
}

/**
 * Truncate a string to maxLen characters, appending "…" if truncated.
 */
export function truncate(str, maxLen = 40) {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

/**
 * Return Tailwind-compatible chart colours from the CSS-var palette.
 * Use these in Recharts fill/stroke props.
 */
export const CHART_COLORS = {
  violet: '#7B68F5',
  lilac:  '#B5AAF9',
  dark:   '#3B3A45',
  grey1:  '#8C8A96',
  grey2:  '#C9C7D1',
  success: '#1E9E57',
  warning: '#B7791F',
  danger: '#E04848',
}

/**
 * PRD P0-11: Spreadsheet Formula Injection Neutralizer
 * Prevents execution of malicious formulas in Excel / Google Sheets
 * by prepending a single quote (') to cells starting with =, +, -, or @.
 * @param {any} val
 * @returns {string}
 */
export function sanitizeCsvCell(val) {
  if (val == null) return ''
  const str = String(val)
  if (['=', '+', '-', '@'].includes(str.charAt(0))) {
    return `'${str}`
  }
  return str.includes(',') ? `"${str}"` : str
}

/**
 * PRD Solver Status Codes and Finality State Machine
 */
export const RED_STATUSES = [
  'SOLVER_TIMEOUT',
  'SOLVER_NOT_OPTIMAL',
  'INFEASIBLE',
  'CHECK_FAILED',
  'ERROR_DATA',
]

export const YELLOW_STATUSES = ['FALLBACK_FORECAST', 'NOT_OPTIMAL', 'WARNING']

/**
 * Evaluate solver plan status and determine banner variant and finality.
 * @param {string} status
 * @returns {{ isFinal: boolean, bannerVariant: 'ok'|'warning'|'error', displayPlanAsFinal: boolean, showDiagnosticHalt: boolean }}
 */
export function evaluatePlanFinality(status) {
  if (RED_STATUSES.includes(status)) {
    return {
      isFinal: false,
      bannerVariant: 'error',
      displayPlanAsFinal: false,
      showDiagnosticHalt: true,
    }
  }

  if (YELLOW_STATUSES.includes(status)) {
    return {
      isFinal: true,
      bannerVariant: 'warning',
      displayPlanAsFinal: true,
      showDiagnosticHalt: false,
    }
  }

  return {
    isFinal: true,
    bannerVariant: 'ok',
    displayPlanAsFinal: true,
    showDiagnosticHalt: false,
  }
}

/**
 * Sleep for ms milliseconds (useful in mock resolvers).
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

