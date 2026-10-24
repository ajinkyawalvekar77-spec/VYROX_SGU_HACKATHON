/**
 * Overview service
 * Routes to mock or real API based on VITE_USE_MOCKS.
 */
import { get } from './apiClient'
import * as mock from '../mocks/overview.mock'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

/**
 * Fetch overview summary data.
 * @param {{ runId?: string }} [params]
 * @returns {Promise<any>}
 */
export async function getOverview(params = {}) {
  if (USE_MOCKS) return mock.getOverview(params)
  return get('/overview', { query: params })
}

/**
 * Fetch demand forecast series for chart.
 * @param {{ sku?: string }} [params]
 * @returns {Promise<any>}
 */
export async function getDemandForecast(params = {}) {
  if (USE_MOCKS) return mock.getDemandForecast(params)
  return get('/overview/demand-forecast', { query: params })
}

export const SKU_OPTIONS = mock.SKU_OPTIONS
