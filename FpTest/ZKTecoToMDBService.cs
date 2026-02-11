using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Data.OleDb;
using System.IO;
using System.Threading.Tasks;

namespace FpTest
{
    /// <summary>
    /// Service สำหรับดึง fingerprint templates จากเครื่อง ZKTeco 
    /// และเซฟลง MDB file (format เดียวกับ ZKTime)
    /// </summary>
    public class ZKTecoToMDBService
    {
        private string lastError = "";
        public string LastError => lastError;
        
        /// <summary>
        /// ดึง templates จากหลายเครื่องแล้วเซฟลง MDB ใหม่
        /// </summary>
        public bool SyncDevicesToMDB(List<DeviceInfo> devices, string mdbPath, Action<string> log = null)
        {
            log?.Invoke($"📡 เริ่ม sync จาก {devices.Count} เครื่อง ไป {Path.GetFileName(mdbPath)}");
            
            // Step 1: Create new MDB if not exists, or clear existing
            if (!File.Exists(mdbPath))
            {
                if (!CreateNewMDB(mdbPath, log))
                {
                    log?.Invoke($"❌ ไม่สามารถสร้างไฟล์ MDB ใหม่");
                    return false;
                }
            }
            else
            {
                ClearMDBTemplates(mdbPath, log);
            }
            
            string connStr = $@"Provider=Microsoft.Jet.OLEDB.4.0;Data Source={mdbPath};";
            
            try
            {
                // Step 2: Download from ALL devices in PARALLEL (เร็วมาก!)
                log?.Invoke($"⚡ ดึงข้อมูลจาก {devices.Count} เครื่อง พร้อมกัน...");
                
                var allTemplates = new ConcurrentBag<DeviceTemplate>();
                var tasks = new List<Task>();
                
                foreach (var device in devices)
                {
                    var d = device;
                    tasks.Add(Task.Run(() => {
                        var templates = GetTemplatesFromDevice(d.IpAddress, d.Name, log);
                        foreach (var t in templates)
                            allTemplates.Add(t);
                    }));
                }
                
                Task.WaitAll(tasks.ToArray());
                
                log?.Invoke($"📊 ดึงเสร็จ: {allTemplates.Count} templates รวม");
                
                // Step 3: Write to MDB
                using (var conn = new OleDbConnection(connStr))
                {
                    conn.Open();
                    log?.Invoke($"✅ เชื่อมต่อ MDB สำเร็จ, กำลังเขียน...");
                    
                    int totalAdded = 0;
                    int totalSkipped = 0;
                    var seen = new HashSet<string>();
                    
                    foreach (var t in allTemplates)
                    {
                        try
                        {
                            int userId = 0;
                            if (!int.TryParse(t.UserId, out userId)) continue;
                            
                            string key = $"{userId}_{t.FingerId}";
                            if (seen.Contains(key)) { totalSkipped++; continue; }
                            seen.Add(key);
                            
                            byte[] templateBytes = HexStringToBytes(t.TemplateData);
                            if (templateBytes == null || templateBytes.Length < 100) continue;
                            
                            string insertSql = "INSERT INTO TEMPLATE (USERID, FINGERID, TEMPLATE, REGDATE) VALUES (?, ?, ?, ?)";
                            using (var insertCmd = new OleDbCommand(insertSql, conn))
                            {
                                insertCmd.Parameters.AddWithValue("@uid", userId);
                                insertCmd.Parameters.AddWithValue("@fid", t.FingerId);
                                insertCmd.Parameters.AddWithValue("@tmpl", templateBytes);
                                insertCmd.Parameters.AddWithValue("@date", DateTime.Now);
                                insertCmd.ExecuteNonQuery();
                                totalAdded++;
                            }
                        }
                        catch { /* skip duplicates */ }
                    }
                    
                    log?.Invoke($"📊 รวม: เพิ่มใหม่ {totalAdded}, ข้าม {totalSkipped} (ซ้ำ)");
                }
                
                return true;
            }
            catch (Exception ex)
            {
                lastError = ex.Message;
                log?.Invoke($"❌ MDB Error: {ex.Message}");
                return false;
            }
        }
        
