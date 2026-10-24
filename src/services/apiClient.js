/**
 * Optiqo API Client
 * -----------------
 * A thin fetch wrapper that:
 *  - reads base URL from VITE_API_BASE_URL
 *  - enforces a configurable timeout (default 30 s)
 *  - normalises all errors into { status, code, message, detail }
 *  - attaches JSON content-type and any auth header you configure
 *
 * Import this module only from src/services/*.js — never from pages.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Race a fetch promise against a timeout.
 * @param {Promise} promise
 * @param {number}  ms
 * @returns {Promise}
 */
function withTimeout(promise, ms) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new ApiError('Request timed out', 408, 'TIMEOUT')), ms)
    ),
  ]).finally(() => clearTimeout(id))
}

/**
 * Structured API error.
 */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status     HTTP status code (or 0 for network errors)
   * @param {string} code       Backend error code (e.g. "SOLVER_TIMEOUT")
   * @param {any}    detail     Raw body for debugging
   */
  constructor(message, status = 0, code = 'UNKNOWN', detail = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.detail = detail
  }
}

/**
 * Core request function.
 *
 * @param {string} path          e.g. "/runs/latest"
 * @param {object} [options]
 * @param {string} [options.method]   default "GET"
 * @param {object} [options.body]     will be JSON-serialised
 * @param {object} [options.query]    object → query-string params
 * @param {number} [options.timeout]  override timeout in ms
 * @param {object} [options.headers]  extra headers
 * @returns {Promise<any>}
 */
export async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    query,
    timeout = DEFAULT_TIMEOUT_MS,
    headers: extraHeaders = {},
  } = options

  // Build URL
  const url = new URL(`${BASE_URL}${path}`)
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v != null) url.searchParams.set(k, String(v))
    })
  }

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extraHeaders,
  }

  // Attach auth if available (swap implementation when auth is added)
  const token = typeof window !== 'undefined' ? localStorage.getItem('optiqo-token') : null
  if (token) headers['Authorization'] = `Bearer ${token}`

  const fetchPromise = fetch(url.toString(), {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })

  let response
  try {
    response = await withTimeout(fetchPromise, timeout)
  } catch (err) {
    if (err instanceof ApiError) throw err
    // Network-level failure
    throw new ApiError(
      err?.message ?? 'Network error',
      0,
      'NETWORK_ERROR',
      err
    )
  }

  // Parse body (always attempt JSON, fall back to text)
  let data
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => null)
  } else {
    data = await response.text().catch(() => null)
  }

  if (!response.ok) {
    const code = (data && data.code) ?? 'HTTP_ERROR'
    const message = (data && (data.message ?? data.detail)) ?? response.statusText
    throw new ApiError(message, response.status, code, data)
  }

  return data
}

// Convenience methods
export const get  = (path, options) => request(path, { ...options, method: 'GET' })
export const post = (path, options) => request(path, { ...options, method: 'POST' })
export const put  = (path, options) => request(path, { ...options, method: 'PUT' })
export const del  = (path, options) => request(path, { ...options, method: 'DELETE' })
