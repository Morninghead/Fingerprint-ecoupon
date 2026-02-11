# AGENTS.md - ZK9500 Project

## ⚠️ MANDATORY READ ORDER

**ALL AGENTS MUST:**
1. ✅ Read [PRD.md](./PRD.md) FIRST before any work
2. ✅ Read [todo.md](./todo.md) SECOND to check current progress
3. ✅ Update todo.md AFTER completing work with completion date

**Example Work Flow:**
```
1. Read PRD.md → Understand requirements
2. Read todo.md → Check current progress
3. Implement solution
4. Update todo.md with:
   - Start date
   - Completion date
   - Notes about implementation
   - Any blockers encountered
```

**Updating todo.md:**
```markdown
- [x] PRD-XXX: Item Title
  - **Started:** 2026-01-29 10:00
  - **Completed:** 2026-01-29 14:30
  - **Notes:** Completed successfully, tested and verified
  - **Blocked by:** None
```

---

## 📋 Project Status

**Platform:** ZK9500 SDK
**Start Date:** January 29, 2026
**Previous Platform:** ZK4500 (discontinued)
**Status:** 🚧 IN DEVELOPMENT

---

## 🔨 Build Commands

```bash
# Build project (ZK9500)
dotnet build

# Build for release (ZK9500)
dotnet build --configuration Release

# Clean build artifacts (ZK9500)
dotnet clean

# Run application (ZK9500)
dotnet run

# Run executable directly (after build)
src/ZK9500/bin/Debug/netX.X/ZK9500.exe
```

---

## 🧪 Testing

This project **will** have test projects configured.

```bash
# Run all tests
dotnet test

# Run a specific test project (example)
dotnet test --filter "FullyQualifiedName~DatabaseServiceTests"

# Run tests with verbose output
dotnet test --verbosity normal

# Run tests with coverage (if configured)
dotnet test --collect:"XPlat Code Coverage"
```

---

## 📝 Code Style Guidelines

### Imports and Using Directives

- Sort `using` directives alphabetically
- Separate system namespaces from project namespaces with a blank line
- Remove unused `using` directives

```csharp
using System;
using System.Threading.Tasks;
using Dapper;
using Npgsql;
using ZK9500.Models;
using ZK9500.Services;
using ZK9500.Utils;
```

### Naming Conventions

- **Classes:** PascalCase - `DatabaseService`, `EmployeeManagementForm`
- **Methods:** PascalCase public, camelCase private - `GetEmployeeByIdAsync()`, `showStatus()`
- **Properties:** PascalCase - `EmployeeCode`, `IsActive`
- **Fields:** camelCase with underscore - `_dbService`, `_fpService`
- **Constants:** PascalCase - `MaxQueueSize`, `ScanTimeoutSeconds`
- **Async Methods:** Suffix with `Async` - `CreateEmployeeAsync`
- **Event Handlers:** Prefix with `On` - `OnFingerprintCaptured`

### Formatting and Structure

- Use 4 spaces for indentation
- Place opening braces on new line (Allman style)
- Maximum line length: ~120 characters

```csharp
public async Task<bool> UpdateEmployeeAsync(Employee employee)
{
    try
    {
        employee.UpdatedAt = DateTime.Now;

        using var connection = _dataSource.CreateConnection();
        const string sql = @"
            UPDATE employees SET
                name_th = @NameTh,
                name_en = @NameEn
            WHERE id = @Id";

        var rows = await connection.ExecuteAsync(sql, employee);
        return rows > 0;
    }
    catch (Exception ex)
    {
        Logger.Error(ex, "Error updating employee: {Id}", employee.Id);
        return false;
    }
}
```

### Types and Nullability

- Nullable reference types enabled (`<Nullable>enable</Nullable>`)
- Use `?` for nullable value types - `DateTime?`, `int?`
- Use `string.Empty` instead of `""`
- Use `Guid.NewGuid()` for new GUIDs

```csharp
public DateTime? CreatedAt { get; set; }
public string Name { get; set; } = string.Empty;
public List<string> Templates { get; set; } = new List<string>();
```

### Error Handling

- Use `ServiceException` for known application errors
- Log errors with `Logger.Error(ex, message, args)`
- Use retry logic for transient errors
- Return default values on expected failures

```csharp
public async Task<Employee?> GetEmployeeByIdAsync(Guid id)
{
    try
    {
        using var connection = _dataSource.CreateConnection();
        const string sql = "SELECT * FROM employees WHERE id = @Id";
        return await connection.QueryFirstOrDefaultAsync<Employee>(sql, new { Id = id });
    }
    catch (Exception ex)
    {
        Logger.Error(ex, "Error getting employee by ID: {Id}", id);
        return null;
    }
}
```

**ServiceException Pattern:**
```csharp
throw ServiceException.EmployeeNotFound($"ID: {id}", ex);
throw ServiceException.QuotaExceeded("Lunch", remaining);
throw ServiceException.ValidationError("EmployeeCode", "Required field");
```

### Async/Await

- Use `async`/`await` for all I/O operations
- Avoid `.Result` and `.Wait()` - use `await` instead
- Use `ConfigureAwait(false)` for library code

