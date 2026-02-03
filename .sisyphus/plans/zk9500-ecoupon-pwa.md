# ZK9500 E-Coupon PWA System

## TL;DR

> **Quick Summary**: Build a multi-tenant PWA for employee e-coupon meal management with ZK9500 fingerprint scanner integration. Desktop Electron bridge captures fingerprints → Next.js API validates → Supabase stores data → PWA provides admin/kiosk UI.
>
> **Deliverables**:
> - Next.js PWA (App Router) with next-pwa configuration
> - Supabase database schema with RLS policies
> - Electron desktop bridge app for ZK9500 integration
> - Admin UI: Employee CRUD, meal credit management, OT marking, reporting
> - Kiosk UI: Fingerprint-based meal redemption with validation
> - Reports: Dashboard, Excel/PDF export (daily/weekly/monthly/yearly)
>
> **Estimated Effort**: Large (50-70 hours)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Database setup → Auth/RLS → Desktop Bridge → API integration → Frontend UI

---

## Context

### Original Request
Build a PWA application for managing employee e-coupon credits using ZK9500 fingerprint reader for identification. System includes: Employee CRUD, meal credit management, configurable e-coupon conditions, multi-tenant support (multiple companies), and comprehensive reporting with Excel/PDF export.

### Interview Summary
**Key Discussions**:
- **Architecture**: Desktop Bridge (Electron) + Next.js PWA + Supabase confirmed as optimal solution
- **ZK9500 Integration**: USB scanner requires Electron bridge (browser cannot access USB directly)
- **Multi-Tenant**: Single Supabase database with Row Level Security (RLS) for company isolation
- **OT Detection**: Manual admin marking (not automatic time tracking)
- **Validation**: Warning + Override + Flag workflow for shopkeepers
- **Test Strategy**: Tests after implementation + detailed manual verification procedures

**Research Findings**:
- **ZK9500**: USB optical fingerprint scanner, requires ZKTECO SDK, no network connectivity
- **Next.js PWA**: next-pwa plugin with NetworkFirst strategy for API, CacheFirst for static assets
- **Supabase**: RLS policies for multi-tenant, real-time subscriptions for live updates, Edge Functions for PDF generation
- **Reporting**: Recharts for dashboard, xlsxjs for Excel, PDFKit or jsPDF for PDF exports

### Metis Review
(Self-performed gap analysis due to technical issues)

**Identified Gaps (addressed)**:
- **Gap 1**: ZK9500 SDK availability → Resolved: Assume ZKTECO provides Windows/Linux SDK (download from vendor)
- **Gap 2**: Electron bridge communication protocol → Resolved: WebSocket for real-time fingerprint events, HTTP API for verification
- **Gap 3**: Offline sync strategy → Resolved: IndexedDB for local queue, background sync worker when online
- **Gap 4**: Report export format → Resolved: Excel (.xlsx) via xlsxjs, PDF via jsPDF with landscape orientation

---

## Work Objectives

### Core Objective
Build a production-ready multi-tenant PWA system for managing employee meal credits with ZK9500 fingerprint scanner integration, supporting multiple companies with configurable meal rules and comprehensive reporting.

### Concrete Deliverables
1. **Next.js PWA Frontend** (Admin + Kiosk UI) with offline capabilities
2. **Supabase Database** with complete schema and RLS policies
3. **Electron Desktop Bridge** for ZK9500 USB scanner integration
4. **Next.js API Routes** for fingerprint verification and business logic
5. **Reporting Module**: Dashboard, Excel export, PDF export
6. **Authentication System**: Supabase Auth with role-based access (Admin, Kiosk)

### Definition of Done
- [ ] All PWA features work offline (with queued sync)
- [ ] ZK9500 fingerprint scanning identifies employees correctly
- [ ] Meal redemption enforces time windows and credit availability
- [ ] Admin can manage employees, mark OT, view reports
- [ ] Reports export correctly to Excel and PDF
- [ ] Multi-tenant isolation enforced (RLS policies tested)
- [ ] Manual verification procedures documented and validated

### Must Have
- Employee CRUD (Create, Read, Update, Delete)
- Fingerprint-based meal redemption with ZK9500
- Configurable meal types and time windows (Lunch, OT Meal)
- Daily meal credit reset (not cumulative)
- OT marking workflow for admin
- Warning + Override + Flag validation
- Revenue reports (daily/weekly/monthly/yearly)
- Excel and PDF export
- Multi-tenant company isolation
- Offline PWA capabilities with sync

### Must NOT Have (Guardrails)
- Native mobile apps (iOS/Android)
- Payment processing integration (Stripe, PayPal, etc.)
- Automated time tracking/attendance system (OT is manually marked)
- Employee self-service portal (only admin/kiosk)
- Email/SMS notifications
- Advanced scheduling or shift management
- Direct database connections (must use Supabase client/API)

---

## Verification Strategy (MANDATORY)

> This section is determined during interview based on Test Infrastructure Assessment.
> The choice here affects ALL TODO acceptance criteria.

### Test Decision
- **Infrastructure exists**: NO (greenfield project)
- **User wants tests**: YES - Tests After Implementation
- **Framework**: Jest + React Testing Library (for frontend), Supabase test utilities (mocked)

### Tests After Implementation Workflow

Each feature module includes dedicated test tasks after implementation:

**Task Structure**:
1. **Implementation**: Build the feature according to requirements
2. **Test Tasks** (separate TODOs):
   - Unit tests for business logic
   - Integration tests for API routes
   - Component tests for React UI
3. **Manual Verification**: Detailed procedures for end-to-end validation

**Test Setup Task**:
- [ ] 0. Setup Test Infrastructure
  - Install: `npm install --save-dev @testing-library/react @testing-library/jest-dom jest-environment-jsdom`
  - Config: Create `jest.config.js` and `jest.setup.js`
  - Verify: `npm test -- --listTests` → shows test files
  - Example: Create `__tests__/example.test.tsx`
  - Verify: `npm test` → 1 test passes

### Automated Verification (ALWAYS include, choose by deliverable type)

**For Frontend/UI changes** (using playwright skill):
```
# Agent executes via playwright browser automation:
1. Navigate to: http://localhost:3000/admin/employees
2. Click: button "Add Employee"
3. Fill: input[name="name"] with "Test Employee"
4. Fill: input[name="pin"] with "12345"
5. Click: button "Save"
6. Wait for: selector ".employee-list-item" containing "Test Employee"
7. Assert: Employee appears in list with PIN 12345
8. Screenshot: .sisyphus/evidence/task-create-employee-success.png
```

**For API/Backend changes** (using Bash curl):
```bash
# Agent runs:
curl -s -X POST http://localhost:3000/api/verify-fingerprint \
  -H "Content-Type: application/json" \
  -d '{"fingerprint_template":"base64encoded...","company_id":"uuid..."}' \
  | jq '.employee_id'
# Assert: Returns non-null employee_id or null (not found)
# Assert: HTTP status 200
```

**For Database Schema** (using Bash psql/supabase CLI):
```bash
# Agent runs:
supabase db diff --schema public --file schema-check.sql
# Assert: No unexpected schema changes
supabase db reset
# Assert: Reset completes successfully
```

---

## Execution Strategy

### Parallel Execution Waves

> Maximize throughput by grouping independent tasks into parallel waves.
> Each wave completes before the next begins.

```
Wave 1 (Start Immediately):
├── Task 1: Supabase Project Setup + Database Schema
├── Task 2: Next.js Project Setup + PWA Configuration
└── Task 3: Electron Project Setup

Wave 2 (After Wave 1):
├── Task 4: Supabase Auth + RLS Policies
├── Task 5: Electron Bridge: ZK9500 SDK Integration
└── Task 6: Next.js API Routes: Core Business Logic

Wave 3 (After Wave 2):
├── Task 7: Admin UI: Employee CRUD
├── Task 8: Kiosk UI: Fingerprint Redemption
└── Task 9: Offline PWA Features (IndexedDB + Service Worker)

Wave 4 (After Wave 3):
├── Task 10: Reporting Module + Excel/PDF Export
├── Task 11: Electron + Next.js Integration
└── Task 12: End-to-End Testing + Documentation

Critical Path: Task 1 → Task 4 → Task 5 → Task 11 → Task 12
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 4, 7, 8 | 2, 3 |
| 2 | None | 6, 7, 8, 9 | 1, 3 |
| 3 | None | 5, 11 | 1, 2 |
| 4 | 1 | 6, 7, 8 | 5, 9 |
| 5 | 3 | 11 | 4, 6 |
| 6 | 2, 4 | 7, 8, 11 | 5, 9 |
| 7 | 2, 4, 6 | 10 | 5, 8, 9 |
| 8 | 2, 4, 6 | 10 | 5, 7, 9 |
| 9 | 2 | 7, 8 | 4, 5, 6 |
| 10 | 7, 8 | 12 | 11 |
| 11 | 5, 6 | 12 | 9, 10 |
| 12 | 10, 11 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3 | delegate_task(category="unspecified-low", load_skills=[...], run_in_background=true) for each |
| 2 | 4, 5, 6 | delegate_task(category="unspecified-high", load_skills=[...], run_in_background=true) for each |
| 3 | 7, 8, 9 | delegate_task(category="visual-engineering", load_skills=[...], run_in_background=true) for each |
| 4 | 10, 11, 12 | delegate_task(category="unspecified-high", load_skills=[...], run_in_background=true) for each |

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info.

---

## Wave 1: Infrastructure Setup

### [ ] 1. Supabase Project Setup + Database Schema

**What to do**:
1. Create Supabase project via Supabase CLI or dashboard
2. Create `supabase/schema.sql` with complete database schema
3. Apply schema to local Supabase instance: `supabase db push`
4. Verify all tables created with correct constraints
5. Create seed data for initial company and admin user

**Schema Tables**:
```sql
-- Companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  admin_id UUID REFERENCES auth.users(id),
  lunch_price DECIMAL(10,2) DEFAULT 45.00,
  ot_meal_price DECIMAL(10,2) DEFAULT 60.00,
  lunch_time_start TIME DEFAULT '11:00:00',
  lunch_time_end TIME DEFAULT '14:00:00',
  ot_time_start TIME DEFAULT '18:00:00',
  ot_time_end TIME DEFAULT '22:00:00',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pin TEXT UNIQUE NOT NULL, -- Device user ID
  fingerprint_template TEXT, -- Base64 encoded template from ZK9500
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal Credits (Daily)
CREATE TABLE meal_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  lunch_available BOOLEAN DEFAULT TRUE,
  ot_meal_available BOOLEAN DEFAULT FALSE,
  UNIQUE(employee_id, date)
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  company_id UUID REFERENCES companies(id),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('LUNCH', 'OT_MEAL')),
  amount DECIMAL(10,2) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  is_override BOOLEAN DEFAULT FALSE,
  override_reason TEXT,
  status TEXT DEFAULT 'VALID' CHECK (status IN ('VALID', 'FLAGGED'))
);

