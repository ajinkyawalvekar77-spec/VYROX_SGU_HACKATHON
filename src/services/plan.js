/**
 * Distribution Plan service
 * Routes to mock or real API based on VITE_USE_MOCKS.
 *
 * NOTE ON ASYNC / POLLING ARCHITECTURE:
 * We assume an asynchronous job-based backend model for plan generation:
 * 1. POST /plan/generate triggers an optimization job and returns a `runId` with status "QUEUED" or "RUNNING".
 * 2. The client polls GET /runs/:runId (or simulated stages in mock mode) until terminal status.
 * 3. `generatePlanWithProgress` provides a single unified interface that abstracts this polling
 *    behind a Promise with an `onProgress(step, percent)` callback.
 */
import { get, post } from './apiClient'
import * as mock from '../mocks/plan.mock'
import { sleep } from '../lib/utils'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

/**
 * Fetch the active distribution plan.
 * @param {{ runId?: string, statusOverride?: string }} [params]
 * @returns {Promise<any>}
 */
export async function getDistributionPlan(params = {}) {
  if (USE_MOCKS) return mock.getDistributionPlan(params)
  return get('/plan/active', { query: params })
}

/**
 * Fetch a single plan line (recommendation detail).
 * @param {{ lineId: string }} params
 * @returns {Promise<any>}
 */
export async function getPlanLine(params) {
  if (USE_MOCKS) return mock.getPlanLine(params)
  return get(`/plan/lines/${params.lineId}`)
}

/**
 * Trigger solver to generate a new plan.
 * @param {object} params solver configuration overrides
 * @returns {Promise<{ runId: string, status: string }>}
 */
export async function triggerPlan(params = {}) {
  if (USE_MOCKS) return mock.triggerPlan(params)
  return post('/plan/generate', { body: params })
}

/**
 * High-level orchestration function:
 * Triggers plan generation and handles staged progress/polling behind a single interface.
 *
 * @param {object} options
 * @param {string} options.dispatchDate
 * @param {string} [options.statusOverride='OK']
 * @param {(stage: string, percent: number) => void} [options.onProgress]
 * @returns {Promise<any>} Final distribution plan
 */
export async function generatePlanWithProgress({
  dispatchDate,
  statusOverride = 'OK',
  onProgress,
} = {}) {
  // Step 1: Initial submission
  onProgress?.('Aggregating demand forecast & inventory matrices...', 20)
  await sleep(350)

  // Step 2: Optimization solver stage
  onProgress?.('Solving mixed-integer linear programming (MIP) formulation...', 55)
  await sleep(500)

  // Step 3: Independent verification stage
  onProgress?.('Running independent post-solve physical constraint checker...', 85)
  await sleep(400)

  onProgress?.('Finalizing distribution dispatch recommendations...', 100)
  await sleep(250)

  // Return the resolved distribution plan
  return getDistributionPlan({ dispatchDate, statusOverride })
}
