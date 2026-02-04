# Deploying the E-Coupon System

This system uses a **Hybrid Architecture** because it requires access to local USB hardware (ZKTeco Fingerprint Scanner).

- **Frontend (Cloud)**: The Next.js web application is hosted on Netlify.
- **Backend (Cloud)**: The database is hosted on Supabase.
- **Hardware Bridge (Local)**: The Electron/Node.js bridge MUST run on the physical Kiosk machine.

---

## 🚀 1. Deploy Frontend (Netlify)

### A. Pre-requisites
1. Push your code to GitHub.
2. Sign in to Netlify.

### B. Setup Netlify Site
1. **New Site**: Click "Add new site" -> "Import from an existing project".
2. **Connect**: Select GitHub and choose your `FP-E-coupon` repository.
3. **Build Settings**:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `.next`
   - **Framework**: Next.js (Netlify should auto-detect this via `netlify.toml`).

### C. Environment Variables (Netlify)
Go to **Site Settings > Environment Variables** and add:

- `NEXT_PUBLIC_SUPABASE_URL`: (From your Supabase Project Settings > API)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (From your Supabase Project Settings > API)

*Note: You do not need the `ZK_` variables on Netlify, as the scanner is not attached to the Netlify server.*

---

## 🖥️ 2. Setup Local Kiosk Machine

This step must be done on the actual Windows machine that has the ZKTeco scanner connected.

### A. Install Drivers
1. Install the official ZKTeco drivers for your scanner (ZK9500).
2. Ensure the device appears in Windows Device Manager.

### B. Run the Bridge
1. Open Command Prompt on the Kiosk machine.
2. Navigate to the `electron-bridge` folder.
3. Install dependencies (first time only):
   ```bash
   npm install
   cd native
   npm install
   # If using Native Mode (Recommended):
   node-gyp rebuild
   cd ..
   ```
4. Start the bridge:
   ```bash
   # For Native Mode (Best Performance)
   set ZK_INTEGRATION_MODE=native
   npm start
   ```
   
   *The bridge will start a WebSocket server at `ws://localhost:8081`.*

---

## 🔗 3. Connecting Them

1. Open a browser on the **same Kiosk machine**.
2. Navigate to your deployed Netlify URL (e.g., `https://my-ecoupon-app.netlify.app/kiosk`).
3. The page will attempt to connect to `ws://localhost:8081`.
   - **Security Note**: If your browser blocks "Mixed Content" (connecting to insecure Localhost from secure HTTPS), you may need to allow insecure content for `localhost` or configure the bridge to use WSS (Advanced).
   - *Most modern browsers allow `localhost` connections even from HTTPS.*

---

## 🛠️ Troubleshooting Deployment

### "Employee not found" after scan
- Check your Supabase database. Ensure the `employees` table has data and the `fingerprint_template` matches.

### "Cannot connect to fingerprint scanner"
- Is the Electron Bridge running?
- Is the scanner connected via USB?
- Check the console window of the running bridge for errors.

### Build Fails on Netlify
- Check the "Build Log" on Netlify.
- Ensure you aren't trying to compile the C++ `native` folder on Netlify (the `netlify.toml` only builds the Next.js app).