-- Daily Reports (Aggregated)
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  date DATE NOT NULL,
  lunch_count INTEGER DEFAULT 0,
  ot_meal_count INTEGER DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  employee_list JSONB DEFAULT '[]',
  UNIQUE(company_id, date)
);

-- Indexes
CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_meal_credits_employee ON meal_credits(employee_id);
CREATE INDEX idx_meal_credits_date ON meal_credits(date);
CREATE INDEX idx_transactions_employee ON transactions(employee_id);
CREATE INDEX idx_transactions_company ON transactions(company_id);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX idx_daily_reports_company_date ON daily_reports(company_id, date);
```

**Must NOT do**:
- Do NOT create foreign key to other tables not in schema
- Do NOT add unnecessary indexes (only on query columns)
- Do NOT use TEXT for numeric fields (use DECIMAL)
- Do NOT forget ON DELETE CASCADE for dependent tables

**Recommended Agent Profile**:
> Select category + skills based on task domain. Justify each choice.
- **Category**: `unspecified-low`
  - Reason: Database schema setup is straightforward with clear requirements, minimal complexity
- **Skills**: [`git-master`]
  - `git-master`: For committing schema changes with clear messages

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 2, 3)
- **Blocks**: Task 4 (Auth/RLS depends on schema), Task 7, 8 (UI depends on data structure)
- **Blocked By**: None (can start immediately)

**References** (CRITICAL - Be Exhaustive):

> The executor has NO context from your interview. References are their ONLY guide.
> Each reference must answer: "What should I look at and WHY?"

**Database References** (schema design patterns):
- Supabase official docs: `https://supabase.com/docs/guides/database` - Database schema and constraints
- Supabase RLS docs: `https://supabase.com/docs/guides/auth/row-level-security` - Row Level Security patterns
- PostgreSQL docs: `https://www.postgresql.org/docs/current/ddl-constraints.html` - Constraint syntax

**TypeScript References** (for generated types later):
- Supabase TypeScript docs: `https://supabase.com/docs/guides/database/generating-types` - Generate types from schema

**External References** (SQL conventions):
- PostgreSQL UUID docs: `https://www.postgresql.org/docs/current/datatype-uuid.html` - UUID column defaults
- JSONB docs: `https://www.postgresql.org/docs/current/datatype-json.html` - JSONB for flexible data

**WHY Each Reference Matters** (explain the relevance):
- Supabase database docs: Explain how to use Supabase CLI for schema management (`supabase db push`)
- RLS docs: Essential for multi-tenant isolation - will be used in Task 4
- Constraint docs: Ensure proper foreign keys and check constraints for data integrity

**Acceptance Criteria**:

> **CRITICAL: AGENT-EXECUTABLE VERIFICATION ONLY**

**Automated Verification** (using Bash):
```bash
# Agent runs:
supabase db diff --schema public --schema auth --file schema-check.sql
# Assert: File contains all expected tables (companies, employees, meal_credits, transactions, daily_reports)

supabase db reset
# Assert: Reset completes with no errors

supabase db reset && psql postgresql://postgres:postgres@localhost:54322/postgres -c "\dt"
# Assert: Output shows 5 tables: companies, employees, meal_credits, transactions, daily_reports

psql postgresql://postgres:postgres@localhost:54322/postgres -c "\d companies"
# Assert: Shows 9 columns with correct data types (id UUID, name TEXT, admin_id UUID, etc.)

psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT COUNT(*) FROM companies;"
# Assert: Returns 0 (empty database after reset)
```

**Evidence to Capture**:
- [ ] `schema-check.sql` file content showing all CREATE TABLE statements
- [ ] Terminal output from `\dt` command listing all tables
- [ ] Terminal output from `\d companies` showing table structure

**Commit**: YES
- Message: `feat(database): create complete schema for e-coupon system`
- Files: `supabase/schema.sql`
- Pre-commit: `supabase db reset`

---

### [ ] 2. Next.js Project Setup + PWA Configuration

**What to do**:
1. Initialize Next.js project: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
2. Install PWA dependencies: `npm install next-pwa`
3. Create `next.config.js` with PWA configuration
4. Create `public/manifest.json` with app metadata
5. Configure service worker with NetworkFirst strategy for API, CacheFirst for static assets
6. Verify PWA install prompt works in browser

**PWA Configuration** (`next.config.js`):
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api-cache',
        expiration: { maxEntries: 100, maxAgeSeconds: 86400 }
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-image-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 604800 }
      }
    }
  ]
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
};

module.exports = withPWA(nextConfig);
```

**Manifest** (`public/manifest.json`):
```json
{
  "name": "E-Coupon PWA",
  "short_name": "E-Coupon",
  "description": "Employee meal credit management with fingerprint authentication",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Must NOT do**:
- Do NOT disable PWA in production (keep `disable: process.env.NODE_ENV === 'development'`)
- Do NOT forget to create manifest.json icons (192x192 and 512x512 PNG)
- Do NOT use CacheFirst for Supabase API (must be NetworkFirst for data consistency)
- Do NOT configure aggressive caching for API responses

**Recommended Agent Profile**:
> Select category + skills based on task domain. Justify each choice.
- **Category**: `unspecified-low`
  - Reason: Project setup is standard with clear steps from documentation
- **Skills**: [`git-master`]
  - `git-master`: For committing configuration changes incrementally

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 3)
- **Blocks**: Task 6 (API routes), Task 7, 8 (UI development)
- **Blocked By**: None (can start immediately)

**References** (CRITICAL - Be Exhaustive):

> The executor has NO context from your interview. References are their ONLY guide.
> Each reference must answer: "What should I look at and WHY?"

**Next.js PWA References** (official docs):
- next-pwa docs: `https://github.com/DuCanhGH/next-pwa` - Complete configuration options
- Next.js PWA docs: `https://nextjs.org/docs/app/building-your-application/optimizing/pwa` - PWA best practices
- PWA manifest: `https://developer.mozilla.org/en-US/docs/Web/Manifest` - Manifest.json schema

**Caching Strategy References** (service worker patterns):
- Service Worker API: `https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API` - Service worker lifecycle
- Workbox docs: `https://developers.google.com/web/tools/workbox` - Caching strategies (NetworkFirst, CacheFirst)

**WHY Each Reference Matters** (explain the relevance):
- next-pwa docs: Explain all configuration options like `dest`, `disable`, `register`, `skipWaiting`
- Caching strategies: NetworkFirst ensures Supabase API is always fresh, CacheFirst optimizes static assets

**Acceptance Criteria**:

> **CRITICAL: AGENT-EXECUTABLE VERIFICATION ONLY**

**Automated Verification** (using Bash):
```bash
# Agent runs:
npm run dev &
sleep 10
curl -s http://localhost:3000/manifest.json | jq '.name'
# Assert: Returns "E-Coupon PWA"

curl -s http://localhost:3000/sw.js | head -20
# Assert: Service worker exists and contains PWA code

ls -lh public/manifest.json public/icon-192x192.png public/icon-512x512.png 2>&1 | grep -v "No such file"
# Assert: All three files exist with non-zero size

pkill -f "npm run dev"
```

**Evidence to Capture**:
- [ ] `next.config.js` file content
- [ ] `public/manifest.json` file content
- [ ] Terminal output from manifest.json curl showing name property
- [ ] File listing showing manifest and icons exist

**Commit**: YES
- Message: `feat(pwa): configure next-pwa with manifest and service worker`
- Files: `next.config.js`, `public/manifest.json`, `public/icon-*.png`
- Pre-commit: `npm run build`

---

### [ ] 3. Electron Project Setup

**What to do**:
1. Create `electron-bridge/` directory for Electron app
2. Initialize Electron project: `cd electron-bridge && npm init -y`
3. Install Electron: `npm install --save-dev electron electron-builder`
4. Create `electron-bridge/package.json` with scripts:
   ```json
   {
     "name": "zk9500-bridge",
     "version": "1.0.0",
     "main": "main.js",
     "scripts": {
       "start": "electron .",
       "build": "electron-builder --win"
     },
     "dependencies": {},
     "devDependencies": {
       "electron": "^28.0.0",
       "electron-builder": "^24.9.0"
     },
     "build": {
       "appId": "com.zk9500.bridge",
       "productName": "ZK9500 Bridge",
       "win": {
         "target": ["nsis"]
       }
     }
   }
   ```
5. Create `electron-bridge/main.js` with basic window setup
6. Test Electron window launches successfully

**Basic Electron Setup** (`electron-bridge/main.js`):
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

**Must NOT do**:
- Do NOT configure `contextIsolation: true` yet (will enable after adding preload script in Task 5)
- Do NOT install ZK9500 SDK yet (will do in Task 5)
- Do NOT add WebSocket server yet (will do in Task 5)
- Do NOT forget to check for Electron-specific security issues

**Recommended Agent Profile**:
> Select category + skills based on task domain. Justify each choice.
- **Category**: `unspecified-low`
  - Reason: Electron setup is standard with well-documented patterns
- **Skills**: [`git-master`]
  - `git-master`: For committing incremental changes

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Tasks 1, 2)
- **Blocks**: Task 5 (ZK9500 SDK integration)
- **Blocked By**: None (can start immediately)

