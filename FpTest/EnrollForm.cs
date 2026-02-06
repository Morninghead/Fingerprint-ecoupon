using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;

namespace FpTest
{
    public class EnrollForm : Form
    {
        // ZK SDK reference (passed from parent)
        private dynamic zkfp;
        private int fpcHandle;
        
        // UI Controls
        private TextBox txtEmployeeCode;
        private TextBox txtEmployeeName;
        private Label lblStatus;
        private Label lblProgress;
        private PictureBox picFinger;
        private ListBox lstLog;
        private Button btnStart;
        private Button btnCancel;
        
        // Enrollment state
        private int currentFinger = 0; // 0 = first finger, 1 = second finger
        private int enrollProgress = 0; // Tracks captures within SDK enrollment
        private bool isEnrolling = false;
        private Timer checkTimer;
        
        // Result
        public bool EnrollmentSuccess { get; private set; } = false;
        public string EmployeeCode { get; private set; }
        public string EmployeeName { get; private set; }
        public List<string> RegisteredTemplates { get; private set; } = new List<string>();
        
        // Colors
        private Color primaryColor = Color.FromArgb(41, 128, 185);
        private Color successColor = Color.FromArgb(39, 174, 96);
        private Color dangerColor = Color.FromArgb(231, 76, 60);
        private Color warningColor = Color.FromArgb(243, 156, 18);
        
        private string[] fingerNames = { "นิ้วโป้งขวา", "นิ้วชี้ขวา" };
        
        public EnrollForm(dynamic zkfpInstance, int fpcHandleValue)
        {
            zkfp = zkfpInstance;
            fpcHandle = fpcHandleValue;
            InitializeUI();
        }
        
        private void InitializeUI()
        {
            this.Text = "📝 ลงทะเบียนลายนิ้วมือใหม่";
            this.Size = new Size(600, 650);
            this.StartPosition = FormStartPosition.CenterParent;
            this.BackColor = Color.FromArgb(236, 240, 241);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            
            // Employee Info Panel
            var pnlInfo = new Panel { Location = new Point(20, 20), Size = new Size(540, 100), BackColor = Color.White };
            
            var lblCode = new Label { Text = "รหัสพนักงาน:", Location = new Point(20, 20), AutoSize = true, Font = new Font("Segoe UI", 11) };
            txtEmployeeCode = new TextBox { Location = new Point(130, 17), Size = new Size(150, 25), Font = new Font("Segoe UI", 11) };
            
            var lblName = new Label { Text = "ชื่อพนักงาน:", Location = new Point(20, 55), AutoSize = true, Font = new Font("Segoe UI", 11) };
            txtEmployeeName = new TextBox { Location = new Point(130, 52), Size = new Size(250, 25), Font = new Font("Segoe UI", 11) };
            
            pnlInfo.Controls.AddRange(new Control[] { lblCode, txtEmployeeCode, lblName, txtEmployeeName });
            
            // Status Panel
            var pnlStatus = new Panel { Location = new Point(20, 130), Size = new Size(250, 280), BackColor = Color.White };
            
            lblStatus = new Label
            {
                Text = "กรุณากรอกข้อมูลและกดเริ่มลงทะเบียน",
                Location = new Point(15, 15),
                Size = new Size(220, 60),
                Font = new Font("Segoe UI", 10),
                ForeColor = Color.Gray
            };
            pnlStatus.Controls.Add(lblStatus);
            
            lblProgress = new Label
            {
                Text = "รอเริ่มต้น...",
                Location = new Point(15, 80),
                Size = new Size(220, 60),
                Font = new Font("Segoe UI", 14, FontStyle.Bold),
                ForeColor = primaryColor
            };
            pnlStatus.Controls.Add(lblProgress);
            
            // Instructions
            var lblInstructions = new Label
            {
                Text = "📌 วิธีการ:\n• วางนิ้วบน Scanner 3 ครั้ง/นิ้ว\n• ยกนิ้วขึ้นระหว่างแต่ละครั้ง\n• ทำซ้ำสำหรับ 2 นิ้ว",
                Location = new Point(15, 150),
                Size = new Size(220, 100),
                Font = new Font("Segoe UI", 9),
                ForeColor = Color.DimGray
            };
            pnlStatus.Controls.Add(lblInstructions);
            
            // Fingerprint Panel
            var pnlFinger = new Panel { Location = new Point(280, 130), Size = new Size(280, 280), BackColor = Color.White };
            picFinger = new PictureBox
            {
                Location = new Point(10, 10),
                Size = new Size(260, 260),
                SizeMode = PictureBoxSizeMode.Zoom,
                BackColor = Color.FromArgb(245, 245, 245)
            };
            pnlFinger.Controls.Add(picFinger);
            
            // Buttons
            btnStart = new Button
            {
                Text = "▶️ เริ่มลงทะเบียน",
                Location = new Point(20, 420),
                Size = new Size(150, 40),
                BackColor = successColor,
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 11)
            };
            btnStart.FlatAppearance.BorderSize = 0;
            btnStart.Click += BtnStart_Click;
            
