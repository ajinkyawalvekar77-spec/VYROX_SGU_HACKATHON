# StockWise AI (Optiqo) — Frontend

> **VYROX SGU HACKATHON**  
> StockWise AI is a decision-support system for FMCG supply chains. It targets Supply Chain Managers, Demand Planners, and Warehouse Managers who struggle with uneven stock levels, stockouts, and high transport costs.

This repository branch (`front`) contains the React + Vite frontend for Optiqo / StockWise AI.

---

## 🚀 Quickstart & Setup

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation & Run
```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run unit / integration tests
npm run test

# Build for production
npm run build

# Run linter
npm run lint
```

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env.local` to configure:

```env
# Base URL for the backend REST API
VITE_API_BASE_URL=http://localhost:8000/api/v1

# Enable mock data when backend is not running
VITE_USE_MOCKS=true
```

---

## 🗺️ Key Features & Routes

- **Live Dashboard (`/`)**: Real-time KPI summaries, forecast trends, network risk distribution, and critical alerts.
- **Data Pre-flight Validation (`/validation`)**: Automated checks, input data sanity checks, and issue inspection drawer.
- **Network Risk Analysis (`/risk`)**: Ranked SKU-destination pairs, inventory stockout likelihood, and quantitative risk drivers.
- **Optimal Distribution Plan (`/plan`, `/plan/:lineId`)**: Transfer recommendations, constraint simulation, line detail inspection, and CSV exports.
- **Historical Backtesting (`/backtest`)**: K1–K8 KPI evaluation, gain decomposition, and trajectory stress-testing.
- **Solver Run Inspector (`/runs`)**: Execution logs, run comparisons, and downloadable manifests.