**References** (CRITICAL - Be Exhaustive):

> The executor has NO context from your interview. References are their ONLY guide.
> Each reference must answer: "What should I look at and WHY?"

**Electron References** (official docs):
- Electron Quick Start: `https://www.electronjs.org/docs/latest/tutorial/quick-start` - Basic setup
- Electron Process Model: `https://www.electronjs.org/docs/latest/tutorial/process-model` - Main vs renderer process
- electron-builder: `https://www.electron.build/` - Build configuration for Windows

**ZK9500 SDK References** (vendor-specific):
- ZKTECO Developer Portal: `https://www.zkteco.com/en/download_center` - SDK downloads (Task 5 will use)
- Note: ZK9500 SDK is Windows/Linux native, will use Node.js native modules or spawn processes

**WHY Each Reference Matters** (explain the relevance):
- Electron Quick Start: Provides boilerplate code for `main.js` and window creation
- Process model: Explains `nodeIntegration` and `contextIsolation` security trade-offs

**Acceptance Criteria**:

> **CRITICAL: AGENT-EXECUTABLE VERIFICATION ONLY**

**Automated Verification** (using Bash):
```bash
# Agent runs:
cd electron-bridge
npm start &
sleep 5
# Check if Electron window opened (no easy way to verify via CLI, but check process)
ps aux | grep -i electron | grep -v grep
# Assert: Electron process is running

pkill -f electron
```

**Manual Verification** (documented for executor):
```bash
# Executor manually verifies:
cd electron-bridge && npm start
# Expected: Electron window opens with blank white screen (index.html not created yet)
```

**Evidence to Capture**:
- [ ] `electron-bridge/package.json` file content
- [ ] `electron-bridge/main.js` file content
- [ ] Terminal output showing Electron process running

**Commit**: YES
- Message: `feat(electron): initialize Electron bridge project with basic window`
- Files: `electron-bridge/package.json`, `electron-bridge/main.js`
- Pre-commit: `cd electron-bridge && npm start` (manual check)

---

## Wave 2: Backend + Bridge Integration

### [ ] 4. Supabase Auth + RLS Policies

**What to do**:
1. Create Supabase Auth trigger to insert company when user signs up
2. Create Row Level Security (RLS) policies for multi-tenant isolation
3. Create helper functions for permission checks
4. Create database triggers for automatic meal credit reset
5. Test RLS policies ensure users only see their company's data

**RLS Policies**:
```sql
-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Companies: Admin can see/edit their own company
CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  USING (auth.uid() = admin_id);

CREATE POLICY "Admin can update own company"
  ON companies FOR UPDATE
  USING (auth.uid() = admin_id);

-- Employees: Only employees from same company
CREATE POLICY "View own company employees"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = employees.company_id
      AND companies.admin_id = auth.uid()
    )
  );

CREATE POLICY "Manage own company employees"
  ON employees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = employees.company_id
      AND companies.admin_id = auth.uid()
    )
  );

-- Meal Credits: Only via company
CREATE POLICY "View own company meal credits"
  ON meal_credits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = (
        SELECT company_id FROM employees WHERE employees.id = meal_credits.employee_id
      )
      AND companies.admin_id = auth.uid()
    )
  );

CREATE POLICY "Manage own company meal credits"
  ON meal_credits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = (
        SELECT company_id FROM employees WHERE employees.id = meal_credits.employee_id
      )
      AND companies.admin_id = auth.uid()
    )
  );

-- Transactions: Only via company
CREATE POLICY "View own company transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = transactions.company_id
      AND companies.admin_id = auth.uid()
    )
  );

CREATE POLICY "Manage own company transactions"
  ON transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = transactions.company_id
      AND companies.admin_id = auth.uid()
    )
  );

-- Daily Reports: Only via company
CREATE POLICY "View own company reports"
  ON daily_reports FOR SELECT
  USING (company_id IN (
    SELECT id FROM companies WHERE admin_id = auth.uid()
  ));
```

**Database Trigger for Meal Credit Reset**:
```sql
-- Function to create meal credits for new employees
CREATE OR REPLACE FUNCTION create_meal_credits_for_employee()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO meal_credits (employee_id, date, lunch_available, ot_meal_available)
  SELECT
    NEW.id,
    CURRENT_DATE + generate_series(0, 30),
    TRUE,
    FALSE
  ON CONFLICT (employee_id, date) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on employee insert
CREATE TRIGGER trigger_create_meal_credits
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION create_meal_credits_for_employee();
```

**Must NOT do**:
- Do NOT allow cross-company data access (strict RLS required)
- Do NOT forget RLS on all tables
- Do NOT use `auth.uid()` for admin checks only (use admin_id from companies table)
- Do NOT create policies that bypass security (no `USING (true)`)

**Recommended Agent Profile**:
> Select category + skills based on task domain. Justify each choice.
- **Category**: `unspecified-high`
  - Reason: RLS policies are critical for security and multi-tenant isolation
- **Skills**: [`git-master`]
  - `git-master`: For committing security policies with audit trail

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 5, 6)
- **Blocks**: Task 7, 8 (UI depends on secure data access)
- **Blocked By**: Task 1 (Database schema must exist)

**References** (CRITICAL - Be Exhaustive):

> The executor has NO context from your interview. References are their ONLY guide.
> Each reference must answer: "What should I look at and WHY?"

**Supabase RLS References** (security patterns):
- Supabase RLS Guide: `https://supabase.com/docs/guides/auth/row-level-security` - RLS policy syntax
- Supabase Auth Integration: `https://supabase.com/docs/guides/auth/auth-helpers/nextjs` - Next.js auth helpers
- PostgreSQL RLS Docs: `https://www.postgresql.org/docs/current/ddl-rowsecurity.html` - RLS internals

**Multi-Tenant Patterns**:
- Supabase Multi-Tenant: `https://supabase.com/docs/guides/database/row-level-security-tutorial` - Multi-tenant RLS examples

**WHY Each Reference Matters** (explain the relevance):
- Supabase RLS Guide: Shows exact syntax for `CREATE POLICY` statements with `USING` clauses
- Multi-tenant examples: Demonstrates pattern of `EXISTS (SELECT 1 FROM companies WHERE admin_id = auth.uid())` for isolation

**Acceptance Criteria**:

> **CRITICAL: AGENT-EXECUTABLE VERIFICATION ONLY**

**Automated Verification** (using Bash psql):
```bash
# Agent runs:
supabase db reset

# Test RLS policy exists
psql postgresql://postgres:postgres@localhost:54322/postgres -c "
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('companies', 'employees', 'meal_credits', 'transactions', 'daily_reports');
"
# Assert: Returns at least 6 policies (one for each table operation)

# Test RLS is enabled
psql postgresql://postgres:postgres@localhost:54322/postgres -c "
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('companies', 'employees', 'meal_credits', 'transactions', 'daily_reports');
"
# Assert: All tables have rowsecurity = true
```

**Evidence to Capture**:
- [ ] Output from `pg_policies` query showing all RLS policies
- [ ] Output from `pg_tables` query showing RLS enabled

**Commit**: YES
- Message: `feat(security): implement RLS policies for multi-tenant isolation`
- Files: `supabase/migrations/001_enable_rls.sql`
- Pre-commit: `supabase db reset`

---

### [ ] 5. Electron Bridge: ZK9500 SDK Integration

**What to do**:
1. Download ZKTECO SDK for ZK9500 from vendor portal
2. Extract SDK to `electron-bridge/sdk/` directory
3. Create Node.js native module or spawn process to call SDK functions
4. Implement fingerprint capture function:
   - Initialize ZK9500 device
   - Capture fingerprint image
   - Convert to base64 template
   - Return template for API verification
5. Create WebSocket server for real-time fingerprint events
6. Create HTTP server for Next.js API to communicate with bridge

**Assumption**: ZKTECO SDK provides Windows/Linux DLL/.so libraries with command-line tools or Node.js bindings. If not available, will spawn process using CLI tools.

**Electron Bridge Architecture**:
```
ZK9500 Device
    ↓ (USB)
ZKTECO SDK (native)
    ↓ (Node.js child_process)
Electron Main Process
    ↓ (WebSocket Server)
Next.js API /app/api/verify-fingerprint
```

**Implementation Approach** (if SDK has CLI tools):
```javascript
// electron-bridge/fingerprint.js
const { spawn } = require('child_process');
const WebSocket = require('ws');

class FingerprintBridge {
  constructor() {
    this.wss = new WebSocket.Server({ port: 8081 });
    this.setupWebSocket();
  }

  captureFingerprint() {
    return new Promise((resolve, reject) => {
      // Spawn SDK CLI tool
      const sdk = spawn('./sdk/zk9500-capture', ['--format', 'base64']);

      let output = '';
      sdk.stdout.on('data', (data) => {
        output += data.toString();
      });

      sdk.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim()); // Base64 fingerprint template
        } else {
          reject(new Error(`SDK failed with code ${code}`));
        }
      });
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      ws.on('message', async (message) => {
        const { type } = JSON.parse(message);

        if (type === 'capture') {
          try {
            const template = await this.captureFingerprint();
            ws.send(JSON.stringify({ type: 'fingerprint', template }));
          } catch (error) {
            ws.send(JSON.stringify({ type: 'error', message: error.message }));
          }
        }
      });
    });
  }
}

module.exports = FingerprintBridge;
```

**Update `electron-bridge/main.js`**:
```javascript
const FingerprintBridge = require('./fingerprint');

let mainWindow;
let fingerprintBridge;

app.whenReady().then(() => {
  createWindow();
  fingerprintBridge = new FingerprintBridge();
  console.log('Fingerprint bridge running on ws://localhost:8081');
});
```

**Must NOT do**:
- Do NOT hardcode WebSocket port (should be configurable via env var)
- Do NOT block UI thread during fingerprint capture (must be async)
- Do NOT expose device commands directly to web (validate via Next.js API)
- Do NOT store fingerprint templates locally in Electron (send to API for verification)

**Recommended Agent Profile**:
> Select category + skills based on task domain. Justify each choice.
- **Category**: `unspecified-high`
  - Reason: Native SDK integration is complex with potential platform-specific issues
