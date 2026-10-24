/**
 * Forecast service
 * Routes to mock or real API based on VITE_USE_MOCKS.
 */
import { get } from './apiClient'
import * as mock from '../mocks/forecast.mock'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

/**
 * Fetch the current forecast summary.
 * @returns {Promise<ForecastSummary>}
 */
export async function getForecastSummary() {
  if (USE_MOCKS) return mock.getForecastSummary()
  return get('/forecast/summary')
}

/**
 * Fetch forecast series data for charting.
 * @param {{ horizon?: number, granularity?: string }} params
 * @returns {Promise<ForecastSeries>}
 */
export async function getForecastSeries(params = {}) {
  if (USE_MOCKS) return mock.getForecastSeries(params)
  return get('/forecast/series', { query: params })
}
