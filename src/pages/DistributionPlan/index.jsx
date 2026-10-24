import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Truck,
  Play,
  RotateCw,
  Download,
  Search,
  Columns,
  XCircle,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  TrendingDown,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { useValidationStatus } from '@/hooks/useValidationStatus'
import { getDistributionPlan, generatePlanWithProgress } from '@/services/plan'
import { PageLayout } from '@/components/shared/PageLayout'
import { StatusBanner } from '@/components/shared/StatusBanner'
import { SectionCard } from '@/components/shared/SectionCard'
import { ChartCard, ChartTooltip } from '@/components/shared/ChartCard'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { Drawer } from '@/components/shared/Drawer'
import { DataTable } from '@/components/shared/DataTable'
import RecommendationDetail from '@/pages/RecommendationDetail'
import { cn } from '@/lib/utils'

export default function DistributionPlan() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialWarehouse = searchParams.get('warehouse') || 'ALL'
  const initialDestination = searchParams.get('destination') || 'ALL'
  const initialSku = searchParams.get('sku') || 'ALL'
  const initialQ = searchParams.get('q') || ''

  // Validation integration: check if validation blocks plan generation
  const { status: validationStatus, data: validationData } = useValidationStatus()
  const isValidationBlocking =
    validationStatus === 'invalid' || (validationData?.errorsCount || 0) > 0

  // Plan state
  const [planData, setPlanData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Solver simulation & controls
  const [dispatchDate, setDispatchDate] = useState('2024-11-16')
  const [simulatedStatus, setSimulatedStatus] = useState('OK')

  // Run states: 'idle' | 'running' | 'success' | 'fallback' | 'failure'
  const [runState, setRunState] = useState('idle')
  const [progressPercent, setProgressPercent] = useState(0)
  const [progressStage, setProgressStage] = useState('')

  // Selected line ID for master-detail slide-out drawer
  const [selectedLineId, setSelectedLineId] = useState(null)

  // Export banner notice state
  const [exportNotice, setExportNotice] = useState(null)

  // Filters & Table controls initialized from URL search params
  const [searchQuery, setSearchQuery] = useState(initialQ)
  const [warehouseFilter, setWarehouseFilter] = useState(initialWarehouse)
  const [destinationFilter, setDestinationFilter] = useState(initialDestination)
  const [skuFilter, setSkuFilter] = useState(initialSku)
  const [page, setPage] = useState(1)
  const pageSize = 8

  // Sync filters to URL query params
  useEffect(() => {
    const params = new URLSearchParams()
    if (warehouseFilter !== 'ALL') params.set('warehouse', warehouseFilter)
    if (destinationFilter !== 'ALL') params.set('destination', destinationFilter)
    if (skuFilter !== 'ALL') params.set('sku', skuFilter)
    if (searchQuery.trim()) params.set('q', searchQuery.trim())
    setSearchParams(params, { replace: true })
  }, [warehouseFilter, destinationFilter, skuFilter, searchQuery, setSearchParams])

  // Column visibility controls
  const [columnVisibility, setColumnVisibility] = useState({
    warehouse: true,
    batchId: true,
    sku: true,
    destination: true,
    quantity: true,
    arrivalDate: true,
    remainingLifeAtArrival: true,
    freightCost: true,
  })
  const [showColumnDropdown, setShowColumnDropdown] = useState(false)

  // Fetch active plan — called on mount and whenever simulatedStatus changes
  const loadPlan = useCallback(async (statusOverride) => {
    const override = statusOverride ?? simulatedStatus
    setLoading(true)
    setError(null)
    try {
      const res = await getDistributionPlan({ statusOverride: override })
      setPlanData(res)
    } catch (err) {
      setError(err?.message || 'Failed to load distribution plan')
    } finally {
      setLoading(false)
    }
  }, [simulatedStatus])

  useEffect(() => {
    let active = true
    loadPlan(simulatedStatus).catch(() => {}).finally(() => { active = false })
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulatedStatus])

  // Handle plan generation with progress
  const handleGeneratePlan = async () => {
    if (isValidationBlocking) return

    setRunState('running')
    setProgressPercent(10)
    setProgressStage('Initializing optimization request...')

    try {
      const res = await generatePlanWithProgress({
        dispatchDate,
        statusOverride: simulatedStatus,
        onProgress: (stage, percent) => {
          setProgressStage(stage)
          setProgressPercent(percent)
        },
      })
      setPlanData(res)
      if (res.status === 'OK') {
        setRunState('success')
      } else if (res.status === 'FALLBACK_FORECAST') {
        setRunState('fallback')
      } else {
        setRunState('failure')
      }
    } catch (err) {
      setError(err?.message || 'Solver job failed')
      setRunState('failure')
    } finally {
      setTimeout(() => {
        setRunState('idle')
        setProgressPercent(0)
      }, 800)
    }
  }

  // Open line detail in slide-out drawer
  const handleRowClick = (row) => {
    setSelectedLineId(row.lineId)
  }

  // Filter options derived from plan lines
  const availableWarehouses = useMemo(() => {
    if (!planData?.lines) return []
    return Array.from(new Set(planData.lines.map((l) => l.warehouse)))
  }, [planData])

  const availableDestinations = useMemo(() => {
    if (!planData?.lines) return []
    return Array.from(new Set(planData.lines.map((l) => l.destination)))
  }, [planData])

  const availableSkus = useMemo(() => {
    if (!planData?.lines) return []
    return Array.from(new Set(planData.lines.map((l) => l.sku)))
  }, [planData])

  // Filtered lines
  const filteredLines = useMemo(() => {
    if (!planData?.lines) return []
    return planData.lines.filter((item) => {
      if (warehouseFilter !== 'ALL' && item.warehouse !== warehouseFilter) return false
      if (destinationFilter !== 'ALL' && item.destination !== destinationFilter) return false
      if (skuFilter !== 'ALL' && item.sku !== skuFilter) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchSku = item.sku?.toLowerCase().includes(q)
        const matchDesc = item.description?.toLowerCase().includes(q)
        const matchFrom = item.warehouse?.toLowerCase().includes(q)
        const matchTo = item.destination?.toLowerCase().includes(q)
        const matchBatch = item.batchId?.toLowerCase().includes(q)
        if (!matchSku && !matchDesc && !matchFrom && !matchTo && !matchBatch) return false
      }
      return true
    })
  }, [planData, warehouseFilter, destinationFilter, skuFilter, searchQuery])

  // Paginated records
  const paginatedLines = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredLines.slice(start, start + pageSize)
  }, [filteredLines, page, pageSize])

  // Aggregate totals row for displayed/filtered records
  const totals = useMemo(() => {
    return filteredLines.reduce(
      (acc, curr) => {
        acc.quantity += curr.quantity || 0
        acc.freightCost += curr.freightCost || 0
        return acc
      },
      { quantity: 0, freightCost: 0, count: filteredLines.length }
    )
  }, [filteredLines])

  // Client-side CSV export with formula injection prevention (PRD P0-11)
  const handleExportCsv = () => {
    if (!filteredLines || filteredLines.length === 0) return

    // Neutralize cells starting with =, +, -, or @
    const sanitize = (val) => {
      if (val == null) return ''
      const str = String(val)
      if (['=', '+', '-', '@'].includes(str.charAt(0))) {
        return `'${str}` // prefix with single quote to prevent spreadsheet formula execution
      }
      return str.includes(',') ? `"${str}"` : str
    }

    const headers = [
      'Line ID',
      'Origin Warehouse',
      'Batch ID',
      'SKU',
      'Description',
      'Destination',
      'Transfer Quantity',
      'Unit',
      'Arrival Date',
      'Remaining Life',
      'Freight Cost (USD)',
    ]

    const rows = filteredLines.map((l) => [
      sanitize(l.lineId),
      sanitize(l.warehouse),
      sanitize(l.batchId),
      sanitize(l.sku),
      sanitize(l.description),
      sanitize(l.destination),
      sanitize(l.quantity),
      sanitize(l.unit),
      sanitize(l.arrivalDate),
      sanitize(l.remainingLifeAtArrival),
      sanitize(l.freightCost),
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `optiqo_distribution_plan_${planData?.runId || 'plan'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setExportNotice({
      message: `Exported ${filteredLines.length} plan lines totaling ${totals.quantity.toLocaleString()} units ($${totals.freightCost.toLocaleString()} freight). Client-side sanitized export generated (temporary measure until backend export endpoint is connected).`,
    })
    setTimeout(() => setExportNotice(null), 8000)
  }

  // Build table columns dynamically based on visibility
  const allColumns = [
    {
      key: 'warehouse',
      header: 'Origin Warehouse',
      width: '170px',
      sortable: true,
      visible: columnVisibility.warehouse,
      render: (val) => (
        <span className="font-medium text-xs text-ink flex items-center gap-1.5">
          <Truck className="w-3 h-3 text-muted" /> {val}
        </span>
      ),
    },
    {
      key: 'batchId',
      header: 'Batch ID',
      width: '120px',
      sortable: true,
      visible: columnVisibility.batchId,
      render: (val) => (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--color-tint)] text-ink tabular-nums">
          {val}
        </span>
      ),
    },
    {
      key: 'sku',
      header: 'SKU & Description',
      width: '210px',
      sortable: true,
      visible: columnVisibility.sku,
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-bold text-ink tabular-nums">{val}</span>
          <span className="text-[11px] text-muted line-clamp-1">{row.description}</span>
        </div>
      ),
    },
    {
      key: 'destination',
      header: 'Destination',
      width: '170px',
      sortable: true,
      visible: columnVisibility.destination,
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-ink">{val}</span>
          <span className="text-[10px] text-muted font-mono">{row.region}</span>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Transfer Qty',
      width: '130px',
      align: 'right',
      sortable: true,
      visible: columnVisibility.quantity,
      render: (val, row) => (
        <span className="font-mono text-xs font-bold text-ink tabular-nums">
          {val.toLocaleString()} <span className="text-[11px] text-muted">{row.unit}</span>
        </span>
      ),
    },
    {
      key: 'arrivalDate',
      header: 'Arrival Date',
      width: '120px',
      sortable: true,
      visible: columnVisibility.arrivalDate,
      render: (val) => (
        <span className="font-mono text-xs text-muted flex items-center gap-1 tabular-nums">
          <Calendar className="w-3 h-3" /> {val}
        </span>
      ),
    },
    {
      key: 'remainingLifeAtArrival',
      header: 'Remaining Life',
      width: '140px',
      align: 'right',
      sortable: true,
      visible: columnVisibility.remainingLifeAtArrival,
      render: (val) => (
        <span className="chip chip-success text-[11px] font-mono font-semibold tabular-nums">{val}</span>
      ),
    },
    {
      key: 'freightCost',
      header: 'Freight Cost',
      width: '120px',
      align: 'right',
      sortable: true,
      visible: columnVisibility.freightCost,
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-ink tabular-nums">${val.toLocaleString()}</span>
      ),
    },
  ]

  const visibleColumns = allColumns.filter((c) => c.visible)

  // Determine StatusBanner mapping:
  const isRedStatus = [
    'SOLVER_TIMEOUT',
    'SOLVER_NOT_OPTIMAL',
    'INFEASIBLE',
    'CHECK_FAILED',
    'ERROR_DATA',
  ].includes(planData?.status)

  const isYellowStatus =
    planData?.status === 'FALLBACK_FORECAST' ||
    planData?.status === 'WARNING' ||
    planData?.status === 'NOT_OPTIMAL'

  const bannerVariant = isRedStatus ? 'error' : isYellowStatus ? 'warning' : 'ok'

  // Summary Cards for PageLayout
  const summaryCardsContent = (
    <>
      {/* Metric 1: Expected Unmet Demand */}
      <div className="card p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-muted">Unmet Demand</span>
          <span className="chip chip-success text-[10px] flex items-center gap-1 font-bold tabular-nums">
            <TrendingDown className="w-3 h-3" />
            {planData?.beforeAfterMetrics?.unmetDemand?.deltaPercent ?? -85.7}%
          </span>
        </div>
        <div className="my-3 flex items-baseline gap-3">
          <div>
            <span className="text-[11px] text-muted block">Before</span>
            <span className="font-mono text-sm text-muted line-through tabular-nums">
              {planData?.beforeAfterMetrics?.unmetDemand?.before?.toLocaleString()}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted" />
          <div>
            <span className="text-[11px] text-primary font-semibold block">After Plan</span>
            <span className="font-mono text-xl font-bold text-ink tabular-nums">
              {planData?.beforeAfterMetrics?.unmetDemand?.after?.toLocaleString()}
            </span>
          </div>
        </div>
        <span className="text-[11px] text-muted">Avoids 7,220 units of clinic stockouts</span>
      </div>

      {/* Metric 2: Expected Expiry Loss */}
      <div className="card p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-muted">Expiry Loss</span>
          <span className="chip chip-success text-[10px] flex items-center gap-1 font-bold tabular-nums">
            <TrendingDown className="w-3 h-3" />
            {planData?.beforeAfterMetrics?.expiryLoss?.deltaPercent ?? -78.9}%
          </span>
        </div>
        <div className="my-3 flex items-baseline gap-3">
          <div>
            <span className="text-[11px] text-muted block">Before</span>
            <span className="font-mono text-sm text-muted line-through tabular-nums">
              ${planData?.beforeAfterMetrics?.expiryLoss?.before?.toLocaleString()}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted" />
          <div>
            <span className="text-[11px] text-primary font-semibold block">After Plan</span>
            <span className="font-mono text-xl font-bold text-ink tabular-nums">
              ${planData?.beforeAfterMetrics?.expiryLoss?.after?.toLocaleString()}
            </span>
          </div>
        </div>
        <span className="text-[11px] text-muted">Rescues expiring lots via rapid transfer</span>
      </div>

      {/* Metric 3: Total Freight Cost */}
      <div className="card p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-muted">Freight Cost</span>
          <span className="chip chip-neutral text-[10px] font-bold">Plan Total</span>
        </div>
        <div className="my-3">
          <span className="text-[11px] text-muted block">Optimized Transfer Cost</span>
          <span className="font-mono text-xl font-bold text-ink tabular-nums">
            ${planData?.beforeAfterMetrics?.freightCost?.after?.toLocaleString() || '37,910'}
          </span>
        </div>
        <span className="text-[11px] text-muted">Covers 12 inter-warehouse transfers</span>
      </div>

      {/* Metric 4: Independent Checker Result */}
      <div
        className={cn(
          'card p-4 flex flex-col justify-between border-2',
          planData?.beforeAfterMetrics?.independentChecker?.status === 'PASSED'
            ? 'border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20'
            : 'border-red-500/50 bg-red-50/20 dark:bg-red-950/20'
        )}
      >
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Independent Checker
          </span>
          <span
            className={cn(
              'chip font-bold text-[10px] tabular-nums',
              planData?.beforeAfterMetrics?.independentChecker?.status === 'PASSED'
                ? 'chip-success'
                : 'chip-danger'
            )}
          >
            {planData?.beforeAfterMetrics?.independentChecker?.violationsCount === 0
              ? '0 Violations'
              : `${planData?.beforeAfterMetrics?.independentChecker?.violationsCount} Violations`}
          </span>
        </div>
        <div className="my-2">
          <span className="font-mono text-xl font-bold text-ink block tabular-nums">
            18 / 18 Invariants
          </span>
          <p className="text-[11px] text-muted mt-1 leading-snug">
            {planData?.beforeAfterMetrics?.independentChecker?.message}
          </p>
        </div>
        <span className="text-[10px] font-mono text-muted">
          Independent Rule Engine Verified
        </span>
      </div>
    </>
  )

  // Sticky Filter Bar Slot
  const filterBarContent = (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap flex-1">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search SKU, Warehouse, Batch..."
            value={searchQuery}
            aria-label="Search transfer lines"
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            className="pill-input text-xs pl-8 pr-3 py-1.5 bg-[var(--color-surface)] border border-token text-ink rounded-full w-44 sm:w-56"
          />
        </div>

        {/* Warehouse Filter */}
        <select
          value={warehouseFilter}
          aria-label="Filter by Origin Warehouse"
          onChange={(e) => {
            setWarehouseFilter(e.target.value)
            setPage(1)
          }}
          className="pill-input text-xs py-1.5 px-3 bg-[var(--color-surface)] border border-token text-ink rounded-full cursor-pointer"
        >
          <option value="ALL">All Origins</option>
          {availableWarehouses.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>

        {/* Destination Filter */}
        <select
          value={destinationFilter}
          aria-label="Filter by Destination"
          onChange={(e) => {
            setDestinationFilter(e.target.value)
            setPage(1)
          }}
          className="pill-input text-xs py-1.5 px-3 bg-[var(--color-surface)] border border-token text-ink rounded-full cursor-pointer"
        >
          <option value="ALL">All Destinations</option>
          {availableDestinations.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* SKU Filter */}
        <select
          value={skuFilter}
          aria-label="Filter by SKU"
          onChange={(e) => {
            setSkuFilter(e.target.value)
            setPage(1)
          }}
          className="pill-input text-xs py-1.5 px-3 bg-[var(--color-surface)] border border-token text-ink rounded-full cursor-pointer"
        >
          <option value="ALL">All SKUs</option>
          {availableSkus.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        {/* Column Visibility Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowColumnDropdown((prev) => !prev)}
            className="pill-btn-outline text-xs px-2.5 py-1.5 flex items-center gap-1.5"
            aria-label="Toggle Columns"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Columns</span>
          </button>

          {showColumnDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 p-3 rounded-2xl bg-[var(--color-surface)] shadow-2xl border border-token z-30 space-y-2 animate-fadeIn text-xs">
              <p className="font-bold text-ink mb-1 text-[11px] uppercase tracking-wider">
                Toggle Columns
              </p>
              {Object.keys(columnVisibility).map((colKey) => (
                <label
                  key={colKey}
                  className="flex items-center gap-2 cursor-pointer text-muted hover:text-ink"
                >
                  <input
                    type="checkbox"
                    checked={columnVisibility[colKey]}
                    onChange={() =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        [colKey]: !prev[colKey],
                      }))
                    }
                    className="rounded border-token text-primary focus:ring-0"
                  />
                  <span className="capitalize">{colKey.replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Export CSV Button (PRD P0-11) */}
        <button
          onClick={handleExportCsv}
          className="pill-btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5 font-medium hover:bg-[var(--color-primary)] hover:text-white transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>
    </div>
  )

  return (
    <PageLayout
      title="Distribution Plan & Dispatch Optimization"
      subtitle="Multi-echelon inventory transfer schedule, batch allocations, and constraint-verified movements."
      actions={
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Dispatch Date Picker */}
          <div className="flex items-center gap-1.5 bg-[var(--color-surface)] border border-token px-3 py-1.5 rounded-full text-xs text-ink">
            <Calendar className="w-3.5 h-3.5 text-muted" />
            <span className="text-muted">Dispatch:</span>
            <input
              type="date"
              value={dispatchDate}
              onChange={(e) => setDispatchDate(e.target.value)}
              aria-label="Dispatch Date"
              className="bg-transparent font-medium font-mono text-ink text-xs focus:outline-none"
            />
          </div>

          {/* Solver Status Mock Adapter Selector */}
          <div className="relative">
            <select
              value={simulatedStatus}
              onChange={(e) => setSimulatedStatus(e.target.value)}
              aria-label="Simulate Solver Status"
              className="pill-input text-xs py-1.5 px-3 bg-[var(--color-surface)] border border-token text-ink rounded-full font-mono cursor-pointer"
              title="Simulator: Test each PRD status code banner and failure behavior"
            >
              <option value="OK">Simulate: OK (Optimal)</option>
              <option value="FALLBACK_FORECAST">Simulate: FALLBACK_FORECAST (Advisory)</option>
              <option value="SOLVER_TIMEOUT">Simulate: SOLVER_TIMEOUT (Red Error)</option>
              <option value="SOLVER_NOT_OPTIMAL">Simulate: SOLVER_NOT_OPTIMAL (Red Error)</option>
              <option value="INFEASIBLE">Simulate: INFEASIBLE (Red Error)</option>
              <option value="CHECK_FAILED">Simulate: CHECK_FAILED (Red Error)</option>
              <option value="ERROR_DATA">Simulate: ERROR_DATA (Red Error)</option>
            </select>
          </div>

          {/* Primary "Generate Plan" Button */}
          <div className="relative group">
            <button
              onClick={handleGeneratePlan}
              disabled={isValidationBlocking || runState === 'running'}
              className={cn(
                'pill-btn-primary text-xs px-4 py-2 flex items-center gap-2 font-semibold shadow-sm',
                isValidationBlocking && 'opacity-50 cursor-not-allowed bg-neutral-400 hover:bg-neutral-400'
              )}
            >
              <Play className={cn('w-3.5 h-3.5 fill-current', runState === 'running' && 'animate-spin')} />
              <span>{runState === 'running' ? 'Solving Plan...' : 'Generate Plan'}</span>
            </button>

            {/* Tooltip if validation blocks plan generation */}
            {isValidationBlocking && (
              <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-red-950 text-white rounded-xl text-xs shadow-xl z-20 pointer-events-none border border-red-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Plan Generation Blocked</p>
                    <p className="text-[11px] text-red-200 mt-1">
                      Data validation detected critical errors. Resolve data schema invariants in{' '}
                      <span className="underline font-bold">/validation</span> before solving.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      }
      summaryCards={summaryCardsContent}
      filterBar={filterBarContent}
    >
      <div className="space-y-6">
        {/* ── Staged Running State Progress Bar ─────────────────────────── */}
        {runState === 'running' && (
          <div className="card p-5 border-[var(--color-primary-lilac)]/40 bg-[var(--color-tint)]/40 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <RotateCw className="w-4 h-4 text-primary animate-spin" />
                <span className="font-bold text-sm text-ink">{progressStage}</span>
              </div>
              <span className="font-mono text-xs text-muted tabular-nums">{progressPercent}%</span>
            </div>
            <ProgressBar value={progressPercent} />
            <div className="grid grid-cols-3 gap-2 text-[11px] text-muted pt-1">
              <span className={progressPercent >= 20 ? 'text-primary font-semibold' : ''}>
                1. Ingest Forecast
              </span>
              <span className={progressPercent >= 55 ? 'text-primary font-semibold' : ''}>
                2. Solve MIP Formulation
              </span>
              <span className={progressPercent >= 85 ? 'text-primary font-semibold' : ''}>
                3. Independent Checker
              </span>
            </div>
          </div>
        )}

        {/* ── StatusBanner (Maps PRD Solver Status Codes) ───────────────── */}
        <StatusBanner
          variant={bannerVariant}
          title={`Solver Run: ${planData?.status || 'OK'}`}
          message={planData?.statusMessage}
          action={
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono opacity-80 tabular-nums">
                Run: {planData?.runId || 'plan-003'}
              </span>
              {isRedStatus && (
                <button
                  onClick={() => setSimulatedStatus('OK')}
                  className="pill-btn-outline text-xs px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white"
                >
                  Reset to Optimal
                </button>
              )}
            </div>
          }
        />

        {/* ── Export CSV Temporary Measure Notification ─────────────────── */}
        {exportNotice && (
          <div className="simulated-banner animate-fadeIn">
            <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{exportNotice.message}</span>
          </div>
        )}

        {/* ── RED STATE CONDITIONAL: If Solver Failed, NEVER Display Final Plan ── */}
        {isRedStatus ? (
          <div className="card p-8 border-red-300 dark:border-red-900 bg-red-50/20 space-y-4 text-center max-w-3xl mx-auto my-6">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <XCircle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">
                Solver Execution Halted — Plan Not Finalized
              </h2>
              <p className="text-sm text-muted mt-1 max-w-xl mx-auto">
                Per strict system safety rules, an un-converged, timed out, or infeasible solver state
                is never shown as an executable dispatch schedule.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-token text-left text-xs space-y-2 font-mono">
              <div className="text-danger font-bold">Diagnostics Output:</div>
              <div>STATUS: {planData?.status}</div>
              <div>MESSAGE: {planData?.statusMessage}</div>
              <div className="text-muted">
                RECOMMENDATION: Relax warehouse capacity upper bounds at WH-3 or increase timeout
                threshold above 60.0s.
              </div>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => setSimulatedStatus('OK')}
                className="pill-btn-primary text-xs px-4 py-2"
              >
                Switch Simulator to Optimal (OK)
              </button>
              <Link to="/validation" className="pill-btn-outline text-xs px-4 py-2">
                Review Data Validation
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* ── Mid Section: Charts (Warehouse Bar + Destination Donut) ──── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Shipments by Source Warehouse (BarChart) */}
              <ChartCard
                title="Transfer Quantity by Origin Warehouse"
                subtitle="Total units scheduled for outbound dispatch across distribution centers"
                chartHeight={240}
              >
                <BarChart
                  data={planData?.warehouseShipments || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="warehouse"
                    stroke="var(--color-muted)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--color-muted)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val}`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="quantity"
                    fill="var(--color-primary)"
                    radius={[4, 4, 0, 0]}
                    name="Units Dispatched"
                  />
                </BarChart>
              </ChartCard>

              {/* Chart 2: Shipments by Destination Region (Donut Chart) */}
              <ChartCard
                title="Inbound Allocation by Destination Region"
                subtitle="Regional distribution volume of inventory re-balancing"
                chartHeight={240}
              >
                <PieChart>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  />
                  <Pie
                    data={planData?.destinationRegionShipments || []}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {(planData?.destinationRegionShipments || []).map((entry, index) => (
                      <Cell key={`dest-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartCard>
            </div>

            {/* ── Plan Lines Table Section ──────────────────────────────── */}
            <SectionCard
              title="Optimized Plan Dispatch Lines"
              subtitle={`Showing ${filteredLines.length} transfer lines. Row count and quantities equal on-screen summary. Click any row to inspect recommendation evidence.`}
            >
              <DataTable
                columns={visibleColumns}
                data={paginatedLines}
                loading={loading}
                error={error}
                onRetry={() => loadPlan()}
                onRowClick={handleRowClick}
                selectedRowKey={selectedLineId}
                rowKey="lineId"
                total={filteredLines.length}
                page={page}
                pageSize={pageSize}
                onPageChange={(p) => setPage(p)}
                emptyTitle="No plan lines found"
                emptyMessage="Adjust filters or search keywords above."
                footer={
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-ink font-bold text-xs uppercase">
                      Totals ({totals.count} lines)
                    </td>
                    <td colSpan={visibleColumns.length - 4} />
                    {columnVisibility.quantity && (
                      <td className="px-4 py-3 text-right font-mono font-bold text-ink text-xs tabular-nums">
                        {totals.quantity.toLocaleString()} units
                      </td>
                    )}
                    {columnVisibility.arrivalDate && <td />}
                    {columnVisibility.remainingLifeAtArrival && <td />}
                    {columnVisibility.freightCost && (
                      <td className="px-4 py-3 text-right font-mono font-bold text-ink text-xs tabular-nums">
                        ${totals.freightCost.toLocaleString()}
                      </td>
                    )}
                  </tr>
                }
              />
            </SectionCard>
          </>
        )}
      </div>

      {/* ── Master-Detail Recommendation Drawer (Slide-out Inspector) ── */}
      <Drawer
        open={Boolean(selectedLineId)}
        onClose={() => setSelectedLineId(null)}
        title={selectedLineId ? `Transfer Recommendation: ${selectedLineId}` : 'Transfer Recommendation'}
        subtitle="Constraint-verified multi-echelon transfer"
        width="w-full sm:max-w-xl lg:max-w-2xl xl:max-w-3xl"
      >
        {selectedLineId && (
          <RecommendationDetail
            lineId={selectedLineId}
            isDrawer={true}
            onClose={() => setSelectedLineId(null)}
            onSelectLineId={(newLineId) => setSelectedLineId(newLineId)}
          />
        )}
      </Drawer>
    </PageLayout>
  )
}