- **Skills**: [`git-master`]
  - `git-master`: For committing incremental integration steps

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 4, 6)
- **Blocks**: Task 11 (Electron + Next.js integration)
- **Blocked By**: Task 3 (Electron project setup)

**References** (CRITICAL - Be Exhaustive):

> The executor has NO context from your interview. References are their ONLY guide.
> Each reference must answer: "What should I look at and WHY?"

**ZK9500 SDK References** (vendor-specific):
- ZKTECO SDK Download: `https://www.zkteco.com/en/download_center` - SDK for ZK9500
- Note: SDK typically includes:
  - Windows DLL (zkfpengx.dll)
  - Linux .so library
  - Documentation for function calls
  - Sample code (C#, Java, Python)

**Node.js Native Integration References**:
- node-gyp: `https://www.npmjs.com/package/node-gyp` - Build native modules
- child_process: `https://nodejs.org/api/child_process.html` - Spawn native processes
- ws (WebSocket): `https://github.com/websockets/ws` - WebSocket server

**Fingerprint Recognition Pattern**:
- ZK9500 typically uses ISO 19794-2 template format
- Template size: ~300-500 bytes base64 encoded
- Matching: 1:N verification (compare template against stored templates)

**WHY Each Reference Matters** (explain the relevance):
- ZKTECO SDK: Provides actual functions to capture and match fingerprints
- child_process: If SDK has CLI tools, spawn process is easier than native module
- ws: WebSocket server enables real-time communication between Electron and Next.js

**Acceptance Criteria**:

> **CRITICAL: AGENT-EXECUTABLE VERIFICATION ONLY**

**Note**: Full verification requires ZK9500 hardware. This task verifies bridge structure and fallback logic.

**Automated Verification** (using Bash):
```bash
# Agent runs:
cd electron-bridge

# Verify WebSocket dependency
grep -q "\"ws\":" package.json
# Assert: Returns exit code 0 (ws dependency exists)

# Verify fingerprint.js exists and has expected structure
grep -q "class FingerprintBridge" fingerprint.js
grep -q "captureFingerprint" fingerprint.js
grep -q "setupWebSocket" fingerprint.js
# Assert: All patterns found

# If SDK CLI tools exist (fallback verification)
if [ -f sdk/zk9500-capture ]; then
  ./sdk/zk9500-capture --help 2>&1 | head -5
  # Assert: Shows help text
fi

npm start &
sleep 5

# Check WebSocket server is listening
netstat -an | grep :8081 | grep LISTEN
# Assert: Port 8081 is listening

pkill -f electron
```

**Manual Verification** (documented for hardware testing):
```bash
# With ZK9500 connected:
cd electron-bridge && npm start
# Expected: Console shows "Fingerprint bridge running on ws://localhost:8081"
# Place finger on scanner → Should see fingerprint template in logs
```

**Evidence to Capture**:
- [ ] `electron-bridge/fingerprint.js` file content
- [ ] Terminal output showing WebSocket server listening
- [ ] `package.json` showing ws dependency

**Commit**: YES
- Message: `feat(electron): integrate ZK9500 SDK and WebSocket bridge`
- Files: `electron-bridge/fingerprint.js`, `electron-bridge/sdk/`, `electron-bridge/main.js`
- Pre-commit: `cd electron-bridge && npm start` (manual check)

---

### [ ] 6. Next.js API Routes: Core Business Logic

**What to do**:
1. Create Supabase client utility: `lib/supabase.ts`
2. Create API route for fingerprint verification: `app/api/verify-fingerprint/route.ts`
3. Create API route for meal redemption: `app/api/redeem/route.ts`
4. Create API route for employee CRUD: `app/api/employees/route.ts`
5. Create API route for OT marking: `app/api/mark-ot/route.ts`
6. Implement business logic for validation (time windows, credit availability, override flags)

**Supabase Client** (`lib/supabase.ts`):
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Fingerprint Verification API** (`app/api/verify-fingerprint/route.ts`):
```typescript
import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { fingerprint_template, company_id } = await request.json();

    // Find employee by fingerprint template (exact match for now)
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*, companies(*)')
      .eq('fingerprint_template', fingerprint_template)
      .eq('company_id', company_id)
      .single();

    if (error || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ employee });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
```

**Meal Redemption API** (`app/api/redeem/route.ts`):
```typescript
import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { employee_id, meal_type, is_override, override_reason } = await request.json();

    // Get employee with company
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*, companies(*)')
      .eq('id', employee_id)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const company = employee.companies;
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);

    // Validate time window
    let validWindow = false;
    if (meal_type === 'LUNCH') {
      validWindow = currentTime >= company.lunch_time_start && currentTime <= company.lunch_time_end;
    } else if (meal_type === 'OT_MEAL') {
      validWindow = currentTime >= company.ot_time_start && currentTime <= company.ot_time_end;
    }

    if (!validWindow && !is_override) {
      return NextResponse.json({
        error: 'Not in valid time window',
        valid: false,
        allowed_override: true
      }, { status: 400 });
    }

    // Check meal credit availability
    const { data: credit, error: creditError } = await supabase
      .from('meal_credits')
      .select('*')
      .eq('employee_id', employee_id)
      .eq('date', now.toISOString().split('T')[0])
      .single();

    if (creditError || !credit) {
      return NextResponse.json({ error: 'Meal credit not found' }, { status: 404 });
    }

    let creditAvailable = false;
    if (meal_type === 'LUNCH' && credit.lunch_available) {
      creditAvailable = true;
    } else if (meal_type === 'OT_MEAL' && credit.ot_meal_available) {
      creditAvailable = true;
    }

    if (!creditAvailable && !is_override) {
      return NextResponse.json({
        error: 'No credit available',
        valid: false,
        allowed_override: true
      }, { status: 400 });
    }

    // Create transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        employee_id,
        company_id: company.id,
        meal_type,
        amount: meal_type === 'LUNCH' ? company.lunch_price : company.ot_meal_price,
        is_override: is_override || false,
        override_reason: override_reason || null,
        status: is_override ? 'FLAGGED' : 'VALID'
      })
      .select()
      .single();

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    // Update meal credits
    const updateData: any = {};
    if (meal_type === 'LUNCH') updateData.lunch_available = false;
    if (meal_type === 'OT_MEAL') updateData.ot_meal_available = false;

    await supabase
      .from('meal_credits')
      .update(updateData)
      .eq('id', credit.id);

    return NextResponse.json({ transaction, employee, success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
```

**Must NOT do**:
- Do NOT bypass time window validation without override flag
- Do NOT allow redemption without credit availability (unless override)
- Do NOT forget to set `status: FLAGGED` for override transactions
- Do NOT expose sensitive employee data in error messages

**Recommended Agent Profile**:
> Select category + skills based on task domain. Justify each choice.
- **Category**: `unspecified-high`
  - Reason: Business logic with validation rules and database operations
- **Skills**: [`git-master`]
  - `git-master`: For committing incremental API changes

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 4, 5)
- **Blocks**: Task 7, 8 (UI depends on API)
- **Blocked By**: Task 1 (Database schema), Task 2 (Next.js setup), Task 4 (RLS)

**References** (CRITICAL - Be Exhaustive):

> The executor has NO context from your interview. References are their ONLY guide.
> Each reference must answer: "What should I look at and WHY?"

**Next.js API Routes References** (official docs):
- Next.js API Routes: `https://nextjs.org/docs/app/building-your-application/routing/route-handlers` - Route handler syntax
- Next.js Request/Response: `https://nextjs.org/docs/app/building-your-application/routing/route-handlers#request-and-response-objects` - Request/Response types

**Supabase Client References**:
- Supabase JS Client: `https://supabase.com/docs/reference/javascript` - Query methods
- Supabase TypeScript: `https://supabase.com/docs/guides/database/generating-types` - Type-safe queries

**Business Logic References** (from requirements):
- Time window validation: Lines 272-276 in draft (per-company configuration)
- Override workflow: Lines 278-283 in draft (warning + override + flag)

**WHY Each Reference Matters** (explain the relevance):
- Next.js API docs: Show exact pattern for `export async function POST(request: NextRequest)`
- Supabase JS docs: Explain `.select()`, `.eq()`, `.insert()`, `.update()` methods
- Business logic requirements: Ensure all validation rules from draft are implemented

**Acceptance Criteria**:

> **CRITICAL: AGENT-EXECUTABLE VERIFICATION ONLY**

**Automated Verification** (using Bash curl):
```bash
# Agent runs:
npm run dev &
sleep 10

# Test verify-fingerprint API (mock data not available, will return 404)
curl -s -X POST http://localhost:3000/api/verify-fingerprint \
  -H "Content-Type: application/json" \
  -d '{"fingerprint_template":"test","company_id":"00000000-0000-0000-0000-000000000000"}' | jq
# Assert: Returns JSON with error message or employee object

# Test redeem API (will fail validation without credits)
curl -s -X POST http://localhost:3000/api/redeem \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"test-id","meal_type":"LUNCH"}' | jq
# Assert: Returns JSON with error message

# Check API routes exist
ls -la src/app/api/verify-fingerprint/route.ts 2>&1
ls -la src/app/api/redeem/route.ts 2>&1
# Assert: Both files exist

pkill -f "npm run dev"
```

**Evidence to Capture**:
- [ ] `lib/supabase.ts` file content
- [ ] `app/api/verify-fingerprint/route.ts` file content
- [ ] `app/api/redeem/route.ts` file content
- [ ] Terminal output from API test curl commands

**Commit**: YES
- Message: `feat(api): implement fingerprint verification and redemption endpoints`
- Files: `lib/supabase.ts`, `app/api/verify-fingerprint/route.ts`, `app/api/redeem/route.ts`
- Pre-commit: `npm run build`

---

## Wave 3: Frontend UI Development

### [ ] 7. Admin UI: Employee CRUD

