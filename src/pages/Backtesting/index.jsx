import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Play,

  RotateCw,
  Calendar,
  FileCode,
  Info,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { getBacktestSummary, runBacktestWithProgress } from '@/services/backtest'
import { SectionCard } from '@/components/shared/SectionCard'
import { ChartCard, ChartTooltip } from '@/components/shared/ChartCard'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { PillTabs } from '@/components/shared/PillTabs'
import { PageLayout } from '@/components/shared/PageLayout'
import { Skeleton } from '@/components/shared/Skeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { cn, CHART_COLORS } from '@/lib/utils'

export default function Backtesting() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialWindow = searchParams.get('window') || '52w'
  const initialSeed = searchParams.get('seed') ? Number(searchParams.get('seed')) : 42
  const initialScenario = searchParams.get('scenario') || 'standard_optimal'

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Evaluation controls initialized from search params
  const [windowSelection, setWindowSelection] = useState(initialWindow)
  const [seedValue, setSeedValue] = useState(initialSeed)
  const [selectedScenario, setSelectedScenario] = useState(initialScenario)

  // Sync to URL search params
  useEffect(() => {
    const params = new URLSearchParams()
    if (windowSelection !== '52w') params.set('window', windowSelection)
    if (seedValue !== 42) params.set('seed', String(seedValue))
    if (selectedScenario !== 'standard_optimal') params.set('scenario', selectedScenario)
    setSearchParams(params, { replace: true })
  }, [windowSelection, seedValue, selectedScenario, setSearchParams])

  // Run states: 'idle' | 'running' | 'done' | 'failed'
  const [runState, setRunState] = useState('idle')
  const [progressPercent, setProgressPercent] = useState(0)
  const [progressStage, setProgressStage] = useState('')

  // Daily Chart Tab Selection
  const [chartTab, setChartTab] = useState('unmet') // 'unmet' | 'expiry' | 'freight'

  const loadSummary = useCallback(async (scenario = selectedScenario) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getBacktestSummary({ scenario })
      setData(res)
    } catch (err) {
      setError(err?.message || 'Failed to load backtest evaluation')
    } finally {
      setLoading(false)
    }
  }, [selectedScenario])

  useEffect(() => {
    loadSummary(selectedScenario)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScenario])



  // Run backtest with progress orchestration
  const handleRunBacktest = async () => {
    setRunState('running')
    setProgressPercent(15)
    setProgressStage('Initializing rolling simulation engine...')

    try {
      const res = await runBacktestWithProgress({
        window: windowSelection,
        seed: Number(seedValue),
        scenario: selectedScenario,
        onProgress: (stage, percent) => {
          setProgressStage(stage)
          setProgressPercent(percent)
        },
      })
      setData(res)
      setRunState('done')
    } catch (err) {
      setError(err?.message || 'Backtesting execution failed')
      setRunState('failed')
    } finally {
      setTimeout(() => {
        setRunState('idle')
        setProgressPercent(0)
      }, 700)
    }
  }

  // Daily chart tab definitions
  const chartTabs = [
    { value: 'unmet', label: 'Unmet Demand (units)' },
    { value: 'expiry', label: 'Expiry Wastage (USD)' },
    { value: 'freight', label: 'Freight Cost (USD)' },
  ]

  const sectionNavLinks = (
    <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs">
      <a
        href="#kpis"
        className="px-3 py-1 rounded-full border border-token/80 bg-surface text-muted hover:text-primary hover:border-primary transition-colors whitespace-nowrap"
      >
        K1–K8 Evaluation
      </a>
      <a
        href="#decomposition"
        className="px-3 py-1 rounded-full border border-token/80 bg-surface text-muted hover:text-primary hover:border-primary transition-colors whitespace-nowrap"
      >
        Gain Decomposition
      </a>
      <a
        href="#daily-trajectory"
        className="px-3 py-1 rounded-full border border-token/80 bg-surface text-muted hover:text-primary hover:border-primary transition-colors whitespace-nowrap"
      >
        Daily Trajectories
      </a>
      <a
        href="#audit-report"
        className="px-3 py-1 rounded-full border border-token/80 bg-surface text-muted hover:text-primary hover:border-primary transition-colors whitespace-nowrap"
      >
        Audit Manifest
      </a>
    </div>
  )

  const backtestControls = (
    <div className="flex items-center flex-wrap gap-2.5">
      {/* Evaluation Window Selector */}
      <div className="flex items-center gap-1.5 bg-surface border border-token px-3 py-1.5 rounded-full text-xs text-ink">
        <Calendar className="w-3.5 h-3.5 text-muted" />
        <select
          value={windowSelection}
          onChange={(e) => setWindowSelection(e.target.value)}
          className="bg-transparent font-medium text-ink text-xs focus:outline-none cursor-pointer"
          aria-label="Evaluation Window"
        >
          <option value="52w">52 Weeks (FY2024)</option>
          <option value="26w">26 Weeks (H2 Outlook)</option>
          <option value="12w">12 Weeks (Rolling Q4)</option>
        </select>
      </div>

      {/* Random Seed Number Input */}
      <div className="flex items-center gap-1.5 bg-surface border border-token px-3 py-1.5 rounded-full text-xs text-ink">
        <span className="text-muted font-mono">Seed:</span>
        <input
          type="number"
          value={seedValue}
          onChange={(e) => setSeedValue(e.target.value)}
          className="w-12 bg-transparent font-mono font-bold text-ink text-xs focus:outline-none tabular-nums"
          aria-label="Random Seed"
        />
      </div>

      {/* Benchmark Scenario Toggle Adapter */}
      <div className="relative">
        <select
          value={selectedScenario}
          onChange={(e) => setSelectedScenario(e.target.value)}
          aria-label="Benchmark Scenario"
          className="pill-input text-xs py-1.5 px-3 bg-surface border border-token text-ink rounded-full font-mono cursor-pointer"
          title="Test scenario adapter: includes stress parity case to prove honest reporting when baseline wins"
        >
          <option value="standard_optimal">Scenario: Standard Benchmark (Optiqo Optimal)</option>
          <option value="stress_parity">Scenario: Stress Test Parity (Optiqo High Freight / Baseline Wins)</option>
        </select>
      </div>

      {/* Primary "Run Backtest" Button */}
      <button
        onClick={handleRunBacktest}
        disabled={runState === 'running'}
        className="pill-btn-primary text-xs px-4 py-2 flex items-center gap-2 font-semibold shadow-sm"
      >
        <Play className={cn('w-3.5 h-3.5 fill-current', runState === 'running' && 'animate-spin')} />
        <span>{runState === 'running' ? 'Running Backtest...' : 'Run Backtest'}</span>
      </button>
    </div>
  )

  return (
    <PageLayout
      actions={backtestControls}
      sectionNav={sectionNavLinks}
    >

      {/* ── Staged Running State Progress Bar ─────────────────────────── */}
      {runState === 'running' && (
        <div className="card p-5 border-[var(--color-primary-lilac)]/40 bg-[var(--color-tint)]/40 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <RotateCw className="w-4 h-4 text-primary animate-spin" />
              <span className="font-bold text-sm text-ink">{progressStage}</span>
            </div>
            <span className="font-mono text-xs text-muted">{progressPercent}%</span>
          </div>
          <ProgressBar value={progressPercent} />
          <div className="grid grid-cols-4 gap-2 text-[10px] text-muted pt-1">
            <span className={progressPercent >= 25 ? 'text-primary font-semibold' : ''}>
              1. Static Baseline (B1)
            </span>
            <span className={progressPercent >= 55 ? 'text-primary font-semibold' : ''}>
              2. Reactive Policy (B2)
            </span>
            <span className={progressPercent >= 80 ? 'text-primary font-semibold' : ''}>
              3. Optiqo MIP Solve
            </span>
            <span className={progressPercent >= 100 ? 'text-primary font-semibold' : ''}>
              4. KPI Difference
            </span>
          </div>
        </div>
      )}

      {/* ── Honest Reporting Scenario Notice (PRD Requirement) ──────── */}
      {selectedScenario === 'stress_parity' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-ink space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-400">
            <Info className="w-4 h-4" />
            <span>Stress Test Scenario Active: Proving Honest Reporting</span>
          </div>
          <p className="text-muted leading-relaxed">
            In this evaluated scenario, extreme fuel surcharges and expedited emergency flights cause Optiqo's freight cost to exceed Baseline 2 (+15.5%). Notice that the table below neutrally displays <span className="font-mono text-red-600 font-bold">+15.5% Difference</span> and marks <span className="font-mono font-bold text-red-600">NOT MET</span> without claiming false improvements.
          </p>
        </div>
      )}

      {error && !data ? (
        <ErrorState
          title="Failed to Load Backtest Evaluation"
          message={error}
          onRetry={() => loadSummary()}
        />
      ) : loading && !data ? (
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-3xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-72 rounded-3xl" />
            <Skeleton className="h-72 lg:col-span-2 rounded-3xl" />
          </div>
        </div>
      ) : (
        <>
          {/* ── PRD K1–K8 Policy Comparison Table ────────────────────────── */}
          <div id="kpis">
            <SectionCard
              title="KPI Policy Evaluation Comparison (PRD K1–K8)"
              subtitle="Side-by-side performance of Static Heuristic (B1), Reactive Min-Max (B2), and Optiqo multi-echelon optimization."
            >
              <div className="overflow-x-auto rounded-2xl border border-token">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="table-header-pill">
                      <th className="px-4 py-2.5 text-left font-bold">Metric (PRD)</th>
                      <th className="px-4 py-2.5 text-left font-bold">Threshold Target</th>
                      <th className="px-4 py-2.5 text-right font-bold">B1 (Static)</th>
                      <th className="px-4 py-2.5 text-right font-bold">B2 (Reactive)</th>
                      {/* Highlighted Optiqo Column */}
                      <th className="px-4 py-2.5 text-right font-bold bg-[var(--color-primary)] text-white">
                        Optiqo
                      </th>
                      <th className="px-4 py-2.5 text-right font-bold">Difference vs B2 (Abs)</th>
                      <th className="px-4 py-2.5 text-right font-bold">Difference vs B2 (%)</th>
                      <th className="px-4 py-2.5 text-center font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.kpis || []).map((kpi, idx) => (
                      <tr
                        key={kpi.id}
                        className={cn(
                          'border-t border-token hover:bg-[var(--color-tint)] transition-colors',
                          idx % 2 === 1 && 'bg-[var(--color-surface)]'
                        )}
                      >
                        {/* KPI Name */}
                        <td className="px-4 py-2.5 font-medium text-xs text-ink">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-muted">{kpi.id}</span>
                            <span>{kpi.name}</span>
                          </div>
                        </td>

                        {/* Threshold */}
                        <td className="px-4 py-2.5 font-mono text-xs text-muted tabular-nums">
                          {kpi.threshold}
                        </td>

                        {/* B1 Value */}
                        <td className="px-4 py-2.5 font-mono text-xs text-right text-muted tabular-nums">
                          {kpi.unit === 'USD' ? `$${kpi.b1.toLocaleString()}` : `${kpi.b1.toLocaleString()} ${kpi.unit}`}
                        </td>

                        {/* B2 Value */}
                        <td className="px-4 py-2.5 font-mono text-xs text-right text-ink font-semibold tabular-nums">
                          {kpi.unit === 'USD' ? `$${kpi.b2.toLocaleString()}` : `${kpi.b2.toLocaleString()} ${kpi.unit}`}
                        </td>

                        {/* Highlighted Optiqo Value */}
                        <td className="px-4 py-2.5 font-mono text-xs text-right font-bold text-primary bg-[var(--color-tint)]/60 tabular-nums">
                          {kpi.unit === 'USD' ? `$${kpi.optiqo.toLocaleString()}` : `${kpi.optiqo.toLocaleString()} ${kpi.unit}`}
                        </td>

                        {/* Difference vs B2 (Absolute) — Neutral wording */}
                        <td className="px-4 py-2.5 font-mono text-xs text-right text-ink tabular-nums">
                          {kpi.diffVsB2Abs > 0 ? `+${kpi.diffVsB2Abs.toLocaleString()}` : kpi.diffVsB2Abs.toLocaleString()}
                        </td>

                        {/* Difference vs B2 (Relative %) — Neutral wording */}
                        <td className="px-4 py-2.5 font-mono text-xs text-right tabular-nums">
                          <span
                            className={cn(
                              'chip text-[11px] font-bold font-mono',
                              kpi.b2BeatStatus === 'MET' ? 'chip-success' : 'chip-danger'
                            )}
                          >
                            {kpi.diffVsB2Rel > 0 ? `+${kpi.diffVsB2Rel}%` : `${kpi.diffVsB2Rel}%`}
                          </span>
                        </td>

                        {/* Met / Not Met Chip (Derived ONLY from API response) */}
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={cn(
                              'chip text-[10px] font-bold',
                              kpi.thresholdStatus === 'MET' ? 'chip-success' : 'chip-danger'
                            )}
                          >
                            {kpi.thresholdStatus === 'MET' ? 'Met' : 'Not Met'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          {/* ── Mid Section: Gain Decomposition & Daily Metrics Charts ───── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 1 Col: Gain Decomposition Card (Waterfall / Stacked Style) */}
            <div id="decomposition" className="lg:col-span-1">
              <ChartCard
                title="Gain Decomposition Analysis"
                subtitle="Separating Forecast Effect (B1→B2) and Allocation Effect (B2→Optiqo)"
                chartHeight={270}
              >
                <BarChart
                  data={data?.gainDecomposition || []}
                  margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="name"
                    stroke="var(--color-muted)"
                    fontSize={9}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--color-muted)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v / 1000}k`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" fill={CHART_COLORS.violet} radius={[4, 4, 0, 0]} name="Evaluated Net Benefit ($)" />
                </BarChart>
              </ChartCard>
            </div>

            {/* Right 2 Cols: Daily Evaluation Charts (PillTabs for Metric) */}
            <div id="daily-trajectory" className="lg:col-span-2">
              <ChartCard
                title="Daily Simulated Trajectory by Policy"
                subtitle="30-day chronological rolling performance comparing B1, B2, and Optiqo"
                chartHeight={270}
                controls={
                  <PillTabs
                    tabs={chartTabs}
                    value={chartTab}
                    onChange={(val) => setChartTab(val)}
                  />
                }
              >
                <LineChart
                  data={data?.dailyMetrics || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="day" stroke="var(--color-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 10, paddingBottom: 8 }} />
                  {chartTab === 'unmet' && (
                    <>
                      <Line type="monotone" dataKey="b1_unmet" stroke={CHART_COLORS.grey1} strokeDasharray="3 3" dot={false} name="B1 (Static)" />
                      <Line type="monotone" dataKey="b2_unmet" stroke={CHART_COLORS.lilac} dot={false} name="B2 (Reactive)" />
                      <Line type="monotone" dataKey="optiqo_unmet" stroke={CHART_COLORS.violet} strokeWidth={2.5} dot={false} name="Optiqo" />
                    </>
                  )}
                  {chartTab === 'expiry' && (
                    <>
                      <Line type="monotone" dataKey="b1_expiry" stroke={CHART_COLORS.grey1} strokeDasharray="3 3" dot={false} name="B1 (Static)" />
                      <Line type="monotone" dataKey="b2_expiry" stroke={CHART_COLORS.lilac} dot={false} name="B2 (Reactive)" />
                      <Line type="monotone" dataKey="optiqo_expiry" stroke={CHART_COLORS.success} strokeWidth={2.5} dot={false} name="Optiqo" />
                    </>
                  )}
                  {chartTab === 'freight' && (
                    <>
                      <Line type="monotone" dataKey="b1_freight" stroke={CHART_COLORS.grey1} strokeDasharray="3 3" dot={false} name="B1 (Static)" />
                      <Line type="monotone" dataKey="b2_freight" stroke={CHART_COLORS.lilac} dot={false} name="B2 (Reactive)" />
                      <Line type="monotone" dataKey="optiqo_freight" stroke={CHART_COLORS.warning} strokeWidth={2.5} dot={false} name="Optiqo" />
                    </>
                  )}
                </LineChart>
              </ChartCard>
            </div>
          </div>
        </>
      )}

      {/* ── Report Footer (PRD 16.4 Requirement) ──────────────────────── */}
      <div id="audit-report" className="card p-5 border-token bg-[var(--color-tint)]/30 space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-token pb-2">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-primary" />
            <span className="font-bold text-ink uppercase tracking-wider text-[11px]">
              Backtesting Audit Trail & System Parameters (PRD 16.4)
            </span>
          </div>
          <span className="chip chip-warning font-mono font-bold text-[10px]">
            {data?.systemMetadata?.dataset || 'demo-supply-chain-v1 (SIMULATED DATA)'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-muted">
          <div>
            <span className="block text-[10px] uppercase font-bold text-muted">Random Seed</span>
            <span className="font-mono font-bold text-ink tabular-nums">{data?.seed ?? 42}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-muted">Evaluation Window</span>
            <span className="font-mono font-bold text-ink tabular-nums">{data?.evaluationWindow || '52 Weeks'}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-muted">Solver & MIP Engine</span>
            <span className="font-mono text-ink text-[11px] block">{data?.systemMetadata?.solverVersion}</span>
            <span className="font-mono text-[10px] text-muted block">{data?.systemMetadata?.underlyingMip}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-muted">Execution Timestamp</span>
            <span className="font-mono text-ink tabular-nums">{data?.timestamp || '2024-11-15T08:00:00Z'}</span>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
