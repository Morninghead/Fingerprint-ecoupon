# PRD - ZK9500 Cafeteria Management System (Fingerprint-Based)

## ⚠️ MANDATORY: ALL AGENTS MUST READ THIS DOCUMENT BEFORE STARTING ANY WORK

---

## 📋 Project Status: **🚧 IN DEVELOPMENT**

**Start Date:** January 29, 2026
**Previous Platform:** ZK4500 (discontinued)
**Platform:** ZK9500 SDK
**Framework:** TBD (to be determined)

---

## 📌 Project Overview

### Purpose
Cafeteria coupon management system with biometric authentication using ZK9500 fingerprint scanners. Employees scan fingerprints to redeem meal coupons (Lunch/OT) with configurable quotas and cycle-based allocations.

### Platform Architecture (To Be Determined)
- **Biometrics:** ZK9500 SDK
- **Framework:** TBD (.NET 8.0 / .NET 9.0 / .NET Core 6.0?)
- **UI Framework:** TBD (Windows Forms / WPF / MAUI / Blazor?)
- **Database:** TBD (PostgreSQL / SQL Server / SQLite?)
- **ORM:** TBD (Dapper / Entity Framework / Other?)
- **Logging:** TBD (Serilog / Other?)

### Key Technologies (From ZK4500 - To Be Updated)
- **Biometrics:** ZK9500 SDK (migrate from ZK4500)
- **Database:** PostgreSQL with Dapper ORM (to be confirmed)
- **UI:** TBD (migrate from MetroFramework or choose new framework)
- **Localization:** TH/EN bilingual support
- **Cryptography:** AES-256 encryption

---

## 🏗️ Architecture (To Be Designed)

### Directory Structure (Proposal)
```
ZK9500/
├── src/
│   └── ZK9500/
│       ├── Models/           (Employee, EmployeeAllocation, CouponSetting, UsageHistory, AuditLog)
│       ├── Services/         (DatabaseService, FingerprintService, QueueService, CouponService, BackupService)
│       ├── Forms/            (MainForm, EmployeeManagementForm, ReportsForm, CouponSettingsForm, etc.)
│       ├── Utils/            (Logger, ErrorHandler, RetryPolicy, Encryption, LocalizationService)
│       └── Controls/         (ProgressDialog)
├── tests/                 (Unit tests, integration tests)
└── docs/                  (Documentation, PRDs, AGENTS.md)
```

---

## 🚀 Features (From ZK4500 - To Be Migrated)

### Core Features
- ✅ Fingerprint scanner management (dual scanner support)
- ✅ Employee registration and management
- ✅ Fingerprint enrollment with multi-sample verification
- ✅ Biometric authentication with threshold-based matching
- ✅ Coupon allocation management with cycle-based quotas
- ✅ Meal redemption (Lunch/OT) with quota enforcement
- ✅ Queue processing for fingerprint scans
- ✅ Real-time scanner status monitoring
- ✅ LED feedback (green/red) for scan success/failure
- ✅ Buzzer/Beep feedback for user feedback

### Database Features
- ✅ Employee CRUD operations
- ✅ Coupon allocation management
- ✅ Usage history tracking
- ✅ Audit logging
- ✅ Schema validation
- ✅ Migration system
- ✅ Daily/weekly reporting
- ✅ Backup and restore

### UI Features
- ✅ Main dashboard with real-time statistics
- ✅ Employee management form
- ✅ Coupon settings management
- ✅ Reports with date/type filters
- ✅ Meal selection dialog
- ✅ User display form for scan feedback
- ✅ Progress dialogs for long operations

### System Features
- ✅ Localization (TH/EN)
- ✅ Configuration management (appsettings.json)
- ✅ Structured logging (Serilog)
- ✅ Error handling and retry policies
- ✅ Input validation
- ✅ Encryption for sensitive data

---

## 📋 Development Tasks (To Be Created)

### Phase 1: Project Setup (Estimate: 4-8 hours)
- [ ] Decide on framework and UI technology
- [ ] Create project structure and solution
- [ ] Set up build configuration
- [ ] Configure dependencies (ZK9500 SDK, database drivers, etc.)
- [ ] Set up logging configuration
- [ ] Create initial database schema (migrate from ZK9500)