        /// <summary>
        /// ดึง templates จากเครื่องเดียว - ลอง bulk ก่อน ถ้าไม่ได้ใช้ legacy
        /// </summary>
        private List<DeviceTemplate> GetTemplatesFromDevice(string ipAddress, string deviceName, Action<string> log = null)
        {
            var templates = new List<DeviceTemplate>();
            dynamic czkem = null;
            
            try
            {
                Type zkemType = Type.GetTypeFromProgID("zkemkeeper.ZKEM.1");
                if (zkemType == null)
                {
                    log?.Invoke($"❌ [{deviceName}] zkemkeeper not registered");
                    return templates;
                }
                czkem = Activator.CreateInstance(zkemType);
                
                if (!czkem.Connect_Net(ipAddress, 4370))
                {
                    log?.Invoke($"❌ [{deviceName}] ไม่สามารถเชื่อมต่อ");
                    return templates;
                }
                
                log?.Invoke($"✅ [{deviceName}] เชื่อมต่อสำเร็จ");
                czkem.EnableDevice(1, false);
                
                // ใช้ legacy method โดยตรง (SSR_GetDeviceData ไม่รองรับ)
                templates = GetTemplatesFromDeviceLegacy(czkem, deviceName, log);
                
                czkem.EnableDevice(1, true);
                czkem.Disconnect();
            }
            catch (Exception ex)
            {
                log?.Invoke($"❌ [{deviceName}] Error: {ex.Message}");
                try { czkem?.Disconnect(); } catch { }
            }
            
            return templates;
        }
        
        /// <summary>
        /// วิธีเดิม (ช้า) - fallback ถ้า SSR_GetDeviceData ไม่รองรับ
        /// </summary>
        private List<DeviceTemplate> GetTemplatesFromDeviceLegacy(dynamic czkem, string deviceName, Action<string> log = null)
        {
            var templates = new List<DeviceTemplate>();
            
            if (czkem.ReadAllUserID(1))
            {
                string enrollNumber = "";
                string name = "";
                string password = "";
                int privilege = 0;
                bool enabled = false;
                int userCount = 0;
                
                while (czkem.SSR_GetAllUserInfo(1, out enrollNumber, out name, out password, out privilege, out enabled))
                {
                    userCount++;
                    
                    // Log progress every 100 users
                    if (userCount % 100 == 0)
                        log?.Invoke($"   [{deviceName}] {userCount} users... ({templates.Count} templates)");
                    
                    // Check only 2 fingers (most people register only 2)
                    // นิ้ว 0,1 = ชี้ซ้าย/ขวา (ส่วนใหญ่ลงแค่นี้)
                    for (int finger = 0; finger < 2; finger++)
                    {
                        string tmpData = "";
                        int tmpLength = 0;
                        
                        if (czkem.SSR_GetUserTmpStr(1, enrollNumber, finger, out tmpData, out tmpLength))
                        {
                            if (!string.IsNullOrEmpty(tmpData) && tmpLength > 0)
                            {
                                templates.Add(new DeviceTemplate
                                {
                                    UserId = enrollNumber,
                                    UserName = name,
                                    FingerId = finger,
                                    TemplateData = tmpData,
                                    TemplateLength = tmpLength,
                                    DeviceName = deviceName
                                });
                            }
                        }
                    }
                }
                
                log?.Invoke($"📁 [{deviceName}] {templates.Count} templates จาก {userCount} users");
            }
            
            return templates;
        }
        
        private byte[] HexStringToBytes(string hex)
        {
            if (string.IsNullOrEmpty(hex) || hex.Length % 2 != 0)
                return null;
                
            byte[] bytes = new byte[hex.Length / 2];
            for (int i = 0; i < bytes.Length; i++)
            {
                bytes[i] = Convert.ToByte(hex.Substring(i * 2, 2), 16);
            }
            return bytes;
        }
        
        private bool CreateNewMDB(string mdbPath, Action<string> log = null)
        {
            try
            {
                string templatePath = @"X:\FP-E-coupon\Thai01\ATT2000.MDB";
                
                if (File.Exists(templatePath))
                {
                    log?.Invoke($"📋 Copy จาก {Path.GetFileName(templatePath)}...");
                    File.Copy(templatePath, mdbPath, true);
                    ClearMDBTemplates(mdbPath, log);
                    log?.Invoke($"✅ สร้าง MDB ใหม่สำเร็จ");
                    return true;
                }
                else
                {
                    log?.Invoke($"⚠️ ไม่พบ ATT2000.MDB template");
                    return false;
                }
            }
            catch (Exception ex)
            {
                log?.Invoke($"❌ CreateNewMDB Error: {ex.Message}");
                return false;
            }
        }
        
        private void ClearMDBTemplates(string mdbPath, Action<string> log = null)
        {
            try
            {
                string connStr = $@"Provider=Microsoft.Jet.OLEDB.4.0;Data Source={mdbPath};";
                using (var conn = new OleDbConnection(connStr))
                {
                    conn.Open();
                    using (var cmd = new OleDbCommand("DELETE FROM TEMPLATE", conn))
                    {
                        int deleted = cmd.ExecuteNonQuery();
                        log?.Invoke($"🗑️ ลบ {deleted} templates เดิม");
                    }
                }
            }
            catch (Exception ex)
            {
                log?.Invoke($"⚠️ ClearMDB: {ex.Message}");
            }
        }
    }
}
