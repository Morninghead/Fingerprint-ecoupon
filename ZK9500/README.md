# ZK9500 Cafeteria Management System

## 📋 Project Status: **🚧 IN DEVELOPMENT**

**Start Date:** January 29, 2026
**Previous Platform:** ZK4500 (discontinued)
**Current Platform:** ZK9500 SDK

---

## 📌 Overview

Cafeteria coupon management system with biometric authentication using ZK9500 fingerprint scanners. Employees scan fingerprints to redeem meal coupons (Lunch/OT) with configurable quotas and cycle-based allocations.

### Project Migration

This project is the successor to **ZK4500** platform. The ZK4500 project has been discontinued, and all development is now proceeding on ZK9500 platform.

**Migration Notes:**
- See [MIGRATION-NOTE.md](../ZK4500/MIGRATION-NOTE.md) for migration details
- ZK4500 project documents are retained for historical reference
- All features from ZK4500 will be ported to ZK9500

---

## 🚀 Quick Start

### Prerequisites

- [x] ZK9500 SDK (to be installed)
- [ ] .NET SDK (version TBD)
- [ ] Database server (type TBD)
- [ ] IDE (Visual Studio 2022 / JetBrains Rider)

### Initial Setup

1. **Decide on Framework and Database**
   - Review [PRD.md](./PRD.md) for options
   - Make decision on .NET version
   - Make decision on UI framework
   - Make decision on database platform

2. **Set Up Development Environment**
   ```bash
   # Clone repository
   git clone <repository-url>
   cd ZK9500

   # Create project structure
   mkdir -p src/ZK9500 tests docs

   # Create solution (when framework is decided)
   dotnet new sln -n ZK9500
   ```

3. **Install Dependencies**
   - Install ZK9500 SDK
   - Add NuGet packages (when project is created)
   - Configure appsettings.json

---

## 📂 Project Structure

```
ZK9500/
├── docs/                # Documentation
│   ├── PRD.md          # Product Requirements Document
│   ├── AGENTS.md       # Agent instructions
│   └── todo.md         # Progress tracking
├── src/                # Source code
│   └── ZK9500/        # Main application
│       ├── Models/        # Data models
│       ├── Services/      # Business logic
│       ├── Forms/         # UI components
│       ├── Utils/         # Utilities
│       └── Controls/      # Custom controls
└── tests/               # Test projects
    └── ZK9500.Tests/  # Unit & integration tests
```

---

## 📋 Key Features (To Be Implemented)

### Core Features
- Fingerprint scanner management
- Employee registration and management
- Fingerprint enrollment
- Biometric authentication
- Coupon allocation management
- Meal redemption (Lunch/OT)
- Queue processing
- Real-time scanner monitoring
- LED feedback
- Buzzer/Beep feedback

### Database Features
- Employee CRUD operations
- Coupon allocation management
- Usage history tracking
- Audit logging
- Migration system
- Daily/weekly reporting
- Backup and restore

### UI Features
- Main dashboard
- Employee management
- Coupon settings
- Reports
- Meal selection dialog
- User display form
- Progress dialogs

### System Features
- Localization (TH/EN)
- Configuration management
- Structured logging
- Error handling
- Input validation
- Encryption

---

## 🔨 Build Commands

```bash
# Build project
dotnet build

# Build for release
dotnet build --configuration Release

# Clean build artifacts
dotnet clean

# Run application
dotnet run

# Run tests
dotnet test
```

---

## 📚 Documentation

### For Developers
- [PRD.md](./docs/PRD.md) - Product Requirements Document
- [AGENTS.md](./docs/AGENTS.md) - Agent Instructions
- [todo.md](./docs/todo.md) - Progress Tracking

### For Historical Reference
- [ZK4500 MIGRATION-NOTE.md](../ZK4500/MIGRATION-NOTE.md) - Migration notes
- [ZK4500 PRD.MD](../ZK4500/PRD.MD) - Legacy requirements
- [ZK4500 AGENTS.md](../ZK4500/AGENTS.md) - Legacy instructions

---

## 🚨 Current Status

### Completed
- [x] Project migration planning
- [x] Documentation structure created
- [x] ZK4500 project marked as discontinued

### In Progress
- [ ] Framework selection
- [ ] Database selection
- [ ] Project initialization

### Next Steps
1. Decide on framework and database
2. Create project structure
3. Set up build system
4. Add dependencies
5. Migrate core services from ZK4500
6. Implement UI
7. Add tests
8. Write documentation

---

## 🤝 Contributing

When contributing to this project:

1. Read [PRD.md](./docs/PRD.md) first
2. Check [todo.md](./docs/todo.md) for current tasks
3. Follow [AGENTS.md](./docs/AGENTS.md) guidelines
4. Update todo.md with completion details
5. Write tests for new features
6. Document your changes

---

## 📞 Issues

For bugs, feature requests, or questions:

1. Check existing issues
2. Create new issue with:
   - Clear title
   - Detailed description
   - Steps to reproduce (if bug)
   - Expected behavior
   - Actual behavior
   - Screenshots (if applicable)

---

## 📝 License

[To be determined]

---

## 📞 Support

For support or questions:
- [To be added]

---

**Last Updated:** January 29, 2026
