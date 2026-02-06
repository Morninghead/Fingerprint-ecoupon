using System;
using System.Collections.Generic;
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
        private Button btnEnroll;
        private Button btnStartScan;
        private Button btnStopScan;
        private Button btnSync;
        
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
        
        // Duplicate scan prevention
        private int lastMatchedId = -1;
        private DateTime lastMatchTime = DateTime.MinValue;
        private const int SAME_PERSON_COOLDOWN_SECONDS = 10; // ป้องกัน scan ซ้ำคนเดิมภายใน 10 วินาที
        
        public MainForm()
        {
            cacheFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "templates_cache.json");
            LoadConfig();
            InitializeUI();
            
            // Initialize Supabase client
            if (!string.IsNullOrEmpty(supabaseKey))
            {
                supabase = new SupabaseClient(SUPABASE_URL, supabaseKey);
                
                // Initialize sync service with ZKTeco devices
                syncService = new ZKTecoSyncService(SUPABASE_URL, supabaseKey);
                syncService.AddDevice("SSTH-1", "192.168.1.151");
                syncService.AddDevice("SSTH-2", "192.168.1.152");
                syncService.AddDevice("Haoli", "192.168.1.153");
                syncService.AddDevice("PPS", "192.168.1.154");
            }
            
            // Auto-start on form load
            this.Load += MainForm_Load;
        }
        
        private async void MainForm_Load(object sender, EventArgs e)
        {
            Log("🚀 เริ่มต้นระบบอัตโนมัติ...");
            
            // Step 1: Auto-connect hardware
            await Task.Delay(500); // Wait for UI to render
            Log("🔌 กำลังเชื่อมต่อ Scanner...");
            BtnInit_Click(sender, e);
            
            // Step 2: Auto-load templates (if connected)
            if (btnLoadTemplates.Enabled)
            {
                await Task.Delay(300);
                Log("📂 กำลังโหลด Templates...");
                BtnLoadTemplates_Click(sender, e);
                
                // Step 3: Auto-start scanning (always on)
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
            this.Size = new Size(900, 780);
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
            
            // Status Panel
            pnlStatus = new Panel { Location = new Point(20, 100), Size = new Size(420, 120), BackColor = Color.White };
            
            lblStatus = new Label
            {
                Text = "⚪ ยังไม่ได้เชื่อมต่อ Scanner",
                Font = new Font("Segoe UI", 14),
                ForeColor = darkColor,
                Location = new Point(20, 20),
                AutoSize = true
            };
            pnlStatus.Controls.Add(lblStatus);
            
            lblTemplateCount = new Label
            {
                Text = "📁 Templates: 0",
                Font = new Font("Segoe UI", 11),
                ForeColor = Color.Gray,
                Location = new Point(20, 55),
                AutoSize = true
            };
            pnlStatus.Controls.Add(lblTemplateCount);
            
            btnInit = CreateButton("🔌 เชื่อมต่อ Scanner", 20, 85, primaryColor);
            btnInit.Click += BtnInit_Click;
            pnlStatus.Controls.Add(btnInit);
            
            btnLoadTemplates = CreateButton("📂 โหลด Templates", 160, 85, primaryColor);
            btnLoadTemplates.Click += BtnLoadTemplates_Click;
            btnLoadTemplates.Enabled = false;
            pnlStatus.Controls.Add(btnLoadTemplates);
            
            btnLoadFromSupabase = CreateButton("🌐 โหลดจาก Supabase", 300, 85, Color.FromArgb(142, 68, 173));
            btnLoadFromSupabase.Click += BtnLoadFromSupabase_Click;
            btnLoadFromSupabase.Enabled = false;
            btnLoadFromSupabase.Width = 170;
            pnlStatus.Controls.Add(btnLoadFromSupabase);
            
            btnSync = CreateButton("🔄 Sync Attendance", 20, 120, Color.FromArgb(22, 160, 133));
            btnSync.Click += BtnSync_Click;
            btnSync.Width = 160;
            pnlStatus.Controls.Add(btnSync);
            
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
            
            // Result Panel
            pnlResult = new Panel { Location = new Point(20, 230), Size = new Size(420, 200), BackColor = Color.White };
            
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
            
            // Log Panel
            pnlLog = new Panel { Location = new Point(20, 440), Size = new Size(840, 280), BackColor = Color.White };
            
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
                    btnEnroll.Enabled = true;
                    btnStartScan.Enabled = true;
                    
                    Log($"✅ เชื่อมต่อสำเร็จ - SN: {sn}");
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
        
        private async Task LoadTemplatesFromCache()
        {
            try
            {
                string json = File.ReadAllText(cacheFilePath);
                var cache = JObject.Parse(json);
                var templateArray = cache["templates"] as JArray;
                var empData = cache["employees"] as JObject;
                
                if (templateArray == null || templateArray.Count == 0) return;
                
                Log($"📂 พบ {templateArray.Count} templates ใน cache file");
                
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
                        // Use regular version for V9 templates
                        int cacheId = mdbUserId * 10 + fingerId;
                        int result = zkfp.AddRegTemplateStrToFPCacheDB(fpcHandle, cacheId, base64Template);
                        
                        if (loaded < 3) // Log first 3
                            Log($"  📁 #{loaded+1}: cacheId={cacheId}, size={base64Template.Length}, result={result}");
                        
                        if (result == 0)
                            cacheAdded++;
                        
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
                
                // Skip if template too small (no finger detected)
                if (capBytes.Length < 100) return;
                
                Log($"📷 จับภาพได้! Template size: {capBytes.Length}");
                
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
                    Log($"⚠️ GetTemplate() returned null");
                    return;
                }
                
                Log($"🔍 กำลังค้นหาใน {templateCount} templates ด้วย 1:N cache...");
                
                object score = 0;
                object processedNum = 0;
                
                int cacheId = zkfp.IdentificationInFPCacheDB(fpcHandle, capturedTemplate, ref score, ref processedNum);
                
                Log($"🔍 ผลลัพธ์: cacheId={cacheId}, score={score}, processed={processedNum}");
                
                if (cacheId > 0 && Convert.ToInt32(score) > 30)
                {
                    int mdbUserId = cacheId / 10;
                    
                    // Check if same person scanned within cooldown period
                    if (mdbUserId == lastMatchedId && 
                        (DateTime.Now - lastMatchTime).TotalSeconds < SAME_PERSON_COOLDOWN_SECONDS)
                    {
                        Log($"⏳ รอสักครู่... (คนเดิมภายใน {SAME_PERSON_COOLDOWN_SECONDS} วินาที)");
                        return; // Skip processing
                    }
                    
                    // Update last matched info
                    lastMatchedId = mdbUserId;
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
                    Task.Delay(3000).ContinueWith(_ => {
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
                
                lblResultTitle.Text = "✅ ยืนยันตัวตนสำเร็จ!";
                lblResultTitle.ForeColor = successColor;
                lblEmployeeCode.Text = $"รหัส / PIN: {emp.EmployeeCode}";
                lblEmployeeName.Text = $"ชื่อ / Name: {emp.Name}";
                lblFingerInfo.Text = "";
                lblMatchScore.Text = "";
                lblCreditStatus.Text = "⏳ กำลังโหลด credit...";
                
                Log($"✅ พบ: {emp.EmployeeCode} - {emp.Name}");
                
                // Fetch credit from Supabase async
                FetchCreditAsync(emp.EmployeeCode);
            }
            else
            {
                lblResultTitle.Text = "⚠️ ไม่พบข้อมูลพนักงาน";
                lblResultTitle.ForeColor = Color.Orange;
                lblEmployeeCode.Text = $"ID: {mdbUserId}";
                lblEmployeeName.Text = "";
                lblFingerInfo.Text = "";
                lblMatchScore.Text = "";
                lblCreditStatus.Text = "❌ ไม่มีข้อมูล / No Data";
                
                Log($"⚠️ ID={mdbUserId} ไม่มีใน employee list");
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
                    ResumeScanning(3000);
                    return;
                }
                
                var empCredit = await supabase.GetEmployeeWithCreditAsync(employeeCode);
                
                if (empCredit == null)
                {
                    ShowNoCreditMessage(employeeCode, employeeCode);
                    ResumeScanning(5000);
                }
                else if (!empCredit.HasTodayCredit || (!empCredit.LunchAvailable && !empCredit.OtMealAvailable))
                {
                    // No credit available - show 3-language message
                    ShowNoCreditMessage(employeeCode, empCredit.Name);
                    ResumeScanning(5000);
                }
                else if (empCredit.LunchUsed)
                {
                    // Already used today
                    ShowAlreadyUsedMessage(employeeCode, empCredit.Name);
                    ResumeScanning(5000);
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
                    
                    ResumeScanning(5000);
                }
                else
                {
                    lblCreditStatus.Text = empCredit.GetCreditStatus();
                    lblCreditStatus.ForeColor = Color.Gray;
                    Log($"💳 Credit: {empCredit.GetCreditStatus()}");
                    ResumeScanning(5000);
                }
            }
            catch (Exception ex)
            {
                lblCreditStatus.Text = $"❌ Error: {ex.Message}";
                lblCreditStatus.ForeColor = dangerColor;
                Log($"❌ Credit error: {ex.Message}");
                ResumeScanning(3000);
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