            btnCancel = new Button
            {
                Text = "❌ ยกเลิก",
                Location = new Point(180, 420),
                Size = new Size(100, 40),
                BackColor = dangerColor,
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 11)
            };
            btnCancel.FlatAppearance.BorderSize = 0;
            btnCancel.Click += (s, e) => { CancelEnrollment(); this.Close(); };
            
            // Log
            var pnlLog = new Panel { Location = new Point(20, 470), Size = new Size(540, 130), BackColor = Color.White };
            var lblLogTitle = new Label { Text = "📜 Log", Location = new Point(10, 5), AutoSize = true, Font = new Font("Segoe UI", 10, FontStyle.Bold) };
            lstLog = new ListBox
            {
                Location = new Point(10, 25),
                Size = new Size(520, 95),
                Font = new Font("Consolas", 9),
                BorderStyle = BorderStyle.None
            };
            pnlLog.Controls.Add(lblLogTitle);
            pnlLog.Controls.Add(lstLog);
            
            this.Controls.AddRange(new Control[] { pnlInfo, pnlStatus, pnlFinger, btnStart, btnCancel, pnlLog });
        }
        
        private void Log(string msg)
        {
            if (lstLog.InvokeRequired)
            {
                lstLog.Invoke(new Action(() => Log(msg)));
                return;
            }
            lstLog.Items.Insert(0, $"[{DateTime.Now:HH:mm:ss}] {msg}");
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
        
        private void UpdateProgress(string text)
        {
            if (lblProgress.InvokeRequired)
            {
                lblProgress.Invoke(new Action(() => UpdateProgress(text)));
                return;
            }
            lblProgress.Text = text;
        }
        
        private void BtnStart_Click(object sender, EventArgs e)
        {
            if (string.IsNullOrWhiteSpace(txtEmployeeCode.Text))
            {
                MessageBox.Show("กรุณากรอกรหัสพนักงาน", "Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            
            if (string.IsNullOrWhiteSpace(txtEmployeeName.Text))
            {
                MessageBox.Show("กรุณากรอกชื่อพนักงาน", "Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            
            EmployeeCode = txtEmployeeCode.Text.Trim();
            EmployeeName = txtEmployeeName.Text.Trim();
            
            txtEmployeeCode.Enabled = false;
            txtEmployeeName.Enabled = false;
            btnStart.Enabled = false;
            
            currentFinger = 0;
            RegisteredTemplates.Clear();
            isEnrolling = true;
            
            Log($"🚀 เริ่มลงทะเบียน: {EmployeeCode} - {EmployeeName}");
            
            StartFingerEnrollment();
        }
        
        private void StartFingerEnrollment()
        {
            try
            {
                // Set to V9 mode
                zkfp.FPEngineVersion = "9";
                
                // Cancel any existing enrollment
                if (zkfp.IsRegister)
                    zkfp.CancelEnroll();
                
                // Set 3 captures for enrollment
                zkfp.EnrollCount = 3;
                
                // Begin enrollment
                zkfp.BeginEnroll();
                
                enrollProgress = 0;
                UpdateProgress($"นิ้วที่ {currentFinger + 1}/2\n{fingerNames[currentFinger]}");
                UpdateStatus($"วางนิ้ว {fingerNames[currentFinger]} บน Scanner\n(ครั้งที่ 1/3)", warningColor);
                Log($"📌 เริ่ม {fingerNames[currentFinger]} - วางนิ้ว 3 ครั้ง");
                
                // Start timer to check progress and show image
                checkTimer = new Timer { Interval = 200 };
                checkTimer.Tick += CheckTimer_Tick;
                checkTimer.Start();
            }
            catch (Exception ex)
            {
                Log($"❌ Error starting enrollment: {ex.Message}");
                MessageBox.Show($"Error: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        
        private void CheckTimer_Tick(object sender, EventArgs e)
        {
            if (!isEnrolling) return;
            
            try
            {
                // Check enrollment progress
                int regProgress = zkfp.EnrollIndex;
                
                if (regProgress > enrollProgress)
                {
                    enrollProgress = regProgress;
                    Log($"📷 {fingerNames[currentFinger]} - ครั้งที่ {enrollProgress}/3 สำเร็จ");
                    UpdateStatus($"วางนิ้ว {fingerNames[currentFinger]} บน Scanner\n(ครั้งที่ {enrollProgress + 1}/3)", warningColor);
                    
                    // Try to display image
                    DisplayFingerImage();
                }
                
                // Check if enrollment complete (IsRegister becomes false after completion)
                if (!zkfp.IsRegister && enrollProgress > 0)
                {
                    checkTimer.Stop();
                    ProcessEnrollmentComplete();
                }
            }
            catch (Exception ex)
            {
                // Ignore timer errors
            }
        }
        
        private void DisplayFingerImage()
        {
            try
            {
                int w = zkfp.ImageWidth;
                int h = zkfp.ImageHeight;
                if (w > 0 && h > 0)
                {
                    object imgData = zkfp.GetImageBinary();
                    if (imgData != null)
                    {
                        byte[] imgBytes = imgData as byte[];
                        if (imgBytes != null && imgBytes.Length > 0)
                        {
                            var bmp = new Bitmap(w, h, System.Drawing.Imaging.PixelFormat.Format8bppIndexed);
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
            }
            catch { }
        }
        
        private void ProcessEnrollmentComplete()
        {
            try
            {
                // Get the registered template
                string templateStr = zkfp.GetTemplateAsStringEx("9");
                
                if (!string.IsNullOrEmpty(templateStr) && templateStr.Length > 100)
                {
                    Log($"✅ {fingerNames[currentFinger]} สำเร็จ! (size: {templateStr.Length})");
                    RegisteredTemplates.Add(templateStr);
                    
                    // Add to cache for immediate matching
                    int fid = 99990 + currentFinger; // Temporary FID for new enrollment
                    try
                    {
                        int empId = 0;
                        int.TryParse(EmployeeCode, out empId);
                        if (empId > 0)
                            fid = empId * 10 + currentFinger;
                    }
                    catch { }
                    
                    int result = zkfp.AddRegTemplateStrToFPCacheDB(fpcHandle, fid, templateStr);
                    Log($"📥 เพิ่มเข้า cache: fid={fid}, result={result}");
                    
                    UpdateStatus($"✅ {fingerNames[currentFinger]} สำเร็จ!", successColor);
                    
                    currentFinger++;
                    
                    if (currentFinger < 2)
                    {
                        // Move to next finger
                        System.Threading.Thread.Sleep(500);
                        MessageBox.Show($"✅ {fingerNames[currentFinger - 1]} สำเร็จ!\n\nกรุณาเปลี่ยนเป็น {fingerNames[currentFinger]}", 
                            "เปลี่ยนนิ้ว", MessageBoxButtons.OK, MessageBoxIcon.Information);
                        StartFingerEnrollment();
                    }
                    else
                    {
                        // All done!
                        FinishEnrollment();
                    }
                }
                else
                {
                    Log($"⚠️ {fingerNames[currentFinger]} ล้มเหลว - template ว่าง");
                    UpdateStatus($"❌ {fingerNames[currentFinger]} ล้มเหลว\nลองใหม่อีกครั้ง", dangerColor);
                    
                    // Retry
                    StartFingerEnrollment();
                }
            }
            catch (Exception ex)
            {
                Log($"❌ Error: {ex.Message}");
            }
        }
        
        private void FinishEnrollment()
        {
            isEnrolling = false;
            checkTimer?.Stop();
            
            if (RegisteredTemplates.Count >= 2)
            {
                EnrollmentSuccess = true;
                UpdateStatus("✅ ลงทะเบียนสำเร็จ!\n\n2 นิ้วพร้อมใช้งาน", successColor);
                UpdateProgress("🎉 สำเร็จ!");
                Log($"🎉 ลงทะเบียนสำเร็จ! {RegisteredTemplates.Count} templates");
                
                MessageBox.Show($"ลงทะเบียนสำเร็จ!\n\nรหัส: {EmployeeCode}\nชื่อ: {EmployeeName}\nจำนวนนิ้ว: {RegisteredTemplates.Count}\n\nกรุณาปิดหน้านี้แล้วทดสอบสแกน",
                    "สำเร็จ", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            else
            {
                UpdateStatus("⚠️ ลงทะเบียนไม่ครบ", dangerColor);
                Log($"⚠️ ลงทะเบียนไม่ครบ - มีแค่ {RegisteredTemplates.Count} nิ้ว");
            }
            
            btnStart.Enabled = true;
            btnStart.Text = "✅ เสร็จสิ้น";
            btnStart.Click -= BtnStart_Click;
            btnStart.Click += (s, e) => this.Close();
        }
        
        private void CancelEnrollment()
        {
            isEnrolling = false;
            checkTimer?.Stop();
            
            try
            {
                if (zkfp.IsRegister)
                    zkfp.CancelEnroll();
            }
            catch { }
        }
        
        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            CancelEnrollment();
            checkTimer?.Dispose();
            base.OnFormClosing(e);
        }
    }
}