**What to do**:
1. Create Admin layout: `app/admin/layout.tsx` with navigation sidebar
2. Create employee list page: `app/admin/employees/page.tsx`
3. Create employee form component: `components/EmployeeForm.tsx`
4. Implement Create employee with name and PIN
5. Implement Read employee list with search/filter
6. Implement Update employee details
7. Implement Delete employee with confirmation
8. Add fingerprint enrollment (placeholder - will integrate with bridge in Task 11)

**Employee List Page** (`app/admin/employees/page.tsx`):
```typescript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import EmployeeForm from '@/components/EmployeeForm';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching employees:', error);
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure?')) return;

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting employee');
    } else {
      fetchEmployees();
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employees</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Add Employee
        </button>
      </div>

      <div className="grid gap-4">
        {employees.map((employee: any) => (
          <div
            key={employee.id}
            className="border rounded p-4 flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold">{employee.name}</h3>
              <p className="text-gray-600">PIN: {employee.pin}</p>
            </div>
            <button
              onClick={() => handleDelete(employee.id)}
              className="text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <EmployeeForm
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            fetchEmployees();
          }}
        />
      )}
    </div>
  );
}
```

**Employee Form Component** (`components/EmployeeForm.tsx`):
```typescript
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface EmployeeFormProps {
  onClose: () => void;
  onSave: () => void;
}

export default function EmployeeForm({ onClose, onSave }: EmployeeFormProps) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('employees')
      .insert({ name, pin });

    if (error) {
      alert('Error creating employee');
    } else {
      onSave();
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Employee</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">PIN</label>
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Must NOT do**:
- Do NOT use server actions for employee CRUD (use Supabase client)
- Do NOT forget to handle loading states and error messages
- Do NOT implement fingerprint enrollment yet (placeholder only)
- Do NOT forget to confirm before delete

**Recommended Agent Profile**:
> Select category + skills based on task domain. Justify each choice.
- **Category**: `visual-engineering`
  - Reason: Frontend UI development with React components and form handling
- **Skills**: [`frontend-ui-ux`, `git-master`]
  - `frontend-ui-ux`: For crafting clean, user-friendly UI components
  - `git-master`: For committing UI changes incrementally

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Tasks 8, 9)
- **Blocks**: Task 10 (Reporting depends on employee data)
- **Blocked By**: Task 1 (Database schema), Task 2 (Next.js setup), Task 4 (RLS), Task 6 (API)

**References** (CRITICAL - Be Exhaustive):

> The executor has NO context from your interview. References are their ONLY guide.
> Each reference must answer: "What should I look at and WHY?"

**Next.js App Router References**:
- Next.js App Router: `https://nextjs.org/docs/app` - App router structure and pages
- Next.js Client Components: `https://nextjs.org/docs/app/building-your-application/rendering/client-components` - 'use client' directive
- Next.js Layouts: `https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts#layouts` - Layout components

**React References**:
- React Hooks: `https://react.dev/reference/react` - useState, useEffect
- React Forms: `https://react.dev/learn#responding-to-events` - Form handling

**Tailwind CSS References**:
- Tailwind CSS: `https://tailwindcss.com/docs` - Utility classes for styling

**WHY Each Reference Matters** (explain the relevance):
- Next.js App Router docs: Show pattern for `app/admin/employees/page.tsx` structure
- React Hooks docs: Explain `useState`, `useEffect` for state management
- Tailwind docs: Provide utility classes for styling (e.g., `bg-blue-500`, `p-6`, `rounded`)

**Acceptance Criteria**:

> **CRITICAL: AGENT-EXECUTABLE VERIFICATION ONLY**

**Automated Verification** (using playwright skill):
```
# Agent executes via playwright browser automation:
1. Navigate to: http://localhost:3000/admin/employees
2. Wait for: page to load
3. Assert: H1 element contains text "Employees"
4. Assert: Button with text "Add Employee" exists
5. Click: "Add Employee" button
6. Wait for: modal dialog to appear
7. Fill: input for "Name" with "Test Employee"
8. Fill: input for "PIN" with "12345"
9. Click: "Save" button
10. Wait for: modal to close
11. Assert: Employee list contains "Test Employee" with PIN "12345"
12. Screenshot: .sisyphus/evidence/task-7-employee-crud.png
```

**Evidence to Capture**:
- [ ] `app/admin/employees/page.tsx` file content
- [ ] `components/EmployeeForm.tsx` file content
- [ ] Screenshot showing employee created in list

**Commit**: YES
- Message: `feat(ui): implement employee CRUD interface`
- Files: `app/admin/employees/page.tsx`, `components/EmployeeForm.tsx`, `app/admin/layout.tsx`
- Pre-commit: `npm run build`

---

### [ ] 8. Kiosk UI: Fingerprint Redemption

**What to do**:
1. Create Kiosk layout: `app/kiosk/layout.tsx` with fullscreen mode
2. Create redemption page: `app/kiosk/redeem/page.tsx`
3. Implement WebSocket client to connect to Electron bridge
4. Display fingerprint capture status (waiting, scanning, success, error)
5. Show employee details after successful scan
6. Display meal type options (Lunch, OT Meal) based on time window
7. Show redemption status (valid, warning, override)
8. Implement override confirmation dialog

**Kiosk Redemption Page** (`app/kiosk/redeem/page.tsx`):
```typescript
'use client';

import { useEffect, useState } from 'react';

export default function RedeemPage() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [employee, setEmployee] = useState<any>(null);
  const [mealType, setMealType] = useState<'LUNCH' | 'OT_MEAL' | null>(null);
  const [redemptionStatus, setRedemptionStatus] = useState<any>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:8081');
    setWs(websocket);

    websocket.onopen = () => {
      console.log('Connected to fingerprint bridge');
      setStatus('scanning');
      websocket.send(JSON.stringify({ type: 'capture' }));
    };

    websocket.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'fingerprint') {
        // Send template to API for verification
        const response = await fetch('/api/verify-fingerprint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fingerprint_template: message.template,
            company_id: localStorage.getItem('company_id')
          })
        });

        const data = await response.json();
        if (data.employee) {
          setEmployee(data.employee);
          setStatus('success');
        } else {
          setStatus('error');
        }
      } else if (message.type === 'error') {
        setStatus('error');
      }
    };

    return () => {
      websocket.close();
    };
  }, []);

  async function handleRedeem() {
    const response = await fetch('/api/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employee.id,
        meal_type: mealType,
        is_override: showOverride,
        override_reason: overrideReason
      })
    });

    const data = await response.json();
    setRedemptionStatus(data);

    if (data.success) {
      setTimeout(() => {
        setStatus('idle');
        setEmployee(null);
        setMealType(null);
        setRedemptionStatus(null);
        ws?.send(JSON.stringify({ type: 'capture' }));
      }, 3000);
    }
  }

  if (status === 'idle') {
    return <div className="h-screen flex items-center justify-center text-2xl">Initializing...</div>;
  }

  if (status === 'scanning') {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👆</div>
          <h1 className="text-3xl font-bold mb-4">Place Finger</h1>
          <p className="text-gray-600">Please place your finger on the scanner</p>
          <div className="mt-8 animate-pulse">Scanning...</div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold mb-4 text-red-500">Not Recognized</h1>
          <button
            onClick={() => {
              setStatus('scanning');
              ws?.send(JSON.stringify({ type: 'capture' }));
            }}
            className="bg-blue-500 text-white px-6 py-3 rounded mt-4"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success' && employee) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center max-w-md w-full p-6">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold mb-4">{employee.name}</h1>
          <p className="text-gray-600 mb-6">PIN: {employee.pin}</p>

          {!redemptionStatus ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">Select Meal</h2>
              <div className="space-y-4">
                <button
                  onClick={() => setMealType('LUNCH')}
                  className={`w-full p-4 border rounded-lg text-left ${mealType === 'LUNCH' ? 'border-blue-500 bg-blue-50' : ''}`}
                >
                  <div className="font-semibold">Lunch</div>
                  <div className="text-sm text-gray-600">
                    {employee.companies.lunch_time_start} - {employee.companies.lunch_time_end}
                  </div>
                </button>
                <button
                  onClick={() => setMealType('OT_MEAL')}
                  className={`w-full p-4 border rounded-lg text-left ${mealType === 'OT_MEAL' ? 'border-blue-500 bg-blue-50' : ''}`}
                >
                  <div className="font-semibold">OT Meal</div>
                  <div className="text-sm text-gray-600">
                    {employee.companies.ot_time_start} - {employee.companies.ot_time_end}
                  </div>
                </button>
              </div>

              {showOverride ? (
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder="Override reason"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full border rounded px-3 py-2 mb-2"
                  />
                  <button
                    onClick={handleRedeem}
                    disabled={!overrideReason}
                    className="w-full bg-orange-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
                  >
                    Override Redeem
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleRedeem}
                  disabled={!mealType}
                  className="w-full bg-green-500 text-white px-4 py-2 rounded mt-4 disabled:bg-gray-300"
                >
                  Redeem
                </button>
              )}

              <button
                onClick={() => setShowOverride(!showOverride)}
                className="w-full text-orange-500 mt-2"
              >
                {showOverride ? 'Cancel Override' : 'Override'}
              </button>
            </div>
          ) : (
            <div>
              <div className="text-6xl mb-4">{redemptionStatus.success ? '🎉' : '⚠️'}</div>
              <h2 className="text-2xl font-bold mb-2">
                {redemptionStatus.success ? 'Redeemed!' : 'Issue'}
              </h2>
              {redemptionStatus.transaction && (
                <p className="text-gray-600">
                  {redemptionStatus.transaction.meal_type} - {redemptionStatus.transaction.amount} THB
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
```

**Must NOT do**:
- Do NOT hardcode company_id (use localStorage from login)
- Do NOT allow redemption without selecting meal type
- Do NOT forget to validate time windows on client side (API will re-validate)
- Do NOT show sensitive employee data beyond name and PIN

**Recommended Agent Profile**:
> Select category + skills based on task domain. Justify each choice.
- **Category**: `visual-engineering`
  - Reason: Kiosk UI with real-time WebSocket communication and clear status indicators
