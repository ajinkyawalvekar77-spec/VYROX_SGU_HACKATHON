# Optiqo API Contract — PROPOSED DRAFT
> **Status:** Proposed, pending backend agreement.
> Every field name, shape, and endpoint in this document is marked as proposed and subject to change.
> This draft was derived from the Optiqo PRD section 6.5 and the defined solver status codes.
> No metric values are invented — numeric fields are either left as type descriptions or marked `null (pending)`.

---

## Base URL
```
VITE_API_BASE_URL  (default: http://localhost:8000/api/v1)
```

---

## Solver Status Codes
All endpoints that trigger or describe a solver run MUST return one of the following in the `status` field.

| Code | Meaning |
|------|---------|
| `OK` | Solver found a feasible, optimal plan |
| `SOLVER_TIMEOUT` | Solver ran out of time; may return best-found solution |
| `SOLVER_NOT_OPTIMAL` | Solver terminated with a non-optimal but feasible solution |
| `INFEASIBLE` | No feasible plan exists given current constraints |
| `CHECK_FAILED` | Post-solve validation checks failed |
| `ERROR_DATA` | Input data was invalid or missing |
| `FALLBACK_FORECAST` | A fallback forecast method was substituted for the primary one |

---

## Error Response Shape (all endpoints)
```jsonc
// proposed, pending backend agreement
{
  "status": 400,          // HTTP status — proposed
  "code": "ERROR_DATA",   // one of the solver status codes above — proposed
  "message": "string",    // human-readable — proposed
  "detail": {}            // optional, arbitrary debugging detail — proposed
}
```

---

## 1. Data Validation

### GET /validation/report
Returns the latest validation report.

**Response — proposed, pending backend agreement**
```jsonc
{
  "runId": "string",             // proposed
  "timestamp": "ISO 8601",       // proposed
  "status": "OK | ERROR_DATA",  // proposed
  "checksTotal": 0,              // proposed
  "checksPassed": 0,             // proposed
  "checksFailed": 0,             // proposed
  "checks": [
    {
      "id": "string",            // proposed
      "name": "string",          // proposed
      "status": "PASS | FAIL",   // proposed
      "severity": "critical | high | medium | low | info",  // proposed
      "message": "string"        // proposed
    }
  ]
}
```

### POST /validation/run
**Request body — proposed:** `{}` (parameters TBD with backend)
**Response — proposed:** `{ "runId": "string", "queued": true }`

### GET /validation/history
**Query params (proposed):** `page` (int), `pageSize` (int)

---

## 2. Forecast

### GET /forecast/summary
**Response — proposed, pending backend agreement**
```jsonc
{
  "runId": "string",            // proposed
  "timestamp": "ISO 8601",      // proposed
  "method": "string",           // proposed — e.g. "FALLBACK_FORECAST"
  "horizon": 0,                 // proposed — number of periods
  "granularity": "weekly",      // proposed
  "skuCount": 0,                // proposed
  "warehouseCount": 0           // proposed
}
```

### GET /forecast/series
**Query params (proposed):** `horizon` (int), `granularity` (string)
**Response series item — proposed:** `{ week, actual, forecast, lowerBound, upperBound }`

---

## 3. Risk

### GET /risk/overview
Returns overall risk level, severity summary counts, regional breakdown chart data, ranked SKU-destination pairs, and network-level supply shortages.

**Response — proposed, pending backend agreement**
```jsonc
{
  "runId": "risk-003",
  "timestamp": "ISO 8601 UTC",
  "overallRiskLevel": "low | medium | high",
  "summaryCards": {
    "critical": 3,
    "high": 5,
    "medium": 5,
    "low": 3,
    "totalAlerts": 16,
    "totalSkusAtRisk": 56,
    "networkShortagesCount": 3
  },
  "regionChart": [
    { "region": "North America", "Stockout": 12, "Expiry": 4, "Excess": 6, "total": 22 }
  ],
  "networkShortages": [
    {
      "shortageId": "NET-SHORT-01",
      "sku": "SKU-1042",
      "productName": "Cold-Chain Vaccine Pack",
      "severity": "critical",
      "networkDeficit": 8400,
      "unit": "units",
      "affectedRegions": ["North America", "EMEA"],
      "rootCause": "string",
      "mitigation": "string"
    }
  ],
  "rankedPairs": [
    {
      "rank": 1,
      "pairId": "pair-001",
      "sku": "SKU-1042",
      "productName": "string",
      "destination": "WH-3 (Chicago DC)",
      "region": "North America",
      "daysOfCover": 2.8,
      "expectedUnmetDemand": 1850,
      "expectedExpiryLoss": 0,
      "riskType": "Stockout | Expiry | Excess",
      "severity": "critical | high | medium | low",
      "drivers": {
        "leadTimeDays": 35,
        "projectedStock": 140,
        "safetyStockTarget": 650,
        "dailyDemandRate": 42,
        "expiryWindowDays": 180,
        "capacityUtilization": 94.2
      },
      "rationale": "string"
    }
  ]
}
```

