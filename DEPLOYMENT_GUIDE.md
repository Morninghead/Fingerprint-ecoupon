# 🚀 E-Coupon System - Deployment Guide

**Date:** 2026-02-05  
**Status:** Ready for Production

---

## 📋 **Deployment Options**

### **Option A: Deploy to Vercel** ⭐ **RECOMMENDED**

**Why Vercel:**
- ✅ Best Next.js support (made by same team)
- ✅ Free tier available
- ✅ Automatic deployments from Git
- ✅ Built-in CDN
- ✅ Zero configuration

**Steps:**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
cd x:\FP-E-coupon
vercel --prod

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? [Your account]
# - Link to existing project? N
# - Project name? fingerprint-ecoupon
# - Directory? ./
# - Override settings? N
```

**Time:** 5 minutes  
**Cost:** FREE (Hobby plan)  
**URL:** `https://fingerprint-ecoupon.vercel.app`

---

### **Option B: Stay on Netlify**

**Current status:** Deployed but API routes have issues

**Fix attempt:**

```bash
# 1. Install Netlify plugin
npm install @netlify/plugin-nextjs

# 2. Commit changes
git add -A
git commit -m "Add Netlify Next.js plugin"
git push origin main

# 3. Wait for auto-deploy (~2 min)
# 4. Test: https://fingerprint-ecoupon.netlify.app/api/health
```

**Time:** 5 minutes  
**Cost:** FREE  
**Risk:** May still have API issues

---

### **Option C: Local Only (Kiosk PC)**

**Best for:**
- Testing before public deployment
- Offline/internal-only use
- Maximum security (no internet exposure)

**Steps:**

1. **Keep dev server running on kiosk PC**
   ```cmd
   cd x:\FP-E-coupon
   npm run dev
   ```

2. **Access from other devices on LAN:**
   - Find PC IP: `ipconfig`
   - Access: `http://192.168.X.X:3000/kiosk`

3. **Set to auto-start on boot:**
   ```cmd
   # Create Windows Task Scheduler task
   # Or use PM2 to manage Node.js process
   npm install -g pm2
   pm2 start npm --name "ecoupon" -- run dev
   pm2 startup
   pm2 save
   ```

**Time:** 10 minutes  
**Cost:** FREE  
**URL:** `http://localhost:3000` or LAN IP

---

## 🎯 **Recommended Deployment Strategy**

### **Immediate (TODAY):**
1. ✅ **Deploy to Vercel**
   - Get public URL for demos
   - Share with stakeholders
   - Test from any device

2. ✅ **Keep local version**
   - For kiosk use
   - Backup if internet fails
   - Hardware testing ready

### **Long-term (NEXT WEEK):**
1. **Decide on primary platform**
   - Cloud (Vercel) = easier management
   - Local (Kiosk PC) = more security

2. **Set up backup/redundancy**
   - Cloud backup if using local
   - Local backup if using cloud

---

## 🔧 **Post-Deployment Configuration**

### **Update Environment Variables**

**For Vercel:**
```bash
# In Vercel dashboard:
# Settings → Environment Variables

NEXT_PUBLIC_SUPABASE_URL=https://ojpiwbsxuocflmxxdpwb.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Verify:**
- Visit: `https://[your-vercel-url]/api/health`
- Should see: `{"status":"ok"}`

---

## ✅ **Deployment Checklist**

- [ ] Code committed to Git
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] Seed data loaded
- [ ] Deployed to platform
- [ ] Health check passes
- [ ] Kiosk page loads
- [ ] Admin panel accessible
- [ ] Test transaction successful

---

## 🎊 **Success Criteria**

**Your deployment is successful when:**

1. ✅ URL is publicly accessible
2. ✅ Kiosk can scan and redeem
3. ✅ Admin can view transactions
4. ✅ No console errors
5. ✅ Database updates in real-time

---

## 📞 **Support**

**If deployment fails:**
1. Check build logs
2. Verify environment variables
3. Test API routes individually
4. Review CORS settings
5. Check Supabase connection

---

**Ready to deploy? Start with Option A (Vercel) - it's the fastest and most reliable!**