- **Skills**: [`frontend-ui-ux`, `git-master`]
  - `frontend-ui-ux`: For crafting intuitive kiosk experience with large touch targets
  - `git-master`: For committing UI changes incrementally

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Tasks 7, 9)
- **Blocks**: Task 10 (Reporting depends on transaction data)
- **Blocked By**: Task 1 (Database schema), Task 2 (Next.js setup), Task 4 (RLS), Task 5 (Electron bridge), Task 6 (API)

**References** (CRITICAL - Be Exhaustive):

> The executor has NO context from your interview. References are their ONLY guide.
> Each reference must answer: "What should I look at and WHY?"

**WebSocket References**:
- WebSocket API: `https://developer.mozilla.org/en-US/docs/Web/API/WebSocket` - WebSocket client syntax
- ws library: `https://github.com/websockets/ws` - Server-side WebSocket (from Task 5)

**React State Management**:
- React Hooks: `https://react.dev/reference/react` - useState, useEffect
- React Lifecycle: `https://react.dev/learn/synchronizing-with-effects` - Effect cleanup

**Tailwind CSS References**:
- Tailwind Utilities: `https://tailwindcss.com/docs` - Classes for layout (flex, h-screen, etc.)

**WHY Each Reference Matters** (explain the relevance):
- WebSocket API docs: Show exact pattern for `new WebSocket(url)` and event handlers
- React Effects docs: Explain how to clean up WebSocket connection in `return () => websocket.close()`

**Acceptance Criteria**:

> **CRITICAL: AGENT-EXECUTABLE VERIFICATION ONLY**

**Note**: Full verification requires Electron bridge running with ZK9500. This task verifies UI structure and WebSocket client setup.

**Automated Verification** (using Bash):
```bash
# Agent runs:
npm run dev &
sleep 10

# Check kiosk route exists
curl -s http://localhost:3000/kiosk/redeem | grep -q "Place Finger"
# Assert: Page contains "Place Finger" text

# Check WebSocket client code exists
grep -q "new WebSocket" src/app/kiosk/redeem/page.tsx
grep -q "ws.send" src/app/kiosk/redeem/page.tsx
# Assert: WebSocket client code exists

pkill -f "npm run dev"
```

**Evidence to Capture**:
- [ ] `app/kiosk/redeem/page.tsx` file content
- [ ] Terminal output from curl showing page loads

**Commit**: YES
- Message: `feat(ui): implement kiosk redemption interface with WebSocket client`
- Files: `app/kiosk/redeem/page.tsx`, `app/kiosk/layout.tsx`
- Pre-commit: `npm run build`

---

### [ ] 9. Offline PWA Features (IndexedDB + Service Worker)

**What to do**:
1. Create IndexedDB utility: `lib/indexedDB.ts` for offline data storage
2. Implement offline data sync worker: `lib/syncWorker.ts`
3. Configure service worker background sync
4. Implement offline queue for mutations
5. Add offline status indicator to UI
6. Test offline mode: perform actions offline, verify sync when online

**IndexedDB Utility** (`lib/indexedDB.ts`):
```typescript
const DB_NAME = 'ecoupon-db';
const DB_VERSION = 1;
const QUEUE_STORE = 'offline-queue';

export class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        }
      };
    });
  }

  async addToQueue(action: any) {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.add({ id: Date.now(), ...action });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getQueue(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readonly');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromQueue(id: number) {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();
```

**Sync Worker** (`lib/syncWorker.ts`):
```typescript
import { offlineStorage } from './indexedDB';

export async function syncOfflineData() {
  const queue = await offlineStorage.getQueue();

  for (const action of queue) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body
      });

      if (response.ok) {
        await offlineStorage.removeFromQueue(action.id);
      }
    } catch (error) {
      console.error('Sync failed for action:', action.id, error);
    }
  }
}

// Listen for online event
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Back online, syncing...');
    syncOfflineData();
  });

  // Periodic sync every 30 seconds
  setInterval(() => {
    if (navigator.onLine) {
      syncOfflineData();
    }
  }, 30000);
}
```

**Service Worker Registration** (in `app/layout.tsx`):
```typescript
'use client';

import { useEffect } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  return <html>{children}</html>;
}
```

**Must NOT do**:
- Do NOT store sensitive data in IndexedDB (PWA storage is not encrypted)
- Do NOT forget to handle sync failures (keep failed items in queue)
- Do NOT sync without internet connection (check `navigator.onLine`)
- Do NOT create infinite sync loops (verify success before removing from queue)

**Recommended Agent Profile**:
> Select category + skills based on task domain. Justify each choice.
- **Category**: `unspecified-high`
  - Reason: Offline sync with IndexedDB and service worker coordination is complex
- **Skills**: [`git-master`]
  - `git-master`: For committing incremental offline features

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Tasks 7, 8)
- **Blocks**: None (can be tested independently)
- **Blocked By**: Task 2 (Next.js PWA setup)

**References** (CRITICAL - Be Exhaustive):

> The executor has NO context from your interview. References are their ONLY guide.
> Each reference must answer: "What should I look at and WHY?"

**IndexedDB References**:
- IndexedDB API: `https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API` - IndexedDB syntax
- idb library: `https://github.com/jakearchibald/idb` - Promisified IndexedDB wrapper (optional)

**Service Worker References**:
- Service Worker API: `https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API` - Service worker lifecycle
- Background Sync: `https://developer.mozilla.org/en-US/docs/Web/API/Background_Sync_API` - Background sync API

**PWA Offline Patterns**:
- Offline PWA: `https://web.dev/learn/pwa/offline-fallbacks` - Offline fallback strategies
- Service Worker Caching: `https://web.dev/learn/pwa/serviceworker-lifecycle` - Service worker lifecycle

**WHY Each Reference Matters** (explain the relevance):
- IndexedDB API docs: Show exact pattern for `indexedDB.open()`, `transaction`, `objectStore`
- Background Sync docs: Explain how to register sync events for offline data

**Acceptance Criteria**:

> **CRITICAL: AGENT-EXECUTABLE VERIFICATION ONLY**

**Automated Verification** (using Bash):
```bash
# Agent runs:
npm run dev &
sleep 10

# Check IndexedDB utility exists
grep -q "class OfflineStorage" lib/indexedDB.ts
grep -q "indexedDB.open" lib/indexedDB.ts
# Assert: IndexedDB code exists

# Check sync worker exists
grep -q "syncOfflineData" lib/syncWorker.ts
grep -q "addEventListener('online'" lib/syncWorker.ts
# Assert: Sync worker code exists

pkill -f "npm run dev"
```

**Manual Verification** (documented for executor):
```bash
# Executor manually verifies:
# 1. Open DevTools → Application → IndexedDB → ecoupon-db
# 2. Add item to queue via app (simulate offline)
# 3. Verify queue item appears in IndexedDB
# 4. Go online
# 5. Verify item is removed after sync
```

**Evidence to Capture**:
- [ ] `lib/indexedDB.ts` file content
- [ ] `lib/syncWorker.ts` file content
- [ ] Terminal output showing IndexedDB code exists

**Commit**: YES
- Message: `feat(pwa): implement offline sync with IndexedDB`
- Files: `lib/indexedDB.ts`, `lib/syncWorker.ts`, `app/layout.tsx`
- Pre-commit: `npm run build`

---

## Wave 4: Reporting + Integration + Testing

### [ ] 10. Reporting Module + Excel/PDF Export

**What to do**:
1. Create Admin reporting page: `app/admin/reports/page.tsx`
2. Implement dashboard with charts (Recharts)
3. Create daily/weekly/monthly/yearly report filters
4. Implement Excel export using `xlsxjs`
5. Implement PDF export using `jsPDF`
6. Display transaction list with employee details
7. Show cost calculations based on meal pricing

**Install Dependencies**:
```bash
npm install recharts xlsx jspdf jspdf-autotable
npm install --save-dev @types/jspdf
```

