/**
 * Runs service
 * Routes to mock or real API based on VITE_USE_MOCKS.
 */
import { get } from './apiClient'
import * as mock from '../mocks/runs.mock'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

/**
 * Fetch list of solver runs (for Run Details & Export page).
 * @param {{ page?: number, pageSize?: number, status?: string }} params
 * @returns {Promise<{ items: SolverRun[], total: number }>}
 */
export async function getRuns(params = {}) {
  if (USE_MOCKS) return mock.getRuns(params)
  return get('/runs', { query: params })
}

/**
 * Fetch a single run by ID.
 * @param {{ runId: string }} params
 * @returns {Promise<SolverRun>}
 */
export async function getRun(params) {
  if (USE_MOCKS) return mock.getRun(params)
  return get(`/runs/${params.runId}`)
}

/**
 * Export run artefacts (returns a download URL or blob metadata).
 * @param {{ runId: string, format?: 'csv'|'xlsx' }} params
 * @returns {Promise<{ downloadUrl: string }>}
 */
export async function exportRun(params) {
  if (USE_MOCKS) return mock.exportRun(params)
  return get(`/runs/${params.runId}/export`, { query: { format: params.format ?? 'csv' } })
}