### Logging

- `Logger.Information` for normal operations
- `Logger.Warning` for non-critical issues
- `Logger.Error(ex, ...)` for errors with exception
- Use structured logging with parameters

```csharp
Logger.Information("Database connected successfully");
Logger.Warning("Fingerprint not found on scanner {Id}", scannerId);
Logger.Error(ex, "Error creating employee: {Code}", employee.EmployeeCode);
```

### Database Access

- Use Dapper ORM via Npgsql
- Use parameterized queries
- Use `using` statements for connections and transactions
- Implement retry logic for transient errors

```csharp
await _retryPolicy.ExecuteAsync(async () =>
{
    using var connection = _dataSource.CreateConnection();
    using var transaction = await connection.BeginTransactionAsync();
    try
    {
        await transaction.CommitAsync();
    }
    catch
    {
        await transaction.RollbackAsync();
        throw;
    }
}, "OperationName").ConfigureAwait(false);
```

### Windows Forms / UI Framework (To Be Determined)

- Use dependency injection via constructor
- Invoke UI updates from background threads with `Invoke` and `InvokeRequired` check
- Unsubscribe from events in `OnFormClosing` or `Dispose`

```csharp
if (InvokeRequired)
{
    Invoke(new Action(() => UpdateUI(data)));
    return;
}
```

### Constants and Configuration

- Define constants in `Constants` class
- Group related constants in nested classes
- Use `appsettings.json` for configuration values

```csharp
public static class Constants
{
    public const int MaxQueueSize = 50;
    public const int ScanTimeoutSeconds = 30;
}
```

---

## 🚨 Common Pitfalls

### 1. Not Disposing Connections
```csharp
// ❌ WRONG - Connection leak
var connection = _dataSource.CreateConnection();
var result = await connection.QueryAsync<Employee>(sql);

// ✅ CORRECT - Using statement disposes connection
using var connection = _dataSource.CreateConnection();
var result = await connection.QueryAsync<Employee>(sql);
```

### 2. Forgetting to Rollback on Error
```csharp
// ❌ WRONG - Transaction left open on error
using var transaction = await connection.BeginTransactionAsync();
try
{
    await connection.ExecuteAsync(sql, transaction);
    await transaction.CommitAsync();
}
catch (Exception ex)
{
    // Missing rollback!
}

// ✅ CORRECT - Always rollback
using var transaction = await connection.BeginTransactionAsync();
try
{
    await connection.ExecuteAsync(sql, transaction);
    await transaction.CommitAsync();
}
catch
{
    await transaction.RollbackAsync();
    throw;
}
```

### 3. Not Handling Null Returns
```csharp
// ❌ WRONG - NullReferenceException
var employee = await _dbService.GetEmployeeByIdAsync(id);
Console.WriteLine(employee.Name);  // Crashes if null

// ✅ CORRECT - Check for null
var employee = await _dbService.GetEmployeeByIdAsync(id);
if (employee != null)
{
    Console.WriteLine(employee.Name);
}
```

### 4. Using .Result/.Wait() with Async Methods
```csharp
// ❌ WRONG - Deadlock risk
var employee = _dbService.GetEmployeeByIdAsync(id).Result;

// ✅ CORRECT - Use await
var employee = await _dbService.GetEmployeeByIdAsync(id);
```

---

## 🔗️ Related Services

### FingerprintService
Biometric scanner management and fingerprint operations.

### DatabaseService
Data access layer for all database operations.

### CouponService
Business logic for coupon allocation and quota management.

### QueueService
Background processing for fingerprint scans.

---

## 📚 Additional Resources

### Dapper Documentation
- https://dapper-tutorial.net/

### Npgsql Documentation
- https://www.npgsql.org/doc/

### Project Constants
See: `src/ZK9500/Utils/Constants.cs` for table names and messages.

### Model Definitions
See: `src/ZK9500/Models/` for `Employee`, `EmployeeAllocation`, `UsageHistory`, etc.

---

## 📝 Guidelines for New Features

When adding new features:

1. **Update PRD.md** with feature requirements
2. **Add item to todo.md** for tracking
3. **Follow code style guidelines**
4. **Add proper error handling**
5. **Write unit tests** (when test project is created)
6. **Update documentation**

### Example New Method Template

```csharp
/// <summary>
/// Brief description of what the method does
/// </summary>
/// <param name="param1">Description of param1</param>
/// <returns>Description of return value</returns>
public async Task<ReturnType> MethodNameAsync(ParamType param1)
{
    try
    {
        using var connection = _dataSource.CreateConnection();
        const string sql = @"
            SELECT * FROM table_name
            WHERE column = @Param1";

        var result = await connection.QueryAsync<ReturnType>(sql, new { Param1 = param1 });
        return result.ToList();
    }
    catch (Exception ex)
    {
        Logger.Error(ex, "Error description: {Param1}", param1);
        return new List<ReturnType>();  // Return default value
    }
}
```

---

**Last Updated:** January 29, 2026
**Next Review:** After framework and database decisions are made
