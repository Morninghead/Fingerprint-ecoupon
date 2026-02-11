using System;
using System.Collections.Generic;
using System.Data.OleDb;
using System.Drawing;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using System.Windows.Forms;
using Newtonsoft.Json.Linq;

namespace FpTest
{
    public class MainForm : Form
    {
        // ZK9500 ActiveX control
        private dynamic zkfp;
        private int fpcHandle;
        private bool isScanning = false;
        private Timer scanTimer;
        
        // Template storage for 1:1 matching
        private List<TemplateInfo> templates = new List<TemplateInfo>();
        
        // Employee data
        private Dictionary<int, EmployeeInfo> employees = new Dictionary<int, EmployeeInfo>();
        private int templateCount = 0;
        
        // UI Controls
        private Panel pnlHeader;
        private Panel pnlMain;
        private Panel pnlResult;
        private Panel pnlStatus;
        private Panel pnlLog;
        
        private Label lblTitle;
        private Label lblStatus;
        private Label lblTemplateCount;
        private Label lblResultTitle;
        private Label lblEmployeeCode;
        private Label lblEmployeeName;
        private Label lblFingerInfo;
        private Label lblMatchScore;
        private PictureBox picFinger;
        private TextBox txtLog;
        
        private Button btnInit;
        private Button btnLoadTemplates;
        private Button btnLoadFromSupabase;
        private Button btnLoadFromMDB;
        private Button btnLoadFromDevice;
        private Button btnEnroll;
        private Button btnStartScan;
        private Button btnStopScan;
        private Button btnSync;
        
        // Progress bar
        private ProgressBar progressBar;
        private Label lblProgress;
        
        // Sync service
        private ZKTecoSyncService syncService;
        
        // Colors
        private Color primaryColor = Color.FromArgb(41, 128, 185);
        private Color successColor = Color.FromArgb(39, 174, 96);
        private Color dangerColor = Color.FromArgb(231, 76, 60);
        private Color darkColor = Color.FromArgb(44, 62, 80);
        private Color lightColor = Color.FromArgb(236, 240, 241);
        
        // Supabase config
        private const string SUPABASE_URL = "https://ojpiwbsxuocflmxxdpwb.supabase.co";
        private string supabaseKey = "";
        private string cacheFilePath;
        private SupabaseClient supabase;
        private Label lblCreditStatus;
        
        // MDB Templates for manual 1:N matching (bypass FPCacheDB)
        private Dictionary<int, byte[]> mdbTemplates = new Dictionary<int, byte[]>(); // cacheId -> template bytes
        
        // Duplicate scan prevention - ใช้ cacheId + score เป็น key
        private int lastMatchedId = -1;
        private int scanDebugCount = 0;
        private int lastMatchScore = -1;
        private DateTime lastMatchTime = DateTime.MinValue;
        private const int SAME_PERSON_COOLDOWN_SECONDS = 60; // ป้องกัน scan ซ้ำคนเดิมภายใน 60 วินาที
        
        public MainForm()
        {
            cacheFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "templates_cache.json");
            LoadConfig();
            InitializeUI();
            
            // Initialize Supabase client
            if (!string.IsNullOrEmpty(supabaseKey))
            {
                supabase = new SupabaseClient(SUPABASE_URL, supabaseKey);
                
                // Initialize sync service with ZKTeco devices (192.168.0.x subnet)
                syncService = new ZKTecoSyncService(SUPABASE_URL, supabaseKey);
                syncService.AddDevice("SSTH-1", "192.168.0.151");
                syncService.AddDevice("SSTH-2", "192.168.0.152");
                syncService.AddDevice("Haoli", "192.168.0.153");
                syncService.AddDevice("PPS", "192.168.0.154");
            }
            
            // Auto-start on form load
            this.Load += MainForm_Load;
        }
        
        private async void MainForm_Load(object sender, EventArgs e)
        {
            Log("🚀 เริ่มต้นระบบอัตโนมัติ...");
            
            // Step 1: Auto-connect hardware (ทำก่อน - ไม่ต้องรอ sync)
            await Task.Delay(200); // Wait for UI to render
            Log("🔌 กำลังเชื่อมต่อ Scanner...");
            BtnInit_Click(sender, e);
            
            // Step 2: Sync attendance ใน background (ไม่ block startup)
            // DISABLED: ปิดการ sync จากเครื่อง ZKTeco ชั่วคราว
            if (false && syncService != null)
            {
                _ = Task.Run(async () => {
                    try
                    {
                        var result = await syncService.SyncAllDevicesAsync(msg => 
                            this.Invoke((Action)(() => Log(msg))));
                        if (result.NewRecords > 0)
                            this.Invoke((Action)(() => Log($"🎉 Sync เสร็จ! +{result.NewRecords} records")));
                    }
                    catch { /* devices อาจไม่พร้อม - ไม่เป็นไร */ }
                });
            }
            
            // Step 3: Auto-load templates (if connected)
            if (btnLoadTemplates.Enabled)
            {
                await Task.Delay(300);
                Log("📂 กำลังโหลด Templates...");
                BtnLoadTemplates_Click(sender, e);
                
                // Step 4: Auto-start scanning (always on)
                await Task.Delay(500);
                if (btnStartScan.Enabled && templateCount > 0)
                {
                    Log("🟢 เริ่มสแกนอัตโนมัติ...");
                    BtnStartScan_Click(sender, e);
                }
            }
        }
        
        private void LoadConfig()
        {
            try
            {
                string envPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", ".env.local");
                if (File.Exists(envPath))
                {
                    foreach (var line in File.ReadAllLines(envPath))
                    {
                        if (line.StartsWith("NEXT_PUBLIC_SUPABASE_KEY="))
                            supabaseKey = line.Split('=')[1].Trim();
                    }
                }
                
                if (string.IsNullOrEmpty(supabaseKey))
                {
                    envPath = @"X:\FP-E-coupon\.env.local";
                    if (File.Exists(envPath))
                    {
                        foreach (var line in File.ReadAllLines(envPath))
                        {
                            if (line.StartsWith("NEXT_PUBLIC_SUPABASE_KEY="))
                                supabaseKey = line.Split('=')[1].Trim();
                        }
                    }
                }
            }
            catch { }
        }
        