### Phase 2: Core Services (Estimate: 16-24 hours)
- [ ] Implement FingerprintService (migrate from ZK9500, update for ZK9500 SDK)
- [ ] Implement DatabaseService (migrate from ZK9500)
- [ ] Implement FingerprintMatcher (migrate from ZK9500)
- [ ] Implement CouponService (migrate from ZK9500)
- [ ] Implement QueueService (migrate from ZK9500)
- [ ] Implement CycleCalculator (migrate from ZK9500)
- [ ] Implement MigrationService (migrate from ZK9500)

### Phase 3: UI Development (Estimate: 24-32 hours)
- [ ] Implement MainForm (dashboard)
- [ ] Implement EmployeeManagementForm (CRUD)
- [ ] Implement CouponSettingsForm (settings management)
- [ ] Implement ReportsForm (reporting)
- [ ] Implement MealSelectionDialog (meal selection)
- [ ] Implement UserDisplayForm (scan feedback)
- [ ] Implement ProgressDialog (operations)

### Phase 4: Testing (Estimate: 8-12 hours)
- [ ] Create unit test project
- [ ] Write service tests
- [ ] Write integration tests
- [ ] Set up test database
- [ ] Configure CI/CD

### Phase 5: Documentation (Estimate: 4-8 hours)
- [ ] Write API documentation
- [ ] Write developer guide
- [ ] Write user manual
- [ ] Write deployment guide

---

## 🚨 Critical Decisions Needed

### Framework Selection
- [ ] **Option 1:** .NET 8.0 Windows Forms (continue from ZK9500)
- [ ] **Option 2:** .NET 8.0 WPF (modern Windows UI)
- [ ] **Option 3:** MAUI (cross-platform)
- [ ] **Option 4:** Blazor (web-based)
- [ ] **Option 5:** Other (specify)

### Database Selection
- [ ] **Option 1:** PostgreSQL (continue from ZK9500)
- [ ] **Option 2:** SQL Server (Enterprise)
- [ ] **Option 3:** SQLite (Lightweight, file-based)
- [ ] **Option 4:** Other (specify)

### UI Framework Selection
- [ ] **Option 1:** MetroFramework (continue from ZK9500, requires .NET 8 fixes)
- [ ] **Option 2:** WinForms 3.0 (built-in .NET 8)
- [ ] **Option 3:** WPF (modern, MVVM)
- [ ] **Option 4:** WinUI 3 (latest)
- [ ] **Option 5:** Other (specify)

---

## 📚 References

### ZK9500 Resources
- **ZK9500 SDK Documentation:** (To be added)
- **ZK9500 API Reference:** (To be added)
- **Sample Applications:** (To be added)

### Previous Platform (ZK9500)
- **ZK9500 PRD:** Historical reference (MIGRATION-NOTE.md)
- **ZK9500 AGENTS.md:** Historical reference (MIGRATION-NOTE.md)
- **ZK9500 todo.md:** Historical reference (MIGRATION-NOTE.md)
- **PRD-MD-Database.md:** Historical reference (MIGRATION-NOTE.md)

---

## 🚀 Getting Started

### Prerequisites
- [ ] ZK9500 SDK installed
- [ ] .NET SDK (version TBD)
- [ ] Database server (type TBD)
- [ ] IDE (Visual Studio 2022 / JetBrains Rider)

### Initial Setup
1. Decide on framework and database (see Critical Decisions above)
2. Create project structure
3. Add dependencies
4. Set up database connection
5. Migrate core services from ZK9500
6. Test fingerprint scanner integration
7. Implement UI
8. Test and deploy

---

## 📝 Notes

### Migration Notes
- Most features from ZK9500 should be ported
- Database schema can be reused (with minor updates)
- Service architecture can be reused
- UI needs to be redesigned based on chosen framework
- Fingerprint service needs to be updated for ZK9500 SDK

### Development Notes
- Follow existing code style from ZK9500
- Use async/await for all I/O operations
- Implement proper error handling and logging
- Add unit tests for all services
- Document all public APIs

---

**Last Updated:** January 29, 2026
**Next Review:** After framework and database decisions are made
