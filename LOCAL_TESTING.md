# 🧪 Local Testing Guide

## Step 1: Seed Database ✅ IN PROGRESS

**SQL to run:** Copy from `supabase/seed_production.sql`

**What it creates:**
- 1 Demo Company
- 5 Test Employees:
  - John Doe (PIN: 1001, template: mock_fingerprint_template_001)
  - Jane Smith (PIN: 1002, template: mock_fingerprint_template_002)  
  - Bob Wilson (PIN: 1003, template: mock_fingerprint_template_003)
  - Alice Johnson (PIN: 1004, template: mock_fingerprint_template_004)
  - Charlie Brown (PIN: 1005, template: mock_fingerprint_template_005)
- Meal credits for next 7 days

**Browser opened to:** https://supabase.com/dashboard/project/ojpiwbsxuocflmxxdpwb/sql/new

**Action:** After running SQL, press any key in the command prompt window.

---

## Step 2: Start Local Dev Server

```cmd
npm run dev
```

Server will start on: http://localhost:3000

---

## Step 3: Test Kiosk Flow

1. **Visit:** http://localhost:3000/kiosk
2. **Click:** "Scan Fingerprint"
3. **Expected:**
   - Mock template: `mock_fingerprint_template_001`
   - Matches: John Doe
   - Success message with meal redemption
   - Lunch deducted from daily credits

---

## Step 4: Verify in Admin

1. **Visit:** http://localhost:3000/admin/dashboard
2. **Check:** "Recent Redemptions" table
3. **Expected:** Entry for John Doe with lunch transaction

---

## Step 5: Test API Directly (Optional)

```powershell
# Test verify-fingerprint API
curl http://localhost:3000/api/verify-fingerprint `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"fingerprint_template":"mock_fingerprint_template_001","company_id":"c0000000-0000-0000-0000-000000000001"}'
```

---

## Success Criteria ✅

- [ ] Database seeded (5 employees visible)
- [ ] Kiosk scan works (finds John Doe)
- [ ] Meal redemption successful
- [ ] Transaction appears in admin
- [ ] No errors in browser console (except WebSocket - expected)

---

## Common Issues

**"Employee not found"**
- Database not seeded yet
- Wrong company_id in API call

**"Meal already redeemed"**
- Try scanning again (resets credits)
- Or scan different employee (template_002, etc.)

**API 404**
- Dev server not running
- Wrong port (should be 3000)

---

**Once local testing passes, we know the code is perfect!**
Then we can fix the Netlify deployment with confidence.