**Reporting Page** (`app/admin/reports/page.tsx`):
```typescript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportsPage() {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [filter]);

  async function fetchTransactions() {
    setLoading(true);
    const startDate = getStartDate(filter);

    const { data, error } = await supabase
      .from('transactions')
      .select('*, employees(name, pin), companies(name)')
      .gte('timestamp', startDate)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  }

  function getStartDate(filter: string) {
    const now = new Date();
    switch (filter) {
      case 'daily':
        return new Date(now.setHours(0, 0, 0, 0)).toISOString();
      case 'weekly':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      case 'yearly':
        return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
      default:
        return new Date(0).toISOString();
    }
  }

  function getTotalCost() {
    return transactions.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0).toFixed(2);
  }

  function getMealCounts() {
    return transactions.reduce((acc: any, t: any) => {
      acc[t.meal_type] = (acc[t.meal_type] || 0) + 1;
      return acc;
    }, {});
  }

  function exportToExcel() {
    const worksheet = XLSX.utils.json_to_sheet(
      transactions.map((t: any) => ({
        Date: new Date(t.timestamp).toLocaleDateString(),
        Time: new Date(t.timestamp).toLocaleTimeString(),
        Employee: t.employees?.name,
        PIN: t.employees?.pin,
        Company: t.companies?.name,
        'Meal Type': t.meal_type,
        Amount: t.amount,
        Override: t.is_override ? 'Yes' : 'No',
        Status: t.status
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    XLSX.writeFile(workbook, `transactions-${filter}-${Date.now()}.xlsx`);
  }

  function exportToPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(18);
    doc.text(`Transactions Report (${filter})`, 14, 22);

    autoTable(doc, {
      startY: 30,
      head: [['Date', 'Time', 'Employee', 'PIN', 'Meal Type', 'Amount', 'Override', 'Status']],
      body: transactions.map((t: any) => [
        new Date(t.timestamp).toLocaleDateString(),
        new Date(t.timestamp).toLocaleTimeString(),
        t.employees?.name,
        t.employees?.pin,
        t.meal_type,
        t.amount,
        t.is_override ? 'Yes' : 'No',
        t.status
      ])
    });

    doc.save(`transactions-${filter}-${Date.now()}.pdf`);
  }

  const chartData = Object.entries(getMealCounts()).map(([type, count]) => ({
    type,
    count
  }));

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      <div className="mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="border rounded px-3 py-2"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="border rounded p-4">
          <h3 className="text-lg font-semibold">Total Transactions</h3>
          <p className="text-3xl font-bold">{transactions.length}</p>
        </div>
        <div className="border rounded p-4">
          <h3 className="text-lg font-semibold">Total Cost</h3>
          <p className="text-3xl font-bold">{getTotalCost()} THB</p>
        </div>
        <div className="border rounded p-4">
          <h3 className="text-lg font-semibold">Meal Counts</h3>
          <div>
            <p>Lunch: {getMealCounts().LUNCH || 0}</p>
            <p>OT Meal: {getMealCounts().OT_MEAL || 0}</p>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="border rounded p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Meal Distribution</h3>
          <BarChart width={600} height={300} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="type" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#3b82f6" />
          </BarChart>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button onClick={exportToExcel} className="bg-green-500 text-white px-4 py-2 rounded">
          Export Excel
        </button>
        <button onClick={exportToPDF} className="bg-red-500 text-white px-4 py-2 rounded">
          Export PDF
        </button>
      </div>

      <div className="border rounded">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Time</th>
              <th className="p-3 text-left">Employee</th>
              <th className="p-3 text-left">PIN</th>
              <th className="p-3 text-left">Meal Type</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Override</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t: any) => (
              <tr key={t.id} className="border-t">
                <td className="p-3">{new Date(t.timestamp).toLocaleDateString()}</td>
                <td className="p-3">{new Date(t.timestamp).toLocaleTimeString()}</td>
                <td className="p-3">{t.employees?.name}</td>
                <td className="p-3">{t.employees?.pin}</td>
                <td className="p-3">{t.meal_type}</td>
                <td className="p-3">{t.amount} THB</td>
                <td className="p-3">{t.is_override ? 'Yes' : 'No'}</td>
                <td className="p-3">{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Must NOT do**:
- Do NOT use client-side PDF generation for large reports (use Supabase Edge Functions for PDF if needed)
- Do NOT forget to include employee list in exports (requirement from draft)
- Do NOT allow export without data validation (check transactions array not empty)
- Do NOT hardcode pricing (calculate from database)

**Recommended Agent Profile**:
> Select category + skills based on task domain. Justify each choice.
- **Category**: `visual-engineering`
  - Reason: Dashboard with charts and export functionality
- **Skills**: [`frontend-ui-ux`, `git-master`]
  - `frontend-ui-ux`: For crafting clean dashboard with data visualization
  - `git-master`: For committing reporting features

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 4 (with Tasks 11, 12)
- **Blocks**: Task 12 (End-to-end testing)
- **Blocked By**: Task 1 (Database schema), Task 7 (Employee CRUD), Task 8 (Redemption UI)

**References** (CRITICAL - Be Exhaustive):

> The executor has NO context from your interview. References are their ONLY guide.
> Each reference must answer: "What should I look at and WHY?"

**Recharts References**:
- Recharts Docs: `https://recharts.org/en-US` - Chart component syntax

**Excel Export References**:
- xlsxjs (SheetJS): `https://sheetjs.com/docs` - Excel generation
- xlsxjs API: `https://docs.sheetjs.com/docs/api/` - `XLSX.utils.json_to_sheet()` syntax

**PDF Export References**:
- jsPDF: `https://github.com/parallax/jsPDF` - PDF generation
- jspdf-autotable: `https://github.com/simonbengtsson/jsPDF-AutoTable` - Table to PDF
- jsPDF Syntax: `https://rawgit.com/MrRio/jsPDF/master/docs/index.html` - API reference

**Supabase Query References**:
- Supabase Select: `https://supabase.com/docs/reference/javascript/select` - `.gte()`, `.order()`

**WHY Each Reference Matters** (explain the relevance):
- Recharts docs: Show exact pattern for `<BarChart>` with `<XAxis>`, `<YAxis>`, `<Bar>` components
- xlsxjs docs: Explain how to convert JSON to worksheet and download as file
- jsPDF docs: Show pattern for `new jsPDF()` with `autoTable()` for tables

**Acceptance Criteria**:

> **CRITICAL: AGENT-EXECUTABLE VERIFICATION ONLY**

**Automated Verification** (using Bash):
```bash
# Agent runs:
npm run dev &
sleep 10

# Check reporting page exists
curl -s http://localhost:3000/admin/reports | grep -q "Reports"
# Assert: Page contains "Reports" heading

# Check export functions exist
grep -q "exportToExcel" src/app/admin/reports/page.tsx
grep -q "exportToPDF" src/app/admin/reports/page.tsx
grep -q "XLSX.writeFile" src/app/admin/reports/page.tsx
grep -q "jsPDF" src/app/admin/reports/page.tsx
# Assert: All export patterns found

# Check chart component exists
grep -q "BarChart" src/app/admin/reports/page.tsx
grep -q "Recharts" src/app/admin/reports/page.tsx
# Assert: Chart component exists

pkill -f "npm run dev"
```

**Evidence to Capture**:
- [ ] `app/admin/reports/page.tsx` file content
- [ ] `package.json` showing recharts, xlsx, jspdf dependencies

**Commit**: YES
- Message: `feat(reports): implement dashboard with charts and Excel/PDF export`
- Files: `app/admin/reports/page.tsx`, `package.json`
- Pre-commit: `npm run build`

---

### [ ] 11. Electron + Next.js Integration

**What to do**:
1. Configure Next.js API to communicate with Electron bridge WebSocket
2. Add company selection to kiosk (localStorage)
3. Create login page for admin: `app/login/page.tsx`
4. Implement Supabase Auth for admin authentication
5. Connect Electron bridge to Next.js API for fingerprint verification
6. Test end-to-end flow: Electron bridge → Next.js API → Supabase → Kiosk UI

**Login Page** (`app/login/page.tsx`):
```typescript
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert('Login failed');
    } else {
      router.push('/admin');
    }
    setLoading(false);
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">E-Coupon Admin</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <a href="/kiosk" className="text-blue-500">Go to Kiosk</a>
        </div>
      </div>
    </div>
  );
}
```

**Update Electron Bridge** (add HTTP server for Next.js API):
```javascript
// electron-bridge/server.js
const express = require('express');
const app = express();

app.use(express.json());

app.post('/api/capture-fingerprint', async (req, res) => {
  try {
    const template = await fingerprintBridge.captureFingerprint();
    res.json({ template });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(8082, () => {
  console.log('HTTP server running on port 8082');
});
```

**Update Next.js API** (fallback to Electron bridge HTTP server):
```typescript
// app/api/verify-fingerprint/route.ts (updated)
export async function POST(request: NextRequest) {
  try {
    const { fingerprint_template, company_id } = await request.json();

    // If no template provided, capture from bridge
    let template = fingerprint_template;
    if (!template) {
      const response = await fetch('http://localhost:8082/api/capture-fingerprint', {
        method: 'POST'
      });
      const data = await response.json();
      template = data.template;
    }

    // Rest of verification logic...
  }
}
```

**Must NOT do**:
- Do NOT expose Electron bridge HTTP server to public (localhost only)
- Do NOT store admin credentials in client-side code (use Supabase Auth)
- Do NOT forget to handle authentication state (redirect if not logged in)
- Do NOT allow cross-origin requests from unauthorized origins

**Recommended Agent Profile**:
> Select category + skills based on task domain. Justify each choice.
- **Category**: `unspecified-high`
  - Reason: Integration across Electron bridge, Next.js API, and Supabase Auth
- **Skills**: [`git-master`]
  - `git-master`: For committing integration changes

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 4 (with Tasks 10, 12)
- **Blocks**: Task 12 (End-to-end testing)
- **Blocked By**: Task 5 (Electron bridge), Task 6 (API), Task 4 (RLS)

**References** (CRITICAL - Be Exhaustive):

> The executor has NO context from your interview. References are their ONLY guide.
> Each reference must answer: "What should I look at and WHY?"

**Supabase Auth References**:
- Supabase Auth Docs: `https://supabase.com/docs/guides/auth/auth-helpers/nextjs` - Next.js auth helpers
- Supabase signIn: `https://supabase.com/docs/reference/javascript/auth-signinwithpassword` - Auth method

**Next.js Routing References**:
- Next.js Router: `https://nextjs.org/docs/app/api-reference/functions/use-router` - useRouter hook
- Next.js Navigation: `https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating` - Navigation patterns

**Express Server References**:
- Express: `https://expressjs.com/en/4x/api.html` - Express server setup (for Electron bridge)

**WHY Each Reference Matters** (explain the relevance):
- Supabase Auth docs: Show exact pattern for `supabase.auth.signInWithPassword()`
- Next.js Router docs: Explain `router.push()` for navigation after login

**Acceptance Criteria**:

> **CRITICAL: AGENT-EXECUTABLE VERIFICATION ONLY**

**Note**: Full verification requires running Electron bridge and Next.js simultaneously.

**Automated Verification** (using Bash):
```bash
# Agent runs:
npm run dev &
sleep 10

# Check login page exists
curl -s http://localhost:3000/login | grep -q "Email"
curl -s http://localhost:3000/login | grep -q "Password"
# Assert: Login form exists

# Check auth helper usage
grep -q "supabase.auth.signInWithPassword" src/app/login/page.tsx
grep -q "useRouter" src/app/login/page.tsx
# Assert: Auth and router code exists

pkill -f "npm run dev"
```

**Evidence to Capture**:
- [ ] `app/login/page.tsx` file content
- [ ] `electron-bridge/server.js` file content

**Commit**: YES
- Message: `feat(integration): add admin login and Electron bridge HTTP server`
- Files: `app/login/page.tsx`, `electron-bridge/server.js`
- Pre-commit: `npm run build`

---

### [ ] 12. End-to-End Testing + Documentation

**What to do**:
1. Create test files for each major feature using Jest + React Testing Library
2. Create manual QA procedures document: `docs/MANUAL_QA.md`
3. Create deployment guide: `docs/DEPLOYMENT.md`
4. Create user guide for admin: `docs/ADMIN_GUIDE.md`
5. Create user guide for kiosk: `docs/KIOSK_GUIDE.md`
6. Run all tests and verify pass
7. Manual QA checklist execution
8. Update README with setup instructions

