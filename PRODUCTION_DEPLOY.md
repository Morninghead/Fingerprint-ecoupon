# 🚀 Production Deployment Checklist

**Project:** FP-E-Coupon System  
**Date:** 2026-02-05  
**Status:** Ready for Production Deploy

---

## ✅ Completed Steps

- [x] Supabase project created: `ojpiwbsxuocflmxxdpwb`
- [x] Database migrations applied (001, 002, 003)
- [x] Environment variables configured
- [x] Build tested successfully
- [x] Git repository connected: `Morninghead/Fingerprint-ecoupon`

---

## 📋 Deployment Steps

### Step 1: Push to GitHub ✅

Your code is already tracking `origin/main`. Ready to push.

```bash
git add .
git commit -m "Production-ready: Updated Supabase credentials and verified build"
git push origin main
```

---

### Step 2: Deploy to Netlify 🚀

#### A. Create New Site
1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub**
4. Select repository: **Morninghead/Fingerprint-ecoupon**
5. Configure build settings:
   - **Branch to deploy:** `main`
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`

#### B. Set Environment Variables
Go to **Site configuration** → **Environment variables** and add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ojpiwbsxuocflmxxdpwb.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_KEY` | `sb_publishable_jtrGs2PPWsvKqd5_BGzCXQ_gplKPAIL` |

#### C. Deploy
1. Click **"Deploy site"**
2. Wait for build to complete (~2-3 minutes)
3. Note your Netlify URL (e.g., `https://fingerprint-ecoupon.netlify.app`)

---

### Step 3: Seed Database with Initial Data 🌱

Run this SQL in your **Supabase SQL Editor**:

```sql
-- Insert test company
INSERT INTO companies (id, name, admin_id, lunch_price, ot_meal_price)
VALUES (
  gen_random_uuid(),
  'Test Company',
  NULL, -- You'll need to create an admin user via Supabase Auth
  45.00,
  60.00
);

-- Insert test employees (update company_id with actual UUID from above)
INSERT INTO employees (company_id, name, pin, fingerprint_template)
VALUES
  ('<COMPANY_UUID>', 'John Doe', '1001', 'mock_template_001'),
  ('<COMPANY_UUID>', 'Jane Smith', '1002', 'mock_template_002'),
  ('<COMPANY_UUID>', 'Bob Wilson', '1003', 'mock_template_003');

-- Create today's meal credits for testing
INSERT INTO meal_credits (employee_id, date, lunch_available, ot_meal_available)
SELECT id, CURRENT_DATE, TRUE, FALSE FROM employees;
```

---

### Step 4: Test Deployed Frontend ✅

1. Visit your Netlify URL
2. Test routes:
   - `/` - Home page
   - `/login` - Login page
   - `/kiosk` - Kiosk interface
   - `/admin/dashboard` - Admin panel

---

### Step 5: Setup Kiosk Machine (Hardware Bridge) 🖥️

**Only needed on the physical kiosk PC with ZK9500 scanner**

#### Install Prerequisites
1. Install **Node.js 16+**
2. Install **ZKTeco USB drivers** for ZK9500
3. Connect fingerprint scanner via USB

#### Build and Run Bridge
```bash
cd x:\FP-E-coupon\electron-bridge

# Install dependencies
npm install
cd native
npm install

# Build CLI (for testing)
build-cli.bat

# Start bridge
cd ..
set ZK_INTEGRATION_MODE=cli
npm start
```

#### Configure Kiosk Browser
1. Open browser on kiosk PC
2. Navigate to: `https://YOUR-NETLIFY-URL.netlify.app/kiosk`
3. Bridge connects via `ws://localhost:8081`

---

### Step 6: End-to-End Testing 🧪

Test the complete flow:

1. **Kiosk UI:** Visit `/kiosk` on deployed site
2. **Connection Check:** Verify WebSocket connects to local bridge
3. **Fingerprint Scan:** Click "Scan Fingerprint"
4. **Verification:** API `/api/verify-fingerprint` finds employee
5. **Redemption:** API `/api/redeem` processes meal credit
6. **Admin Panel:** Check transaction appears in `/admin/dashboard`

---

## 🔐 Production Hardening (Post-Launch)

### Security Enhancements
- [ ] Implement admin authentication (Supabase Auth)
- [ ] Add API rate limiting
- [ ] Enable HTTPS for WebSocket (WSS)
- [ ] Set up error monitoring (Sentry)

### Operational Setup
- [ ] Create auto-start script for Electron bridge on Windows boot
- [ ] Set up database backup schedule
- [ ] Document operational procedures
- [ ] Train staff on admin panel

---

## 📊 Deployment URLs

| Environment | URL |
|-------------|-----|
| **Production Frontend** | `https://YOUR-SITE.netlify.app` |
| **Supabase Dashboard** | `https://supabase.com/dashboard/project/ojpiwbsxuocflmxxdpwb` |
| **GitHub Repository** | `https://github.com/Morninghead/Fingerprint-ecoupon` |
| **Kiosk Bridge** | `ws://localhost:8081` (local only) |

---

## 🆘 Troubleshooting

### Build fails on Netlify
- Check build logs for missing env vars
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_KEY` are set

### Fingerprint scanner not working
- Ensure bridge is running on kiosk PC
- Check USB connection
- Verify drivers installed in Device Manager

### "Employee not found" after scan
- Check database has employee records with fingerprint_template
- Verify meal_credits exist for today's date
- Check company_id matches across tables

---

## ✅ Final Checklist

- [ ] Code pushed to GitHub
- [ ] Netlify site deployed
- [ ] Environment variables set on Netlify
- [ ] Database seeded with test data
- [ ] Test login flow works
- [ ] Kiosk bridge running on local PC
- [ ] End-to-end fingerprint → redemption tested
- [ ] Admin panel accessible

---

**Once all items are checked, the system is PRODUCTION READY! 🎉**
