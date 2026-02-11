# 🧪 E-Coupon System - Testing Checklist

**Date:** 2026-02-05  
**Mode:** Hybrid-Mock  
**Status:** Ready for Testing

---

## ✅ **Testing Checklist**

### **A. Kiosk Flow Testing (30 minutes)**

**Test URL:** `http://localhost:3000/kiosk`

- [ ] **Test 1: Successful Scan**
  - Click "Scan Fingerprint"
  - Wait 1-3 seconds
  - Verify employee name appears
  - Verify "Meal redeemed successfully!" message
  - Click "Scan Another"

- [ ] **Test 2: Multiple Employees**
  - Scan 5 times
  - Record which employees appear:
    - [ ] John Doe (PIN: 1001)
    - [ ] Jane Smith (PIN: 1002)
    - [ ] Bob Wilson (PIN: 1003)
    - [ ] Alice Johnson (PIN: 1004)
    - [ ] Charlie Brown (PIN: 1005)
  - Verify different employees selected randomly

- [ ] **Test 3: Duplicate Prevention**
  - Note which employee just scanned
  - Try scanning again immediately
  - Verify error: "Already redeemed lunch today"

- [ ] **Test 4: UI Responsiveness**
  - Test on different screen sizes
  - Verify mobile responsive design
  - Check button states (disabled during scan)

- [ ] **Test 5: Error Handling**
  - Stop the bridge (Ctrl+C in bridge terminal)
  - Try to scan
  - Verify graceful error handling
  - Restart bridge and test again

---

### **B. Admin Dashboard Testing (20 minutes)**

**Test URL:** `http://localhost:3000/admin/dashboard`

- [ ] **Test 1: Recent Redemptions**
  - Verify all scanned meals appear
  - Check employee names are correct
  - Verify timestamps are accurate
  - Verify meal types (LUNCH)

- [ ] **Test 2: Statistics**
  - Check "Today's Redemptions" count
  - Verify "Lunch Meals" total
  - Verify "OT Meals" total
  - Check "Total Cost" calculation (₿45 per lunch)

- [ ] **Test 3: Filter by Date**
  - Select different dates
  - Verify data updates correctly
  - Test date range selector

- [ ] **Test 4: Search**
  - Search by employee name
  - Search by PIN
  - Verify results filter correctly

---

### **C. Employee Management Testing (15 minutes)**

**Test URL:** `http://localhost:3000/admin/employees`

- [ ] **Test 1: View All Employees**
  - Verify 5 employees listed
  - Check all data displays correctly
  - Verify fingerprint template shown

- [ ] **Test 2: Add New Employee**
  - Click "Add Employee"
  - Fill in:
    - Name: "Test User"
    - PIN: "1006"
    - Template: "mock_fingerprint_template_006"
  - Submit
  - Verify employee added

- [ ] **Test 3: Edit Employee**
  - Click edit on Test User
  - Change name to "Test User Updated"
  - Save
  - Verify changes saved

- [ ] **Test 4: Delete Employee**
  - Delete "Test User Updated"
  - Verify removed from list

---

### **D. Reports Testing (10 minutes)**

**Test URL:** `http://localhost:3000/admin/reports`

- [ ] **Test 1: Daily Report**
  - Select today's date
  - Verify meal counts
  - Check cost calculations
  - Export to CSV (if implemented)

- [ ] **Test 2: Weekly Report**
  - Select this week
  - Verify totals
  - Check employee breakdown

- [ ] **Test 3: Monthly Report**
  - Select current month
  - Verify statistics
  - Check trends

---

### **E. Database Integrity (5 minutes)**

**Open Supabase Dashboard:**
https://supabase.com/dashboard/project/ojpiwbsxuocflmxxdpwb

- [ ] **Check Tables:**
  - `companies`: 1 row (Demo Company)
  - `employees`: 5+ rows
  - `meal_credits`: 35 rows (7 days × 5 employees)
  - `transactions`: Multiple rows (from testing)

- [ ] **Verify Data:**
  - No NULL values where not expected
  - Timestamps are correct
  - Relationships intact (foreign keys)

---

## 📊 **Test Results Summary**

### **Pass Criteria:**
- ✅ All kiosk scans work
- ✅ Admin dashboard shows data
- ✅ Duplicate prevention works
- ✅ No console errors
- ✅ Database data is consistent

### **Issues Found:**

| Issue # | Description | Severity | Status |
|---------|-------------|----------|--------|
| 1       |             |          |        |
| 2       |             |          |        |

---

## ✅ **Sign-off**

- [ ] All tests passed
- [ ] Issues documented
- [ ] Ready for demo/deployment

**Tested by:** _________________  
**Date:** _________________  
**Time:** _________________

---

## 🎯 **Next Steps After Testing:**

1. ✅ If all tests pass → Proceed to deployment
2. ⚠️ If issues found → Fix and retest
3. 📧 If critical bugs → Report and prioritize