### GET /risk/breakdown
**Query params (proposed):** `category` (string, optional)

### GET /risk/top-alerts
**Query params (proposed):** `limit` (int, default 5)

---

## 4. Distribution Plan

### GET /plan/active
Returns the latest evaluated distribution plan, before/after metrics, independent checker results, warehouse/region aggregates, and plan lines.

**Response — proposed, pending backend agreement**
```jsonc
{
  "runId": "plan-003",
  "timestamp": "ISO 8601 UTC",
  "dispatchDate": "YYYY-MM-DD",
  "status": "OK | FALLBACK_FORECAST | SOLVER_TIMEOUT | SOLVER_NOT_OPTIMAL | INFEASIBLE | CHECK_FAILED | ERROR_DATA",
  "statusMessage": "string",
  "solverDurationMs": 4200,
  "isFinal": true, // false if solver returned a red failure state
  "beforeAfterMetrics": {
    "unmetDemand": { "before": 8420, "after": 1200, "unit": "units", "deltaPercent": -85.7 },
    "expiryLoss": { "before": 86400, "after": 18200, "unit": "USD", "deltaPercent": -78.9 },
    "freightCost": { "before": 0, "after": 37910, "unit": "USD", "deltaPercent": null },
    "independentChecker": {
      "status": "PASSED | FAILED",
      "violationsCount": 0,
      "rulesChecked": 18,
      "message": "string"
    }
  },
  "warehouseShipments": [
    { "warehouse": "WH-1 (Newark)", "shipments": 3, "quantity": 4070 }
  ],
  "destinationRegionShipments": [
    { "name": "North America", "value": 5870, "color": "#7B68F5" }
  ],
  "totalLines": 12,
  "lines": [
    {
      "lineId": "line-001",
      "warehouse": "WH-1 (Newark DC)",
      "batchId": "BAT-9024",
      "sku": "SKU-1042",
      "description": "string",
      "destination": "WH-3 (Chicago DC)",
      "quantity": 1450,
      "unit": "units",
      "arrivalDate": "YYYY-MM-DD",
      "remainingLifeAtArrival": "180 days",
      "freightCost": 3420,
      "region": "North America",
      "status": "OK",
      "priority": "high | medium | low"
    }
  ]
}
```

### GET /plan/lines/:lineId
Returns single transfer line details, driver metrics, evidence payloads, and decision rationale (PRD J4, P0-08).

**Response — proposed, pending backend agreement**
```jsonc
{
  "lineId": "line-001",
  "warehouse": "WH-1 (Newark DC)",
  "batchId": "BAT-9024",
  "sku": "SKU-1042",
  "description": "Cold-Chain Vaccine Pack",
  "destination": "WH-3 (Chicago DC)",
  "quantity": 1450,
  "unit": "units",
  "arrivalDate": "YYYY-MM-DD",
  "remainingLifeAtArrival": "180 days",
  "freightCost": 3420,
  "status": "OK",
  "priority": "high",
  "explanation": "string (one-sentence backend explanation)",
  "explanationVerified": true, // PRD P0-08 explanation verifier check
  "verifierRuleId": "PRD-P0-08-INVARIANT-VERIFIED",
  "forecastEvidence": [
    { "period": "W46 (Arrival)", "low": 1250, "mid": 1450, "high": 1750 }
  ],
  "stockEvidence": {
    "currentOriginStock": 4200,
    "inboundDestination": 140,
    "selectedTransferQty": 1450,
    "projectedDestinationBalance": 1590,
    "unit": "units"
  },
  "shelfLifeEvidence": {
    "remainingAtArrivalDays": 180,
    "skuMinimumDays": 45,
    "ratioPercent": 75,
    "status": "MET"
  },
  "nextBestAlternative": {
    "warehouse": "WH-5 (Dallas DC)",
    "cost": 5240,
    "extraCost": 1820,
    "transitDays": 4,
    "eligible": true,
    "reasonNotChosen": "string"
  },
  "bindingConstraints": [
    "Origin Cold Storage Capacity (92% utilization limit)",
    "Clinical Shelf-Life Threshold (≥ 45 days at destination)",
    "Lead-Time Delivery Feasibility (≤ 72h transit window)"
  ]
}
```