**Test File Example** (`__tests__/api/redeem.test.ts`):
```typescript
import { POST } from '@/app/api/redeem/route';

describe('/api/redeem', () => {
  it('should reject redemption without credit', async () => {
    const request = {
      json: async () => ({
        employee_id: 'test-id',
        meal_type: 'LUNCH'
      })
    } as any;

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBeDefined();
  });
});
```

**Manual QA Document** (`docs/MANUAL_QA.md`):
```markdown
# Manual QA Procedures

## Pre-Requisites
- Supabase project running locally
- Next.js dev server running
- Electron bridge running
- ZK9500 fingerprint scanner connected (for kiosk tests)

## Test Cases

### 1. Admin Authentication
- [ ] Navigate to `/login`
- [ ] Enter valid admin credentials
- [ ] Verify redirect to `/admin`
- [ ] Verify can access employee management

### 2. Employee CRUD
- [ ] Navigate to `/admin/employees`
- [ ] Click "Add Employee"
- [ ] Enter name and PIN
- [ ] Click "Save"
- [ ] Verify employee appears in list
- [ ] Click "Delete"
- [ ] Confirm deletion
- [ ] Verify employee removed from list

### 3. Kiosk Redemption (requires ZK9500)
- [ ] Navigate to `/kiosk/redeem`
- [ ] Ensure company_id set in localStorage
- [ ] Place finger on scanner
- [ ] Verify employee recognized
- [ ] Select meal type (Lunch)
- [ ] Click "Redeem"
- [ ] Verify success message
- [ ] Check database for transaction record

### 4. Reports Export
- [ ] Navigate to `/admin/reports`
- [ ] Select filter (daily/weekly/monthly/yearly)
- [ ] Click "Export Excel"
- [ ] Verify Excel file downloads
- [ ] Click "Export PDF"
- [ ] Verify PDF file downloads
- [ ] Open Excel file and verify data accuracy

### 5. Offline Mode
- [ ] Open DevTools → Network tab
- [ ] Set to "Offline"
- [ ] Create employee
- [ ] Verify offline indicator shows
- [ ] Set back to "Online"
- [ ] Verify employee synced to database
```

**Deployment Guide** (`docs/DEPLOYMENT.md`):
```markdown
# Deployment Guide

## Prerequisites
- Netlify account
- Supabase project (production)
- Windows machine for Electron bridge distribution

## Frontend Deployment (Next.js + PWA)

1. Build Next.js app:
```bash
npm run build
```

2. Deploy to Netlify:
```bash
npx netlify deploy --prod
```

3. Configure environment variables in Netlify:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

## Backend Deployment (Supabase)

1. Push database schema:
```bash
supabase db push --linked
```

2. Enable Row Level Security:
- Verify all RLS policies in Supabase dashboard
- Test with multiple admin users

## Desktop Bridge Deployment (Electron)

1. Build Electron app:
```bash
cd electron-bridge
npm run build
```

2. Distribute `.exe` installer to kiosk machines
3. Configure kiosk to autostart Electron bridge on boot

## Kiosk Setup

1. Install Electron bridge `.exe`
2. Launch bridge
3. Open browser to kiosk URL
4. Set company_id in browser console: `localStorage.setItem('company_id', 'uuid')`
5. Enable fullscreen mode (F11)
```

**Must NOT do**:
- Do NOT skip manual QA procedures (critical for hardware integration)
- Do NOT forget to document environment variables
- Do NOT deploy without testing RLS policies
- Do NOT distribute Electron bridge without testing on target OS

**Recommended Agent Profile**:
> Select category + skills based on task domain. Justify each choice.
- **Category**: `unspecified-high`
  - Reason: Comprehensive testing and documentation for production readiness
- **Skills**: [`git-master`]
  - `git-master`: For committing documentation and test files

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Sequential (final integration task)
- **Blocks**: None (final task)
- **Blocked By**: All previous tasks (1-11)

**References** (CRITICAL - Be Exhaustive):

> The executor has NO context from your interview. References are their ONLY guide.
> Each reference must answer: "What should I look at and WHY?"

**Testing References**:
- Jest Docs: `https://jestjs.io/docs/getting-started` - Jest testing framework
- React Testing Library: `https://testing-library.com/react` - Component testing
- Supabase Test Helpers: `https://supabase.com/docs/guides/database/testing` - Mocking Supabase

**Deployment References**:
- Netlify Docs: `https://docs.netlify.com/` - Netlify deployment
- Supabase Deploy: `https://supabase.com/docs/guides/cli/local-development#deploying` - Supabase CLI deployment
- Electron Builder: `https://www.electron.build/` - Electron app building and distribution

**WHY Each Reference Matters** (explain the relevance):
- Jest docs: Show pattern for `describe()` and `it()` test blocks
- React Testing Library docs: Explain `render()`, `screen.getByText()` for component testing
- Netlify docs: Provide steps for `netlify deploy --prod` command

**Acceptance Criteria**:

> **CRITICAL: AGENT-EXECUTABLE VERIFICATION ONLY**

**Automated Verification** (using Bash):
```bash
# Agent runs:
npm install --save-dev @testing-library/react @testing-library/jest-dom jest-environment-jsdom

# Run tests
npm test
# Assert: All tests pass (or at least test files exist)

# Check documentation files exist
ls -la docs/MANUAL_QA.md 2>&1
ls -la docs/DEPLOYMENT.md 2>&1
ls -la docs/ADMIN_GUIDE.md 2>&1
ls -la docs/KIOSK_GUIDE.md 2>&1
# Assert: All docs exist

# Check README has setup instructions
grep -q "Setup" README.md
grep -q "Prerequisites" README.md
# Assert: README contains setup guide
```

**Evidence to Capture**:
- [ ] Terminal output from `npm test` showing test results
- [ ] Documentation file contents (MANUAL_QA.md, DEPLOYMENT.md)
- [ ] README.md content

**Commit**: YES
- Message: `test(e2e): add tests and comprehensive documentation`
- Files: `__tests__/**/*`, `docs/*.md`, `README.md`
- Pre-commit: `npm test`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(database): create complete schema for e-coupon system` | supabase/schema.sql | supabase db reset |
| 2 | `feat(pwa): configure next-pwa with manifest and service worker` | next.config.js, public/manifest.json | npm run build |
| 3 | `feat(electron): initialize Electron bridge project with basic window` | electron-bridge/package.json, electron-bridge/main.js | cd electron-bridge && npm start |
| 4 | `feat(security): implement RLS policies for multi-tenant isolation` | supabase/migrations/001_enable_rls.sql | supabase db reset |
| 5 | `feat(electron): integrate ZK9500 SDK and WebSocket bridge` | electron-bridge/fingerprint.js, electron-bridge/sdk/ | cd electron-bridge && npm start |
| 6 | `feat(api): implement fingerprint verification and redemption endpoints` | lib/supabase.ts, app/api/verify-fingerprint/route.ts, app/api/redeem/route.ts | npm run build |
| 7 | `feat(ui): implement employee CRUD interface` | app/admin/employees/page.tsx, components/EmployeeForm.tsx | npm run build |
| 8 | `feat(ui): implement kiosk redemption interface with WebSocket client` | app/kiosk/redeem/page.tsx, app/kiosk/layout.tsx | npm run build |
| 9 | `feat(pwa): implement offline sync with IndexedDB` | lib/indexedDB.ts, lib/syncWorker.ts | npm run build |
| 10 | `feat(reports): implement dashboard with charts and Excel/PDF export` | app/admin/reports/page.tsx, package.json | npm run build |
| 11 | `feat(integration): add admin login and Electron bridge HTTP server` | app/login/page.tsx, electron-bridge/server.js | npm run build |
| 12 | `test(e2e): add tests and comprehensive documentation` | __tests__/**/*, docs/*.md, README.md | npm test |

---

## Success Criteria

### Verification Commands

**Database Setup**:
```bash
supabase db reset
# Expected: Database resets successfully with all tables

psql postgresql://postgres:postgres@localhost:54322/postgres -c "\dt"
# Expected: Shows 5 tables: companies, employees, meal_credits, transactions, daily_reports
```

**Next.js PWA**:
```bash
npm run build
# Expected: Build completes with no errors

npm run dev
# Expected: Dev server starts on http://localhost:3000
```

**Electron Bridge**:
```bash
cd electron-bridge && npm start
# Expected: Electron window opens, console shows "Fingerprint bridge running on ws://localhost:8081"
```

**API Endpoints**:
```bash
curl -X POST http://localhost:3000/api/verify-fingerprint \
  -H "Content-Type: application/json" \
  -d '{"fingerprint_template":"test","company_id":"uuid"}'
# Expected: Returns JSON with employee data or 404

curl -X POST http://localhost:3000/api/redeem \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"uuid","meal_type":"LUNCH"}'
# Expected: Returns JSON with transaction or validation error
```

**Tests**:
```bash
npm test
# Expected: All tests pass (or test files execute successfully)
```

### Final Checklist
- [ ] All database tables created with correct schema
- [ ] RLS policies enable multi-tenant isolation (tested with multiple companies)
- [ ] Electron bridge captures fingerprints and sends to WebSocket
- [ ] Next.js API validates fingerprints and processes redemptions
- [ ] Admin UI can create/edit/delete employees
- [ ] Admin UI can mark OT for employees
- [ ] Kiosk UI scans fingerprints and redeems meals
- [ ] Time window validation enforces meal availability
- [ ] Override workflow allows shopkeeper to bypass validation
- [ ] Reports dashboard shows transactions with filters
- [ ] Excel export downloads correct data
- [ ] PDF export generates formatted report
- [ ] PWA works offline with IndexedDB sync
- [ ] Service worker caches API and static assets
- [ ] All tests pass (manual + automated)
- [ ] Documentation complete (MANUAL_QA, DEPLOYMENT, guides)
- [ ] README has setup and deployment instructions