        private void InitializeUI()
        {
            this.Text = "🍽 Cafeteria E-Coupon";
            this.Size = new Size(920, 890);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = lightColor;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            
            // Header Panel - Gradient effect with premium colors
            pnlHeader = new Panel { Dock = DockStyle.Top, Height = 80, BackColor = Color.FromArgb(46, 134, 193) };
            lblTitle = new Label
            {
                Text = "🍽 Cafeteria E-Coupon",
                Font = new Font("Segoe UI", 28, FontStyle.Bold),
                ForeColor = Color.White,
                AutoSize = true,
                Location = new Point(20, 18)
            };
            pnlHeader.Controls.Add(lblTitle);
            
            // Status Panel - ขยาย height เพื่อใส่ปุ่มครบ 3 แถว
            pnlStatus = new Panel { Location = new Point(20, 100), Size = new Size(420, 230), BackColor = Color.White };
            
            lblStatus = new Label
            {
                Text = "⚪ ยังไม่ได้เชื่อมต่อ Scanner",
                Font = new Font("Segoe UI", 14),
                ForeColor = darkColor,
                Location = new Point(20, 15),
                AutoSize = true
            };
            pnlStatus.Controls.Add(lblStatus);
            
            lblTemplateCount = new Label
            {
                Text = "📁 Templates: 0",
                Font = new Font("Segoe UI", 11),
                ForeColor = Color.Gray,
                Location = new Point(20, 45),
                AutoSize = true
            };
            pnlStatus.Controls.Add(lblTemplateCount);
            
            // === แถว 1: Connection + Load ===
            btnInit = CreateButton("🔌 Scanner", 20, 75, primaryColor);
            btnInit.Width = 95;
            btnInit.Click += BtnInit_Click;
            pnlStatus.Controls.Add(btnInit);
            
            btnLoadTemplates = CreateButton("📂 Cache", 120, 75, primaryColor);
            btnLoadTemplates.Width = 90;
            btnLoadTemplates.Click += BtnLoadTemplates_Click;
            btnLoadTemplates.Enabled = false;
            pnlStatus.Controls.Add(btnLoadTemplates);
            
            btnLoadFromSupabase = CreateButton("🌐 Supabase", 215, 75, Color.FromArgb(52, 152, 219));
            btnLoadFromSupabase.Width = 95;
            btnLoadFromSupabase.Click += BtnLoadFromSupabase_Click;
            btnLoadFromSupabase.Enabled = false;
            pnlStatus.Controls.Add(btnLoadFromSupabase);
            
            btnLoadFromMDB = CreateButton("📁 MDB", 315, 75, Color.FromArgb(142, 68, 173));
            btnLoadFromMDB.Width = 85;
            btnLoadFromMDB.Click += BtnLoadFromMDB_Click;
            btnLoadFromMDB.Enabled = false;
            pnlStatus.Controls.Add(btnLoadFromMDB);
            
            // === แถว 2: Sync + ZKTime ===
            btnSync = CreateButton("🔄 Sync Attendance", 20, 110, Color.FromArgb(22, 160, 133));
            btnSync.Width = 145;
            btnSync.Click += BtnSync_Click;
            pnlStatus.Controls.Add(btnSync);
            
            btnLoadFromDevice = CreateButton("⚡ โหลด ZKTime", 170, 110, Color.FromArgb(41, 128, 185));
            btnLoadFromDevice.Width = 130;
            btnLoadFromDevice.Click += BtnLoadZKTimeMDB_Click;
            pnlStatus.Controls.Add(btnLoadFromDevice);
            
            // === แถว 3: Progress bar ===
            progressBar = new ProgressBar
            {
                Location = new Point(20, 150),
                Size = new Size(280, 25),
                Style = ProgressBarStyle.Continuous,
                Visible = false
            };
            pnlStatus.Controls.Add(progressBar);
            
            lblProgress = new Label
            {
                Location = new Point(310, 153),
                Size = new Size(100, 20),
                Text = "",
                ForeColor = primaryColor,
                Font = new Font("Segoe UI", 9, FontStyle.Bold),
                Visible = false
            };
            pnlStatus.Controls.Add(lblProgress);
            
            // Main Panel (fingerprint image)
            pnlMain = new Panel { Location = new Point(460, 100), Size = new Size(400, 400), BackColor = Color.White };
            picFinger = new PictureBox
            {
                Size = new Size(280, 380),
                Location = new Point(60, 10),
                SizeMode = PictureBoxSizeMode.Zoom,
                BackColor = Color.FromArgb(245, 245, 245)
            };
            pnlMain.Controls.Add(picFinger);
            
            // Result Panel - ปรับตำแหน่งลงตาม pnlStatus ที่สูงขึ้น
            pnlResult = new Panel { Location = new Point(20, 340), Size = new Size(420, 200), BackColor = Color.White };
            
            lblResultTitle = new Label
            {
                Text = "📋 ผลการยืนยันตัวตน",
                Font = new Font("Segoe UI", 14, FontStyle.Bold),
                ForeColor = darkColor,
                Location = new Point(20, 15),
                AutoSize = true
            };
            pnlResult.Controls.Add(lblResultTitle);
            
            lblEmployeeCode = new Label { Text = "รหัสพนักงาน: -", Font = new Font("Segoe UI", 12), ForeColor = darkColor, Location = new Point(20, 50), AutoSize = true };
            lblEmployeeName = new Label { Text = "ชื่อ: -", Font = new Font("Segoe UI", 12), ForeColor = darkColor, Location = new Point(20, 80), AutoSize = true };
            lblFingerInfo = new Label { Text = "นิ้ว: -", Font = new Font("Segoe UI", 11), ForeColor = Color.Gray, Location = new Point(20, 110), AutoSize = true };
            lblMatchScore = new Label { Text = "คะแนน: -", Font = new Font("Segoe UI", 11), ForeColor = Color.Gray, Location = new Point(200, 50), AutoSize = true };
            lblCreditStatus = new Label { Text = "💳 Credit: -", Font = new Font("Segoe UI", 11, FontStyle.Bold), ForeColor = primaryColor, Location = new Point(20, 140), Size = new Size(380, 25) };
            
            pnlResult.Controls.Add(lblEmployeeCode);
            pnlResult.Controls.Add(lblEmployeeName);
            pnlResult.Controls.Add(lblFingerInfo);
            pnlResult.Controls.Add(lblMatchScore);
            pnlResult.Controls.Add(lblCreditStatus);
            
            btnStartScan = CreateButton("🟢 เริ่มสแกน", 20, 165, successColor);
            btnStartScan.Click += BtnStartScan_Click;
            btnStartScan.Enabled = false;
            pnlResult.Controls.Add(btnStartScan);
            
            btnStopScan = CreateButton("🔴 หยุดสแกน", 160, 165, dangerColor);
            btnStopScan.Click += BtnStopScan_Click;
            btnStopScan.Enabled = false;
            pnlResult.Controls.Add(btnStopScan);
            
            btnEnroll = CreateButton("📝 ลงทะเบียนใหม่", 300, 165, Color.FromArgb(155, 89, 182));
            btnEnroll.Width = 115;
            btnEnroll.Click += BtnEnroll_Click;
            btnEnroll.Enabled = false;
            pnlResult.Controls.Add(btnEnroll);
            
            // Log Panel - ปรับตำแหน่งให้เหมาะกับ layout ใหม่
            pnlLog = new Panel { Location = new Point(20, 550), Size = new Size(860, 250), BackColor = Color.White };
            
            var lblLogTitle = new Label
            {
                Text = "📜 Log",
                Font = new Font("Segoe UI", 12, FontStyle.Bold),
                ForeColor = darkColor,
                Location = new Point(10, 10),
                AutoSize = true
            };
            pnlLog.Controls.Add(lblLogTitle);
            
            txtLog = new TextBox
            {
                Location = new Point(10, 35),
                Size = new Size(820, 235),
                Font = new Font("Consolas", 9),
                BorderStyle = BorderStyle.None,
                BackColor = Color.FromArgb(250, 250, 250),
                Multiline = true,
                ScrollBars = ScrollBars.Vertical,
                ReadOnly = true
            };
            pnlLog.Controls.Add(txtLog);
            
            this.Controls.Add(pnlHeader);
            this.Controls.Add(pnlStatus);
            this.Controls.Add(pnlMain);
            this.Controls.Add(pnlResult);
            this.Controls.Add(pnlLog);
        }
        