### POST /plan/generate
**Async / Polling Interface Note:**
Assumes job-based asynchronous solver execution:
1. `POST /plan/generate` triggers solver run and returns `{ "runId": "string", "status": "QUEUED" }`.
2. Client polls `GET /runs/:runId` with staged progress (Forecast Ingestion → MIP Solve → Independent Check) until terminal status.
3. Upon completion, client retrieves finalized plan from `GET /plan/active`.

### CSV Export Neutralization (PRD P0-11)
Any cell value starting with `=`, `+`, `-`, or `@` is neutralized by prefixing with `'` to prevent spreadsheet formula injection attacks. Row count and quantities equal on-screen plan.

---

## 5. Backtesting & Policy Evaluation

### GET /backtest/summary
Returns PRD K1–K8 KPI comparison table across Baseline 1 (Static), Baseline 2 (Reactive), and Optiqo, plus gain decomposition and audit metadata (PRD J5, P0-09, 16.4).

**Response — proposed, pending backend agreement**
```jsonc
{
  "scenarioId": "standard_optimal | stress_parity",
  "runId": "bt-003",
  "timestamp": "ISO 8601 UTC",
  "evaluationWindow": "52 Weeks (FY2024)",
  "seed": 42,
  "systemMetadata": {
    "solverVersion": "Optiqo MIP Engine v2.4.1-rc3",
    "underlyingMip": "HiGHS Linear & Integer Optimizer v1.7.0",
    "dataset": "demo-supply-chain-v1 (SIMULATED DATA)"
  },
  "gainDecomposition": [
    { "name": "B1 Baseline", "value": 0, "fill": "#A3A3A3" },
    { "name": "Forecast Effect (B1→B2)", "value": 42500, "fill": "#60A5FA" },
    { "name": "Allocation Effect (B2→Optiqo)", "value": 68400, "fill": "#7B68F5" },
    { "name": "Total Evaluated Net Benefit", "value": 110900, "fill": "#10B981" }
  ],
  "kpis": [
    {
      "id": "K1",
      "name": "OTIF Service Level",
      "unit": "%",
      "threshold": "≥ 98.0%",
      "b1": 91.4,
      "b2": 95.8,
      "optiqo": 98.9,
      "diffVsB2Abs": 3.1,
      "diffVsB2Rel": 3.2,
      "b2BeatStatus": "MET | NOT_MET",
      "thresholdStatus": "MET | NOT_MET"
    }
  ],
  "dailyMetrics": [
    { "day": "Day 1", "b1_unmet": 180, "b2_unmet": 110, "optiqo_unmet": 20 }
  ]
}
```

### POST /backtest/run
**Request body (proposed):** `{ "window": "52w", "seed": 42, "scenario": "string" }`
**Response:** `{ "runId": "string", "queued": true }`

---

## 6. Solver Runs

### GET /runs
**Query params (proposed):** `page`, `pageSize`, `status` (filter)
**Response item — proposed:**
```jsonc
{
  "runId": "string",
  "timestamp": "ISO 8601",
  "status": "OK | SOLVER_TIMEOUT | ...",
  "triggeredBy": "scheduler | user",
  "durationMs": null,
  "exportAvailable": true
}
```

### GET /runs/:runId
Single run — same shape as above.

### GET /runs/:runId/export
**Query params (proposed):** `format` (`csv` | `xlsx`)
**Response:** `{ "downloadUrl": "string" }` — pre-signed URL or redirect.

---

## Notes for Backend Team
1. All field names above are **proposed, pending backend agreement**.
2. Numeric metric values (service levels, fill rates) are intentionally omitted — define and agree before frontend consumes them.
3. The `source: "mock"` field in mock responses is frontend-only and must NOT appear in real API responses.
4. Pagination is 1-indexed (`page=1` = first page).
5. All timestamps should be ISO 8601 UTC strings.
