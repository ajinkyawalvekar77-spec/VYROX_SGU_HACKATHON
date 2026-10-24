/**
 * Validation service
 * Routes to mock or real API based on VITE_USE_MOCKS.
 */
import { get, post } from './apiClient'
import * as mock from '../mocks/validation.mock'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

/**
 * Fetch the latest data-validation report.
 * @returns {Promise<ValidationReport>}
 */
export async function getValidationReport() {
  if (USE_MOCKS) return mock.getValidationReport()
  return get('/validation/report')
}

/**
 * Trigger a new validation run.
 * @param {object} params
 * @returns {Promise<{ runId: string }>}
 */
export async function triggerValidation(params = {}) {
  if (USE_MOCKS) return mock.triggerValidation(params)
  return post('/validation/run', { body: params })
}

/**
 * Fetch validation history.
 * @param {{ page?: number, pageSize?: number }} params
 * @returns {Promise<{ items: ValidationReport[], total: number }>}
 */
export async function getValidationHistory(params = {}) {
  if (USE_MOCKS) return mock.getValidationHistory(params)
  return get('/validation/history', { query: params })
}