        private Button CreateButton(string text, int x, int y, Color color)
        {
            var btn = new Button
            {
                Text = text,
                Location = new Point(x, y),
                Size = new Size(130, 30),
                FlatStyle = FlatStyle.Flat,
                BackColor = color,
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 9),
                Cursor = Cursors.Hand
            };
            btn.FlatAppearance.BorderSize = 0;
            return btn;
        }
        
        private void Log(string message)
        {
            if (txtLog.InvokeRequired)
            {
                txtLog.Invoke(new Action(() => Log(message)));
                return;
            }
            var logLine = $"[{DateTime.Now:HH:mm:ss}] {message}{Environment.NewLine}";
            txtLog.AppendText(logLine);
            txtLog.SelectionStart = txtLog.TextLength;
            txtLog.ScrollToCaret();
        }
        
        private void UpdateStatus(string text, Color color)
        {
            if (lblStatus.InvokeRequired)
            {
                lblStatus.Invoke(new Action(() => UpdateStatus(text, color)));
                return;
            }
            lblStatus.Text = text;
            lblStatus.ForeColor = color;
        }
        
        #region Device Connection
        
        private async void BtnInit_Click(object sender, EventArgs e)
        {
            btnInit.Enabled = false;
            btnInit.Text = "⏳ กำลังเชื่อมต่อ...";
            
            try
            {
                Log("🔌 กำลังเชื่อมต่อ Scanner...");
                
                Type zkType = Type.GetTypeFromProgID("ZKFPEngXControl.ZKFPEngX");
                if (zkType == null)
                {
                    MessageBox.Show("ไม่พบ ZK9500 SDK!\nกรุณาติดตั้ง ZKFinger SDK ก่อน", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }
                
                zkfp = Activator.CreateInstance(zkType);
                zkfp.FakeFunOn = 1;
                
                if (zkfp.InitEngine() == 0)
                {
                    // Use version 10 to match stored templates (TEMPLATE4 with DivisionFP=10)
                    zkfp.FPEngineVersion = "10";
                    fpcHandle = zkfp.CreateFPCacheDB();
                    
                    string sn = zkfp.SensorSN;
                    UpdateStatus($"🟢 เชื่อมต่อแล้ว (SN: {sn})", successColor);
                    
                    btnInit.Enabled = false;
                    btnLoadTemplates.Enabled = true;
                    btnLoadFromSupabase.Enabled = true;
                    btnLoadFromMDB.Enabled = true;
                    btnEnroll.Enabled = true;
                    btnStartScan.Enabled = true;
                    
                    Log($"✅ เชื่อมต่อสำเร็จ - SN: {sn}");
                    Log($"   FPCacheDB Handle: {fpcHandle} ({(fpcHandle > 0 ? "OK" : "❌ FAILED!")})");
                }
                else
                {
                    throw new Exception("InitEngine failed");
                }
            }
            catch (Exception ex)
            {
                Log($"❌ {ex.Message}");
                UpdateStatus("🔴 เชื่อมต่อไม่ได้", dangerColor);
                btnInit.Enabled = true;
                btnInit.Text = "🔌 เชื่อมต่อ Scanner";
            }
        }
        
        #endregion
        
        #region Enrollment
        
        private void BtnEnroll_Click(object sender, EventArgs e)
        {
            // Stop scanning if active
            if (isScanning)
            {
                isScanning = false;
                scanTimer?.Stop();
            }
            
            Log("📝 เปิดหน้าลงทะเบียน...");
            
            using (var enrollForm = new EnrollForm(zkfp, fpcHandle))
            {
                enrollForm.ShowDialog(this);
                
                if (enrollForm.EnrollmentSuccess)
                {
                    Log($"✅ ลงทะเบียนสำเร็จ: {enrollForm.EmployeeCode} - {enrollForm.EmployeeName}");
                    Log($"   Templates: {enrollForm.RegisteredTemplates.Count}");
                    
                    // Add to local employee list
                    int empCode = 0;
                    int.TryParse(enrollForm.EmployeeCode, out empCode);
                    if (!employees.ContainsKey(empCode))
                    {
                        employees[empCode] = new EmployeeInfo
                        {
                            MdbUserId = empCode,
                            EmployeeCode = enrollForm.EmployeeCode,
                            Name = enrollForm.EmployeeName,
                            FingerCount = enrollForm.RegisteredTemplates.Count
                        };
                    }
                    
                    templateCount += enrollForm.RegisteredTemplates.Count;
                    lblTemplateCount.Text = $"📁 Templates: {templateCount}";
                    
                    MessageBox.Show($"ลงทะเบียนสำเร็จ!\n\nกรุณาทดสอบสแกนลายนิ้วมือ", "สำเร็จ", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
            }
        }
        
        #endregion
        
        #region Sync Attendance
        
        private async void BtnSync_Click(object sender, EventArgs e)
        {
            if (syncService == null)
            {
                Log("⚠️ Sync service ไม่พร้อม - ตรวจสอบ Supabase config");
                return;
            }
            
            btnSync.Enabled = false;
            btnSync.Text = "⏳ กำลัง Sync...";
            Log("🔄 เริ่ม Sync attendance จาก ZKTeco devices...");
            
            try
            {
                var result = await Task.Run(() => syncService.SyncAllDevicesAsync(msg => 
                {
                    this.Invoke((Action)(() => Log(msg)));
                }));
                
                Log($"✅ Sync เสร็จสิ้น: {result.DevicesSynced} devices, {result.NewRecords} รายการใหม่");
                
                if (result.NewRecords > 0)
                {
                    MessageBox.Show($"Sync สำเร็จ!\n\n" +
                        $"Devices: {result.DevicesSynced}\n" +
                        $"รายการใหม่: {result.NewRecords}\n" +
                        $"Meal credits จะถูกสร้างอัตโนมัติ", 
                        "Sync Complete", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
            }
            catch (Exception ex)
            {
                Log($"❌ Sync error: {ex.Message}");
            }
            finally
            {
                btnSync.Enabled = true;
                btnSync.Text = "🔄 Sync Attendance";
            }
        }
        
        #endregion
        
        #region Template Loading
        
        private async void BtnLoadTemplates_Click(object sender, EventArgs e)
        {
            btnLoadTemplates.Enabled = false;
            btnLoadTemplates.Text = "⏳ กำลังโหลด...";
            Log("📂 กำลังโหลด templates...");
            
            try
            {
                if (File.Exists(cacheFilePath))
                {
                    Log("📂 พบ cache file - กำลังโหลด...");
                    await LoadTemplatesFromCache();
                }
                else
                {
                    Log("🌐 ไม่พบ cache - กำลังโหลดจาก Supabase...");
                    await LoadTemplatesFromSupabase();
                }
                
                lblTemplateCount.Text = $"📁 Templates: {templateCount} ({employees.Count} คน)";
                btnStartScan.Enabled = true;
                btnLoadTemplates.Text = "✅ โหลดแล้ว";
            }
            catch (Exception ex)
            {
                Log($"❌ {ex.Message}");
                btnLoadTemplates.Enabled = true;
                btnLoadTemplates.Text = "📂 โหลด Templates";
            }
        }
        
        private async void BtnLoadFromSupabase_Click(object sender, EventArgs e)
        {
            btnLoadFromSupabase.Enabled = false;
            btnLoadFromSupabase.Text = "⏳ กำลังโหลด...";
            Log("🌐 กำลังโหลด templates จาก Supabase...");
            
            try
            {
                templates.Clear();
                employees.Clear();
                templateCount = 0;
                
                await LoadTemplatesFromSupabase();
                
                lblTemplateCount.Text = $"📁 Templates: {templateCount} ({employees.Count} คน)";
                btnStartScan.Enabled = true;
                btnLoadFromSupabase.Text = "✅ โหลดแล้ว";
            }
            catch (Exception ex)
            {
                Log($"❌ {ex.Message}");
                btnLoadFromSupabase.Enabled = true;
                btnLoadFromSupabase.Text = "🌐 โหลดจาก Supabase";
            }
        }
        
        private void BtnLoadFromMDB_Click(object sender, EventArgs e)
        {
            btnLoadFromSupabase.Enabled = false;
            btnLoadFromSupabase.Text = "⏳ กำลังโหลด...";
            
            try
            {
                templates.Clear();
                employees.Clear();
                templateCount = 0;
                
                LoadFromMDB();
                
                lblTemplateCount.Text = $"📁 Templates: {templateCount} ({employees.Count} คน)";
                btnStartScan.Enabled = true;
                btnLoadFromSupabase.Text = "✅ โหลดแล้ว";
            }
            catch (Exception ex)
            {
                Log($"❌ {ex.Message}");
                btnLoadFromSupabase.Enabled = true;
                btnLoadFromSupabase.Text = "📁 โหลดจาก MDB";
            }
        }
        
        private async Task LoadTemplatesFromCache()
        {
            try
            {
                // Check if FPCacheDB is valid
                if (fpcHandle <= 0)
                {
                    Log($"⚠️ FPCacheDB ไม่พร้อม (handle={fpcHandle}) - กรุณาเชื่อมต่อ Scanner ก่อน");
                    return;
                }
                
                string json = File.ReadAllText(cacheFilePath);
                var cache = JObject.Parse(json);
                var templateArray = cache["templates"] as JArray;
                var empData = cache["employees"] as JObject;
                
                if (templateArray == null || templateArray.Count == 0) return;
                
                Log($"📂 พบ {templateArray.Count} templates ใน cache file");
                Log($"   FPCacheDB Handle: {fpcHandle}");
                
                int loaded = 0;
                int cacheAdded = 0;
                foreach (var t in templateArray)
                {
                    try
                    {
                        int mdbUserId = t["mdb_user_id"].Value<int>();
                        string employeeCode = t["employee_code"]?.ToString() ?? mdbUserId.ToString();
                        int fingerId = t["finger_id"].Value<int>();
                        string base64Template = t["template_data"].ToString();
                        
                        // Add to FPCacheDB for 1:N identification
                        int cacheId = mdbUserId * 10 + fingerId;
                        int result = zkfp.AddRegTemplateStrToFPCacheDB(fpcHandle, cacheId, base64Template);
                        
                        if (loaded < 5) // Log first 5
                            Log($"  📁 #{loaded+1}: cacheId={cacheId}, result={result} {(result == 0 ? "✅" : "❌")}");
                        
                        if (result == 0)
                            cacheAdded++;
                        else if (loaded < 10)
                            Log($"  ⚠️ Failed to add template: result={result}");
                        
                        // Get employee name from template data or employees object
                        string empName = t["employee_name"]?.ToString() ?? "";
                        if (string.IsNullOrEmpty(empName) && empData != null && empData.ContainsKey(mdbUserId.ToString()))
                        {
                            var empInfo = empData[mdbUserId.ToString()] as JObject;
                            if (empInfo != null)
                                empName = empInfo["name"]?.ToString() ?? "";
                        }
                        
                        if (!employees.ContainsKey(mdbUserId))
                        {
                            employees[mdbUserId] = new EmployeeInfo
                            {
                                MdbUserId = mdbUserId,
                                EmployeeCode = employeeCode,
                                Name = empName,
                                FingerCount = 0
                            };
                        }
                        employees[mdbUserId].FingerCount++;
                        loaded++;
                    }
                    catch { }
                }
                
                Log($"✅ Cache: {cacheAdded}/{loaded} templates เพิ่มสำเร็จ");
                templateCount = loaded;
                Log($"✅ โหลดจาก cache: {loaded} templates");
            }
            catch (Exception ex)
            {
                Log($"❌ Cache error: {ex.Message}");
                await LoadTemplatesFromSupabase();
            }
        }
        
        private async Task LoadTemplatesFromSupabase()
        {
            if (string.IsNullOrEmpty(supabaseKey))
            {
                Log("❌ ไม่พบ Supabase Key");
                return;
            }
            
            using (var http = new HttpClient())
            {
                http.DefaultRequestHeaders.Add("apikey", supabaseKey);
                http.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                
                var response = await http.GetAsync($"{SUPABASE_URL}/rest/v1/fingerprint_templates?select=*&limit=1000");
                var json = await response.Content.ReadAsStringAsync();
                var templateArray = JArray.Parse(json);
                
                Log($"🌐 ดึงข้อมูล {templateArray.Count} templates จาก Supabase");
                
                int loaded = 0;
                int cacheAdded = 0;
                foreach (var t in templateArray)
                {
                    try
                    {
                        int mdbUserId = t["mdb_user_id"].Value<int>();
                        string employeeCode = t["employee_code"]?.ToString() ?? mdbUserId.ToString();
                        int fingerId = t["finger_id"].Value<int>();
                        string base64Template = t["template_data"].ToString();
                        
                        // Add to FPCacheDB for 1:N identification
                        // CacheId = mdbUserId * 10 + fingerId
                        int cacheId = mdbUserId * 10 + fingerId;
                        int result = zkfp.AddRegTemplateStrToFPCacheDB(fpcHandle, cacheId, base64Template);
                        
                        if (loaded < 3) // Log first 3
                            Log($"  📁 #{loaded+1}: cacheId={cacheId}, size={base64Template.Length}, result={result}");
                        
                        if (result == 0)
                            cacheAdded++;
                        
                        if (!employees.ContainsKey(mdbUserId))
                        {
                            employees[mdbUserId] = new EmployeeInfo
                            {
                                MdbUserId = mdbUserId,
                                EmployeeCode = employeeCode,
                                Name = "",
                                FingerCount = 0
                            };
                        }
                        employees[mdbUserId].FingerCount++;
                        loaded++;
                    }
                    catch { }
                }
                
                Log($"✅ Cache: {cacheAdded}/{loaded} templates เพิ่มสำเร็จ");
                
                templateCount = loaded;
                Log($"✅ โหลด {loaded} templates สำเร็จ");
                
                // Save to cache
                try
                {
                    var cache = new JObject
                    {
                        ["templates"] = templateArray,
                        ["employees"] = new JObject(),
                        ["timestamp"] = DateTime.Now.ToString("o")
                    };
                    File.WriteAllText(cacheFilePath, cache.ToString());
                    Log($"💾 บันทึก cache แล้ว");
                }
                catch { }
            }
        }
        
        /// <summary>
        /// โหลด templates จาก MDB file โดยตรง (ไม่ผ่าน Supabase)
        /// </summary>
        private void LoadFromMDB(string customPath = null)
        {
            // ลอง sync file ก่อน ถ้าไม่มีก็ใช้ ATT2000.MDB เดิม
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string syncPath = Path.Combine(appDir, "FpTest_Sync.mdb");
            string originalPath = @"X:\FP-E-coupon\Thai01\ATT2000.MDB";
            
            string mdbPath = customPath ?? (File.Exists(syncPath) ? syncPath : originalPath);
            
            if (!File.Exists(mdbPath))
            {
                Log($"❌ ไม่พบไฟล์ MDB: {mdbPath}");
                return;
            }
            
            Log($"📂 กำลังโหลดจาก MDB: {mdbPath}");
            
            try
            {
                string connStr = $@"Provider=Microsoft.Jet.OLEDB.4.0;Data Source={mdbPath};";
                
                using (var conn = new OleDbConnection(connStr))
                {
                    conn.Open();
                    Log($"✅ เชื่อมต่อ MDB สำเร็จ");
                    
                    // Step 1: Load employee names AND Badgenumber from USERINFO
                    var userNames = new Dictionary<int, string>();
                    var userBadges = new Dictionary<int, string>(); // USERID -> Badgenumber (real employee code)
                    try
                    {
                        string userSql = "SELECT USERID, Name, Badgenumber FROM USERINFO";
                        using (var userCmd = new OleDbCommand(userSql, conn))
                        using (var userReader = userCmd.ExecuteReader())
                        {
                            while (userReader.Read())
                            {
                                int uid = Convert.ToInt32(userReader["USERID"]);
                                string name = userReader["Name"]?.ToString() ?? "";
                                string badge = userReader["Badgenumber"]?.ToString() ?? "";
                                if (!string.IsNullOrEmpty(name))
                                    userNames[uid] = name;
                                if (!string.IsNullOrEmpty(badge))
                                    userBadges[uid] = badge;
                            }
                        }
                        Log($"📋 โหลดชื่อพนักงาน: {userNames.Count} คน, Badges: {userBadges.Count}");
                    }
                    catch (Exception ex)
                    {
                        Log($"⚠️ ไม่สามารถโหลด USERINFO: {ex.Message}");
                    }
                    
                    // Step 2: Query TEMPLATE table
                    string sql = "SELECT USERID, FINGERID, TEMPLATE4, TEMPLATE FROM TEMPLATE";
                    using (var cmd = new OleDbCommand(sql, conn))
                    using (var reader = cmd.ExecuteReader())
                    {
                        int loaded = 0;
                        int skipped = 0;
                        int cacheAdded = 0;
                        
                        while (reader.Read())
                        {
                            int userId = Convert.ToInt32(reader["USERID"]);
                            int fingerId = Convert.ToInt32(reader["FINGERID"]);
                            
                            // Try TEMPLATE4 first (V10 format)
                            byte[] templateData = null;
                            try { templateData = reader["TEMPLATE4"] as byte[]; } catch { }
                            
                            // Fallback to TEMPLATE
                            if (templateData == null || templateData.Length < 100)
                            {
                                try { templateData = reader["TEMPLATE"] as byte[]; } catch { }
                            }
                            
                            if (templateData == null || templateData.Length < 100)
                            {
                                skipped++;
                                continue;
                            }
                            
                            int cacheId = userId * 10 + fingerId;
                            
                            // Store in memory
                            mdbTemplates[cacheId] = templateData;
                            
                            // ⭐ FIX: Also add to FPCacheDB for 1:N matching!
                            if (fpcHandle > 0)
                            {
                                string base64Template = Convert.ToBase64String(templateData);
                                int result = zkfp.AddRegTemplateStrToFPCacheDB(fpcHandle, cacheId, base64Template);
                                if (result == 0) cacheAdded++;
                            }
                            
                            if (loaded < 5)
                            {
                                Log($"  📁 #{loaded+1}: userId={userId}, finger={fingerId}, size={templateData.Length}");
                            }
                            
                            loaded++;
                            
                            // Track employee with name AND Badgenumber from USERINFO
                            if (!employees.ContainsKey(userId))
                            {
                                string empName = userNames.ContainsKey(userId) ? userNames[userId] : $"User {userId}";
                                // ⭐ FIX: Use Badgenumber as EmployeeCode (matches Supabase employee_code)
                                string empCode = userBadges.ContainsKey(userId) ? userBadges[userId] : userId.ToString();
                                employees[userId] = new EmployeeInfo
                                {
                                    MdbUserId = userId,
                                    EmployeeCode = empCode,
                                    Name = empName
                                };
                            }
                            employees[userId].FingerCount++;
                        }
                        
                        Log($"📊 Skipped: {skipped} (no data)");
                        Log($"✅ FPCache: {cacheAdded}/{loaded} templates เพิ่มสำเร็จ");
                        templateCount = loaded;
                        Log($"✅ MDB: {loaded} templates ({employees.Count} คน)");
                        
                        lblTemplateCount.Text = $"Templates: {templateCount} ({employees.Count} คน)";
                    }
                }
            }
            catch (Exception ex)
            {
                Log($"❌ MDB Error: {ex.Message}");
                
                if (ex.Message.Contains("Jet"))
                {
                    Log($"⚠️ ต้องติดตั้ง Microsoft Access Database Engine (32-bit)");
                }
            }
        }
        /// <summary>
        /// โหลด templates จาก ZKTime MDB โดยตรง (เร็วมาก!)
        /// ZKTime sync ข้อมูลไว้แล้ว - เราแค่อ่าน!
        /// </summary>
        private async void BtnLoadZKTimeMDB_Click(object sender, EventArgs e)
        {
            btnLoadFromDevice.Enabled = false;
            btnLoadFromDevice.Text = "⏳ โหลด...";
            btnLoadFromDevice.BackColor = Color.FromArgb(149, 165, 166);
            
            try
            {
                string zkTimeMDB = @"X:\FP-E-coupon\Thai01\ATT2000.MDB";
                string appDir = AppDomain.CurrentDomain.BaseDirectory;
                string localMDB = Path.Combine(appDir, "ATT2000.MDB");
                
                // Copy จาก ZKTime มาไว้ folder FpTest
                if (File.Exists(zkTimeMDB))
                {
                    Log("📋 Copy ATT2000.MDB มา folder FpTest...");
                    File.Copy(zkTimeMDB, localMDB, true);
                    Log($"✅ Copy สำเร็จ: {localMDB}");
                }
                
                Log("⚡ โหลดจาก MDB...");
                
                templates.Clear();
                employees.Clear();
                mdbTemplates.Clear();
                templateCount = 0;
                
                LoadFromMDB(localMDB);
                
                lblTemplateCount.Text = $"📁 Templates: {templateCount} ({employees.Count} คน)";
                btnStartScan.Enabled = true;
                
                Log($"✅ โหลดเสร็จ: {templateCount} templates ({employees.Count} คน)");
                
                // อ่าน CHECKINOUT วันนี้และให้สิทธิ์อาหาร
                await LoadTodayAttendanceAndGrantCredits(localMDB);
            }
            catch (Exception ex)
            {
                Log($"❌ Error: {ex.Message}");
            }
            finally
            {
                btnLoadFromDevice.Enabled = true;
                btnLoadFromDevice.Text = "⚡ โหลด ZKTime";
                btnLoadFromDevice.BackColor = Color.FromArgb(41, 128, 185);
            }
        }
        
        /// <summary>
        /// อ่าน CHECKINOUT วันนี้จาก MDB และให้สิทธิ์อาหาร
        /// </summary>
        private async Task LoadTodayAttendanceAndGrantCredits(string mdbPath)
        {
            try
            {
                string connStr = $@"Provider=Microsoft.Jet.OLEDB.4.0;Data Source={mdbPath};";
                var todayAttendance = new HashSet<int>(); // USERID ที่สแกนวันนี้
                var userIds = new List<string>();
                
                using (var conn = new OleDbConnection(connStr))
                {
                    conn.Open();
                    
                    // อ่าน CHECKINOUT วันนี้ (ไม่สน IN/OUT)
                    var today = DateTime.Today;
                    string sql = $"SELECT USERID, CHECKTIME FROM CHECKINOUT WHERE CHECKTIME >= #{today:MM/dd/yyyy}#";
                    
                    using (var cmd = new OleDbCommand(sql, conn))
                    using (var reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            int userId = Convert.ToInt32(reader["USERID"]);
                            todayAttendance.Add(userId);
                        }
                    }
                    
                    // Get Badgenumber (PIN) จาก USERINFO
                    if (todayAttendance.Count > 0)
                    {
                        var userIdList = string.Join(",", todayAttendance);
                        sql = $"SELECT USERID, Badgenumber, Name FROM USERINFO WHERE USERID IN ({userIdList})";
                        
                        using (var cmd = new OleDbCommand(sql, conn))
                        using (var reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                string badgeNumber = reader["Badgenumber"]?.ToString();
                                if (!string.IsNullOrEmpty(badgeNumber))
                                {
                                    userIds.Add(badgeNumber);
                                }
                            }
                        }
                    }
                }
                
                Log($"📊 วันนี้มีคนสแกน: {todayAttendance.Count} คน (PIN: {userIds.Count} คน)");
                
                if (userIds.Count > 0)
                {
                    // Sync ไป Supabase และให้สิทธิ์
                    Log("💳 กำลังให้สิทธิ์อาหารวันนี้...");
                    
                    await Task.Run(async () =>
                    {
                        foreach (var pin in userIds)
                        {
                            // บันทึก attendance ไป Supabase
                            await SaveAttendanceToSupabase(pin, DateTime.Now);
                        }
                    });
                    
                    // เรียก API ให้สิทธิ์
                    await GrantTodayCredits();
                }
                else
                {
                    Log("⚠️ ไม่มีข้อมูลสแกนวันนี้ใน MDB - ลอง Sync ZKTime ก่อน");
                }
            }
            catch (Exception ex)
            {
                Log($"⚠️ อ่าน attendance error: {ex.Message}");
            }
        }
        
        private async Task SaveAttendanceToSupabase(string pin, DateTime checkTime)
        {
            try
            {
                if (supabase == null) return;
                
                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(5);
                    client.DefaultRequestHeaders.Add("apikey", supabaseKey);
                    client.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");
                    client.DefaultRequestHeaders.Add("Prefer", "resolution=ignore-duplicates,return=minimal");
                    
                    var attendance = new
                    {
                        employee_code = pin,
                        check_time = checkTime.ToString("yyyy-MM-ddTHH:mm:ss+07:00"),
                        device_ip = "MDB"
                    };
                    
                    var json = Newtonsoft.Json.JsonConvert.SerializeObject(attendance);
                    var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
                    
                    await client.PostAsync($"{SUPABASE_URL}/rest/v1/attendance", content);
                }
            }
            catch { }
        }
        
        private async Task GrantTodayCredits()
        {
            try
            {
                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(30);
                    var today = DateTime.Today.ToString("yyyy-MM-dd");
                    
                    var requestBody = new { date = today, grantOT = false };
                    var json = Newtonsoft.Json.JsonConvert.SerializeObject(requestBody);
                    var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
                    
                    var response = await client.PostAsync("http://localhost:3000/api/auto-grant-credits", content);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        var result = await response.Content.ReadAsStringAsync();
                        var data = JObject.Parse(result);
                        var lunchGranted = data["lunchGranted"]?.Value<int>() ?? 0;
                        
                        this.Invoke((Action)(() => {
                            Log($"✅ ให้สิทธิ์อาหาร: {lunchGranted} คน");
                        }));
                    }
                    else
                    {
                        this.Invoke((Action)(() => {
                            Log($"⚠️ API ไม่ตอบ - ต้องรัน `npm run dev` ก่อน");
                        }));
                    }
                }
            }
            catch (Exception ex)
            {
                this.Invoke((Action)(() => {
                    Log($"⚠️ API Error: {ex.Message}");
                }));
            }
        }
        
        private bool SyncDevicesToMDB()
        {
            var service = new ZKTecoToMDBService();
            
            var devices = new List<DeviceInfo>
            {
                new DeviceInfo { Name = "SSTH-1", IpAddress = "192.168.0.151" },
                new DeviceInfo { Name = "SSTH-2", IpAddress = "192.168.0.152" },
                new DeviceInfo { Name = "SSTH-3", IpAddress = "192.168.0.153" },
                new DeviceInfo { Name = "SSTH-4", IpAddress = "192.168.0.154" }
            };
            
            // สร้างไฟล์ใหม่ใน folder เดียวกับ FpTest.exe
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string mdbPath = Path.Combine(appDir, "FpTest_Sync.mdb");
            
            return service.SyncDevicesToMDB(
                devices, 
                mdbPath,
                msg => this.Invoke((Action)(() => Log(msg)))
            );
        }
        
        private void LoadTemplatesFromDevice()
        {
            var templateService = new ZKTecoTemplateService();
            
            // รายชื่อเครื่อง ZKTeco ทั้งหมด (เหมือนกับใน sync)
            var devices = new List<DeviceInfo>
            {
                new DeviceInfo { Name = "SSTH-1", IpAddress = "192.168.0.151" },
                new DeviceInfo { Name = "SSTH-2", IpAddress = "192.168.0.152" },
                new DeviceInfo { Name = "SSTH-3", IpAddress = "192.168.0.153" },
                new DeviceInfo { Name = "SSTH-4", IpAddress = "192.168.0.154" }
            };
            
            this.Invoke((Action)(() => {
                Log($"📡 กำลังดึง templates จาก {devices.Count} เครื่อง...");
                progressBar.Maximum = devices.Count + 2; // devices + merge + save
                progressBar.Value = 0;
                lblProgress.Text = "0/4 เครื่อง...";
            }));
            
            try
            {
                this.Invoke((Action)(() => {
                    templates.Clear();
                    employees.Clear();
                    templateCount = 0;
                }));
                
                // ดึง templates จากทุกเครื่องพร้อมกัน (parallel)
                var deviceTemplates = templateService.GetAllTemplatesFromDevices(
                    devices, 
                    msg => this.Invoke((Action)(() => Log(msg))),
                    (completed, total, deviceName) => this.Invoke((Action)(() => {
                        progressBar.Value = completed;
                        lblProgress.Text = $"✅ {completed}/{total} เสร็จ";
                    }))
                );
                
                this.Invoke((Action)(() => {
                    progressBar.Value = devices.Count;
                    lblProgress.Text = "รวม templates...";
                    Log($"📊 พบ {deviceTemplates.Count} templates รวมจากทุกเครื่อง");
                }));
                
                int loaded = 0;
                int cacheAdded = 0;
                var templateList = new List<object>(); // For saving to cache
                
                foreach (var t in deviceTemplates)
                {
                    // Add to FPCacheDB (ต้องทำบน UI thread เพราะ zkfp เป็น COM)
                    int userId = int.TryParse(t.UserId, out int uid) ? uid : 0;
                    int cacheId = userId * 10 + t.FingerId;
                    
                    int result = 0;
                    this.Invoke((Action)(() => {
                        result = zkfp.AddRegTemplateStrToFPCacheDB(fpcHandle, cacheId, t.TemplateData);
                    }));
                    
                    if (loaded < 5)
                    {
                        int l = loaded;
                        this.Invoke((Action)(() => Log($"  📁 #{l+1}: userId={t.UserId}, finger={t.FingerId}, size={t.TemplateLength}, result={result}")));
                    }
                    
                    if (result == 0) cacheAdded++;
                    loaded++;
                    
                    // Track employee
                    int uid2 = userId;
                    string userName = t.UserName ?? $"User {userId}";
                    this.Invoke((Action)(() => {
                        if (!employees.ContainsKey(uid2))
                        {
                            employees[uid2] = new EmployeeInfo
                            {
                                MdbUserId = uid2,
                                Name = userName
                            };
                        }
                        employees[uid2].FingerCount++;
                    }));
                    
                    // Collect for saving to cache
                    templateList.Add(new { 
                        mdb_user_id = userId, 
                        finger_id = t.FingerId, 
                        template_data = t.TemplateData,
                        employee_name = t.UserName ?? ""
                    });
                }
                
                // Save to cache file
                this.Invoke((Action)(() => {
                    progressBar.Value = progressBar.Maximum - 1;
                    lblProgress.Text = "บันทึก cache...";
                    Log("💾 กำลังบันทึก cache...");
                }));
                try
                {
                    var cache = new JObject
                    {
                        ["templates"] = JArray.FromObject(templateList),
                        ["source"] = "all_devices",
                        ["device_count"] = devices.Count,
                        ["timestamp"] = DateTime.Now.ToString("o")
                    };
                    File.WriteAllText(cacheFilePath, cache.ToString());
                    this.Invoke((Action)(() => {
                        progressBar.Value = progressBar.Maximum;
                        lblProgress.Text = "เสร็จสิ้น!";
                        Log($"💾 บันทึก cache สำเร็จ: {templateList.Count} templates");
                    }));
                }
                catch (Exception saveEx)
                {
                    this.Invoke((Action)(() => Log($"⚠️ บันทึก cache ล้มเหลว: {saveEx.Message}")));
                }
                
                int finalLoaded = loaded;
                int finalCacheAdded = cacheAdded;
                this.Invoke((Action)(() => {
                    templateCount = finalLoaded;
                    Log($"✅ Device: {finalCacheAdded}/{finalLoaded} templates เพิ่มสำเร็จ ({employees.Count} คน)");
                    lblTemplateCount.Text = $"Templates: {templateCount} ({employees.Count} คน)";
                    btnStartScan.Enabled = true;
                }));
            }
            catch (Exception ex)
            {
                this.Invoke((Action)(() => Log($"❌ Error: {ex.Message}")));
            }
        }
        
        #endregion
        
        #region Scanning
        
        private void BtnStartScan_Click(object sender, EventArgs e)
        {
            if (templateCount <= 0)
            {
                Log("⚠️ กรุณาโหลด templates ก่อน");
                return;
            }
            
            StartScanning();
        }
        
        private void BtnStopScan_Click(object sender, EventArgs e)
        {
            StopScanning();
        }
        
        private void StartScanning()
        {
            if (isScanning) return;
            
            isScanning = true;
            btnStartScan.Enabled = false;
            btnStopScan.Enabled = true;
            
            scanTimer = new Timer { Interval = 500 };
            scanTimer.Tick += ScanTimer_Tick;
            scanTimer.Start();
            
            Log($"🔵 เริ่มสแกน - วางนิ้วบน Scanner (1:1 matching กับ {templateCount} templates)");
            UpdateStatus("🔵 กำลังสแกน... วางนิ้วบน Scanner", primaryColor);
        }
        
        private void StopScanning()
        {
            if (!isScanning) return;
            
            isScanning = false;
            scanTimer?.Stop();
            scanTimer?.Dispose();
            
            btnStartScan.Enabled = true;
            btnStopScan.Enabled = false;
            
            Log("⏹️ หยุดสแกน");
            UpdateStatus($"🟢 พร้อมสแกน ({templateCount} templates)", successColor);
        }
        
        private void ScanTimer_Tick(object sender, EventArgs e)
        {
            try
            {
                if (!isScanning || zkfp == null) return;
                
                // Set to V10 mode for capture to match with stored templates
                zkfp.FPEngineVersion = "10";
                
                // Get captured template as binary
                object capturedTemplate = zkfp.GetTemplate();
                if (capturedTemplate == null) return;
                
                byte[] capBytes = capturedTemplate as byte[];
                if (capBytes == null || capBytes.Length == 0) return;
                
                // DEBUG: Log template info (first time only)
                scanDebugCount++;
                if (scanDebugCount == 1)
                {
                    var header = BitConverter.ToString(capBytes, 0, Math.Min(10, capBytes.Length)).Replace("-", "");
                    Log($"🔍 Captured: {capBytes.Length} bytes, Header: {header}");
                }
                
                // Skip if template too small (no finger detected)
                if (capBytes.Length < 100) return;
                
                // Display fingerprint image
                try
                {
                    int w = zkfp.ImageWidth;
                    int h = zkfp.ImageHeight;
                    if (w > 0 && h > 0)
                    {
                        // Method 1: Try GetImageBinary
                        try
                        {
                            object imgData = zkfp.GetImageBinary();
                            if (imgData != null)
                            {
                                byte[] imgBytes = imgData as byte[];
                                if (imgBytes != null && imgBytes.Length > 0)
                                {
                                    var bmp = new Bitmap(w, h, System.Drawing.Imaging.PixelFormat.Format8bppIndexed);
                                    
                                    // Create grayscale palette
                                    var palette = bmp.Palette;
                                    for (int i = 0; i < 256; i++)
                                        palette.Entries[i] = Color.FromArgb(i, i, i);
                                    bmp.Palette = palette;
                                    
                                    var data = bmp.LockBits(new Rectangle(0, 0, w, h),
                                        System.Drawing.Imaging.ImageLockMode.WriteOnly, bmp.PixelFormat);
                                    
                                    System.Runtime.InteropServices.Marshal.Copy(imgBytes, 0, data.Scan0, Math.Min(imgBytes.Length, w * h));
                                    bmp.UnlockBits(data);
                                    picFinger.Image = bmp;
                                }
                            }
                        }
                        catch
                        {
                            // Method 2: Fallback to PrintImageAt
                            var bmp = new Bitmap(w, h, System.Drawing.Imaging.PixelFormat.Format24bppRgb);
                            var g = Graphics.FromImage(bmp);
                            IntPtr hdc = g.GetHdc();
                            zkfp.PrintImageAt(hdc.ToInt32(), 0, 0, w, h);
                            g.ReleaseHdc();
                            picFinger.Image = bmp;
                        }
                    }
                }
                catch (Exception imgEx)
                {
                    Log($"⚠️ Image error: {imgEx.Message}");
                }
                
                // Use 1:N identification with FPCache (reuse capturedTemplate from above)
                if (capturedTemplate == null) 
                {
                    return; // ไม่มี template - skip เงียบๆ
                }
                
                object score = 0;
                object processedNum = 0;
                
                // Templates were added as strings, so we need to convert captured template to string first
                byte[] templateBytes = capturedTemplate as byte[];
                if (templateBytes == null || templateBytes.Length == 0) return;
                
                // Debug: log captured template header (first scan only)
                if (lastMatchedId == 0)
                {
                    var header = BitConverter.ToString(templateBytes, 0, Math.Min(10, templateBytes.Length)).Replace("-", "");
                    Log($"🔍 Captured: {templateBytes.Length} bytes, Header: {header}");
                }
                
                // Convert captured template to base64 string
                string templateStr = Convert.ToBase64String(templateBytes);
                
                // Try identification with binary first (should work with string-added templates)
                int cacheId = zkfp.IdentificationInFPCacheDB(fpcHandle, capturedTemplate, ref score, ref processedNum);
                
                // Debug: show processedNum to verify cache is used
                int processed = Convert.ToInt32(processedNum);
                if (processed == 0 && lastMatchedId == 0)
                {
                    Log($"⚠️ processedNum=0, fpcHandle={fpcHandle}");
                }
                
                // ถ้าพบ match
                if (cacheId > 0 && Convert.ToInt32(score) > 30)
                {
                    int mdbUserId = cacheId / 10;
                    int currentScore = Convert.ToInt32(score);
                    
                    // ถ้าคนเดิม + score เหมือนเดิม = SDK buffer ยังไม่ clear (นิ้วไม่ได้อยู่แล้ว)
                    // หรือถ้าคนเดิมภายใน cooldown → skip เงียบๆ
                    if (mdbUserId == lastMatchedId && 
                        (currentScore == lastMatchScore || 
                         (DateTime.Now - lastMatchTime).TotalSeconds < SAME_PERSON_COOLDOWN_SECONDS))
                    {
                        return; // Silent skip - SDK buffer หรือนิ้วเดิมค้างอยู่
                    }
                    
                    // คนใหม่ หรือ พ้น cooldown แล้ว
                    Log($"📷 Template size: {(capturedTemplate as byte[])?.Length ?? 0}");
                    Log($"🔍 ผลลัพธ์: cacheId={cacheId}, score={score}");
                    
                    // Update last matched info
                    lastMatchedId = mdbUserId;
                    lastMatchScore = currentScore;
                    lastMatchTime = DateTime.Now;
                    
                    ProcessMatchResult(cacheId, Convert.ToInt32(score));
                }
                else
                {
                    ClearResult();
                    lblResultTitle.Text = "❌ ไม่พบลายนิ้วมือในระบบ";
                    lblResultTitle.ForeColor = dangerColor;
                    
                    // Clear fingerprint image
                    picFinger.Image = null;
                    
                    if (Convert.ToInt32(processedNum) == 0)
                        Log($"❌ ไม่พบในระบบ (cache ว่าง)");
                    else
                        Log("❌ ไม่พบลายนิ้วมือในระบบ");
                    
                    // Pause scanning for 3 seconds (prevent rapid re-scans)
                    scanTimer.Stop();
                    Task.Delay(1000).ContinueWith(_ => {
                        if (isScanning)
                        {
                            this.Invoke((Action)(() => {
                                scanTimer.Start();
                                Log("🔄 พร้อมสแกนอีกครั้ง");
                            }));
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Log($"❌ Scan error: {ex.Message}");
            }
        }
        
        private void ProcessMatchResult(int cacheId, int score)
        {
            // Decode cacheId: cacheId = mdbUserId * 10 + fingerId
            int mdbUserId = cacheId / 10;
            
            if (employees.ContainsKey(mdbUserId))
            {
                var emp = employees[mdbUserId];
                
                // Use mdbUserId as fallback if EmployeeCode is empty
                string empCode = !string.IsNullOrEmpty(emp.EmployeeCode) ? emp.EmployeeCode : mdbUserId.ToString();
                
                lblResultTitle.Text = "✅ ยืนยันตัวตนสำเร็จ!";
                lblResultTitle.ForeColor = successColor;
                lblEmployeeCode.Text = $"รหัส / PIN: {empCode}";
                lblEmployeeName.Text = $"ชื่อ / Name: {emp.Name}";
                lblFingerInfo.Text = "";
                lblMatchScore.Text = "";
                lblCreditStatus.Text = "⏳ กำลังโหลด credit...";
                
                Log($"✅ พบ: {empCode} - {emp.Name}");
                
                // Fetch credit from Supabase async
                FetchCreditAsync(empCode);
            }
            else
            {
                // Try to use mdbUserId directly as employee code
                string empCode = mdbUserId.ToString();
                
                lblResultTitle.Text = "✅ ยืนยันตัวตน!";
                lblResultTitle.ForeColor = successColor;
                lblEmployeeCode.Text = $"รหัส / PIN: {empCode}";
                lblEmployeeName.Text = "";
                lblFingerInfo.Text = "";
                lblMatchScore.Text = "";
                lblCreditStatus.Text = "⏳ กำลังโหลด credit...";
                
                Log($"✅ พบ: {empCode} (จาก cache)");
                
                // Fetch credit using mdbUserId as employee code
                FetchCreditAsync(empCode);
            }
        }
        
        private async void FetchCreditAsync(string employeeCode)
        {
            // Stop scanning immediately after match
            scanTimer.Stop();
            
            try
            {
                if (supabase == null)
                {
                    lblCreditStatus.Text = "⚠️ Supabase ไม่ได้เชื่อมต่อ";
                    lblCreditStatus.ForeColor = Color.Orange;
                    ResumeScanning(1000);
                    return;
                }
                
                var empCredit = await supabase.GetEmployeeWithCreditAsync(employeeCode);
                
                // แสดงเวลาเข้างาน (ถ้ามี)
                if (empCredit?.CheckInTime != null)
                {
                    lblFingerInfo.Text = $"🕐 เข้างาน: {empCredit.CheckInTime.Value.ToString("HH:mm")}";
                    Log($"🕐 เข้างาน: {empCredit.CheckInTime.Value.ToString("HH:mm")}");
                }
                else
                {
                    lblFingerInfo.Text = "⚠️ ไม่พบบันทึกเข้างาน";
                }
                
                if (empCredit == null)
                {
                    // ⭐ NEW: Show popup for new employee not in database
                    ShowNewEmployeePopup(employeeCode);
                    ShowNoCreditMessage(employeeCode, employeeCode);
                    ResumeScanning(3000); // ให้เวลา popup แสดง
                }
                else if (!empCredit.HasTodayCredit || (!empCredit.LunchAvailable && !empCredit.OtMealAvailable))
                {
                    // No credit available - show 3-language message
                    ShowNoCreditMessage(employeeCode, empCredit.Name);
                    ResumeScanning(2000);
                }
                else if (empCredit.LunchUsed)
                {
                    // Already used today
                    ShowAlreadyUsedMessage(employeeCode, empCredit.Name);
                    ResumeScanning(2000);
                }
                else if (empCredit.LunchAvailable && !empCredit.LunchUsed)
                {
                    // Has credit - AUTO REDEEM!
                    lblCreditStatus.Text = "⏳ กำลังใช้ Credit...";
                    Log($"🍚 กำลังใช้ Credit สำหรับ {employeeCode}...");
                    
                    var success = await supabase.RecordMealTransactionAsync(
                        empCredit.EmployeeId,
                        empCredit.CompanyId,
                        "LUNCH",
                        empCredit.LunchPrice
                    );
                    
                    if (success)
                    {
                        ShowRedeemSuccessMessage(employeeCode, empCredit.Name);
                    }
                    else
                    {
                        lblCreditStatus.Text = "❌ ใช้ Credit ไม่สำเร็จ";
                        lblCreditStatus.ForeColor = dangerColor;
                        Log($"❌ ใช้ Credit ไม่สำเร็จ");
                    }
                    
                    ResumeScanning(2000);
                }
                else
                {
                    lblCreditStatus.Text = empCredit.GetCreditStatus();
                    lblCreditStatus.ForeColor = Color.Gray;
                    Log($"💳 Credit: {empCredit.GetCreditStatus()}");
                    ResumeScanning(2000);
                }
            }
            catch (Exception ex)
            {
                lblCreditStatus.Text = $"❌ Error: {ex.Message}";
                lblCreditStatus.ForeColor = dangerColor;
                Log($"❌ Credit error: {ex.Message}");
                ResumeScanning(1000);
            }
        }
        
        private void ShowNoCreditMessage(string pin, string name)
        {
            var today = DateTime.Now.ToString("dd/MM/yyyy");
            
            // 3-language message
            var message = $"📅 {today}\n" +
                $"🔴 รหัส: {pin} | {name}\n\n" +
                $"🇹🇭 ไม่มีสิทธิ์อาหาร กรุณาติดต่อ Admin\n" +
                $"🇬🇧 No meal credit. Contact Admin\n" +
                $"🇲🇲 အစားအသောက်ခွင့်မရှိပါ။ Admin ကိုဆက်သွယ်ပါ";
            
            lblCreditStatus.Text = "❌ ไม่มีสิทธิ์ / No Credit / ခွင့်မရှိ";
            lblCreditStatus.ForeColor = dangerColor;
            
            // Clear fingerprint image
            picFinger.Image = null;
            
            // Show popup
            MessageBox.Show(message, "⚠️ No Credit / ไม่มีสิทธิ์", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            
            // Clear display after popup closed
            ClearResult();
            
            Log($"❌ {pin} - {name}: ไม่มีสิทธิ์อาหาร");
        }
        
        private void ShowAlreadyUsedMessage(string pin, string name)
        {
            var today = DateTime.Now.ToString("dd/MM/yyyy");
            
            var message = $"📅 {today}\n" +
                $"🟡 รหัส: {pin} | {name}\n\n" +
                $"🇹🇭 ใช้สิทธิ์ไปแล้ววันนี้\n" +
                $"🇬🇧 Already used today\n" +
                $"🇲🇲 ဒီနေ့သုံးပြီးပါပြီ";
            
            lblCreditStatus.Text = "✅ ใช้แล้ว / Used / သုံးပြီး";
            lblCreditStatus.ForeColor = Color.Gray;
            
            MessageBox.Show(message, "ℹ️ Already Used / ใช้แล้ว", MessageBoxButtons.OK, MessageBoxIcon.Information);
            
            // Clear display after popup closed
            ClearResult();
            
            Log($"ℹ️ {pin} - {name}: ใช้สิทธิ์ไปแล้ววันนี้");
        }
        
        private void ShowRedeemSuccessMessage(string pin, string name)
        {
            var today = DateTime.Now.ToString("dd/MM/yyyy");
            var time = DateTime.Now.ToString("HH:mm:ss");
            
            var message = $"📅 {today} ⏰ {time}\n" +
                $"🟢 รหัส: {pin} | {name}\n\n" +
                $"🇹🇭 ✅ ใช้สิทธิ์อาหารกลางวันสำเร็จ!\n" +
                $"🇬🇧 ✅ Lunch credit used successfully!\n" +
                $"🇲🇲 ✅ နေ့လည်စာခွင့် သုံးပြီးပါပြီ!";
            
            lblCreditStatus.Text = "✅ ใช้สำเร็จ! / Used! / သုံးပြီး!";
            lblCreditStatus.ForeColor = successColor;
            
            MessageBox.Show(message, "✅ Success / สำเร็จ!", MessageBoxButtons.OK, MessageBoxIcon.Information);
            
            Log($"✅ {pin} - {name}: ใช้สิทธิ์สำเร็จ!");
        }
        
        private void ShowNewEmployeePopup(string employeeCode)
        {
            var today = DateTime.Now.ToString("dd/MM/yyyy HH:mm");
            
            var message = $"📅 {today}\n" +
                $"🆕 รหัสพนักงาน: {employeeCode}\n\n" +
                $"🇹🇭 ⚠️ พนักงานใหม่!\n" +
                $"รหัสนี้ยังไม่มีในฐานข้อมูล Supabase\n" +
                $"กรุณาเพิ่มพนักงานที่ Admin Panel\n\n" +
                $"🇬🇧 ⚠️ New Employee!\n" +
                $"This code is not in database.\n" +
                $"Please add at Admin Panel.\n\n" +
                $"🇲🇲 ⚠️ ဝန်ထမ်းအသစ်!\n" +
                $"ဤကုဒ်သည် database တွင်မရှိပါ။";
            
            lblCreditStatus.Text = "🆕 พนักงานใหม่ / New Employee";
            lblCreditStatus.ForeColor = Color.FromArgb(230, 126, 34);
            
            Log($"🆕 พนักงานใหม่: {employeeCode} - ไม่พบในฐานข้อมูล!");
            
            // Show popup asynchronously to not block
            Task.Run(() => {
                this.Invoke((Action)(() => {
                    MessageBox.Show(message, "🆕 พนักงานใหม่ / New Employee", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }));
            });
        }
        
        private void ResumeScanning(int delayMs)
        {
            Task.Delay(delayMs).ContinueWith(_ => {
                if (isScanning)
                {
                    this.Invoke((Action)(() => {
                        scanTimer.Start();
                        Log("🔄 พร้อมสแกนอีกครั้ง");
                    }));
                }
            });
        }
        
        private void ClearResult()
        {
            lblResultTitle.Text = "📋 ผลการยืนยันตัวตน";
            lblResultTitle.ForeColor = darkColor;
            lblEmployeeCode.Text = "รหัสพนักงาน: -";
            lblEmployeeName.Text = "ชื่อ: -";
            lblFingerInfo.Text = "นิ้ว: -";
            lblMatchScore.Text = "Score: -";
            lblCreditStatus.Text = "💳 Credit: -";
            lblCreditStatus.ForeColor = primaryColor;
        }
        
        private string GetFingerName(int fingerId)
        {
            string[] names = { "หัวแม่มือขวา", "ชี้ขวา", "กลางขวา", "นางขวา", "ก้อยขวา",
                               "หัวแม่มือซ้าย", "ชี้ซ้าย", "กลางซ้าย", "นางซ้าย", "ก้อยซ้าย" };
            return fingerId >= 0 && fingerId < 10 ? names[fingerId] : $"นิ้ว {fingerId}";
        }
        
        #endregion
    }
    
    public class TemplateInfo
    {
        public int MdbUserId { get; set; }
        public string EmployeeCode { get; set; }
        public int FingerId { get; set; }
        public byte[] TemplateData { get; set; }
    }
    
    public class EmployeeInfo
    {
        public int MdbUserId { get; set; }
        public string EmployeeCode { get; set; }
        public string Name { get; set; }
        public int FingerCount { get; set; }
    }
}
