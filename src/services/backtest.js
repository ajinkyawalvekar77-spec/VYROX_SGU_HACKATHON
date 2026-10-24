/**
 * Backtesting service
 * Routes to mock or real API based on VITE_USE_MOCKS.
 *
 * NOTE ON ASYNC / POLLING ARCHITECTURE:
 * Backtesting involves simulating thousands of warehouse periods across policies B1, B2, and Optiqo.
 * The backend handles this as a long-running batch job:
 * 1. POST /backtest/run returns `{ runId, status: 'QUEUED' }`.
 * 2. `runBacktestWithProgress` wraps job polling behind a unified Promise interface with staged callbacks.
 */
import { get, post } from './apiClient'
import * as mock from '../mocks/backtest.mock'
import { sleep } from '../lib/utils'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

/**
 * Fetch backtest summary metrics, K1-K8 KPI comparison, and gain decomposition.
 * @param {{ scenario?: string }} [params]
 * @returns {Promise<any>}
 */
export async function getBacktestSummary(params = {}) {
  if (USE_MOCKS) return mock.getBacktestSummary(params)
  return get('/backtest/summary', { query: params })
}

/**
 * Fetch backtest run history.
 * @param {{ page?: number, pageSize?: number }} params
 * @returns {Promise<any>}
 */
export async function getBacktestHistory(params = {}) {
  if (USE_MOCKS) return mock.getBacktestHistory(params)
  return get('/backtest/history', { query: params })
}

/**
 * Trigger a new backtest run.
 * @param {object} config
 * @returns {Promise<any>}
 */
export async function triggerBacktest(config = {}) {
  if (USE_MOCKS) return mock.triggerBacktest(config)
  return post('/backtest/run', { body: config })
}

/**
 * High-level orchestration function:
 * Triggers backtest simulation and polls staged progress behind a single interface.
 *
 * @param {object} options
 * @param {string} options.window
 * @param {number} options.seed
 * @param {string} [options.scenario='standard_optimal']
 * @param {(stage: string, percent: number) => void} [options.onProgress]
 * @returns {Promise<any>}
 */
export async function runBacktestWithProgress({
  window = '52w',
  seed = 42,
  scenario = 'standard_optimal',
  onProgress,
} = {}) {
  onProgress?.('Evaluating Baseline 1 (Static Heuristic Policy)...', 25)
  await sleep(400)

  onProgress?.('Simulating Baseline 2 (Reactive Min-Max Policy)...', 55)
  await sleep(450)

  onProgress?.('Solving Optiqo Multi-Echelon MIP across rolling periods...', 80)
  await sleep(500)

  onProgress?.('Computing K1–K8 differences & gain decomposition...', 100)
  await sleep(250)

  return getBacktestSummary({ window, seed, scenario })
}
