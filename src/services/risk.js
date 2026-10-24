/**
 * Risk service
 * Routes to mock or real API based on VITE_USE_MOCKS.
 */
import { get } from './apiClient'
import * as mock from '../mocks/risk.mock'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

/**
 * Fetch overall risk overview metrics, ranked SKU-destination pairs,
 * network-level shortages, and regional breakdown.
 * @returns {Promise<any>}
 */
export async function getRiskOverview() {
  if (USE_MOCKS) return mock.getRiskOverview()
  return get('/risk/overview')
}

/**
 * Fetch risk breakdown by category / SKU.
 * @param {{ category?: string }} params
 * @returns {Promise<any>}
 */
export async function getRiskBreakdown(params = {}) {
  if (USE_MOCKS) return mock.getRiskBreakdown(params)
  return get('/risk/breakdown', { query: params })
}

/**
 * Fetch top alerts.
 * @param {{ limit?: number }} params
 * @returns {Promise<any>}
 */
export async function getTopAlerts(params = {}) {
  if (USE_MOCKS) return mock.getTopAlerts(params)
  return get('/risk/top-alerts', { query: params })
}
