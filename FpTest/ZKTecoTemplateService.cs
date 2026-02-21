using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace FpTest
{
    /// <summary>
    /// Service สำหรับดึง fingerprint templates จากเครื่อง ZKTeco attendance โดยตรง
    /// ใช้ zkemkeeper.dll สำหรับสื่อสารกับเครื่อง
    /// รองรับการ connect หลายเครื่องและรวม templates จากทุกเครื่อง
    /// </summary>
    public class ZKTecoTemplateService
    {
        private string lastError = "";
        
        public string LastError => lastError;
        
        /// <summary>
        /// ดึง templates จากหลายเครื่องพร้อมกัน (parallel)
        /// </summary>
        public List<DeviceTemplate> GetAllTemplatesFromDevices(List<DeviceInfo> devices, Action<string> log = null, Action<int, int, string> progress = null)
        {
            var allTemplates = new List<DeviceTemplate>();
            var tasks = new List<Task<List<DeviceTemplate>>>();
            int completedDevices = 0;
            
            foreach (var device in devices)
            {
                var d = device; // Capture for closure
                tasks.Add(Task.Run(() => {
                    var result = GetTemplatesFromDevice(d.IpAddress, d.Name, log);
                    completedDevices++;
                    progress?.Invoke(completedDevices, devices.Count, d.Name);
                    return result;
                }));
            }
            
            Task.WaitAll(tasks.ToArray());
            
            foreach (var task in tasks)
            {
                if (task.Result != null)
                {
                    allTemplates.AddRange(task.Result);
                }
            }
            
            // Remove duplicates (same userId + fingerId, keep first)
            var unique = new Dictionary<string, DeviceTemplate>();
            foreach (var t in allTemplates)
            {
                string key = $"{t.UserId}_{t.FingerId}";
                if (!unique.ContainsKey(key))
                {
                    unique[key] = t;
                }
            }
            
            log?.Invoke($"📊 รวมทั้งหมด: {unique.Count} templates (ลบ duplicate แล้ว)");
            
            return new List<DeviceTemplate>(unique.Values);
        }
        
        /// <summary>
        /// ดึง templates จากเครื่องเดียว - optimized version
        /// </summary>
        private List<DeviceTemplate> GetTemplatesFromDevice(string ipAddress, string deviceName, Action<string> log = null)
        {
            var templates = new List<DeviceTemplate>();
            dynamic czkem = null;
            
            try
            {
                // Create COM object for zkemkeeper
                Type zkemType = Type.GetTypeFromProgID("zkemkeeper.ZKEM.1");
                if (zkemType == null)
                {
                    log?.Invoke($"❌ [{deviceName}] zkemkeeper not registered");
                    return templates;
                }
                czkem = Activator.CreateInstance(zkemType);
                
                log?.Invoke($"🔗 [{deviceName}] เชื่อมต่อ {ipAddress}...");
                
                if (!czkem.Connect_Net(ipAddress, 4370))
                {
                    log?.Invoke($"❌ [{deviceName}] ไม่สามารถเชื่อมต่อ");
                    return templates;
                }
                
                log?.Invoke($"✅ [{deviceName}] เชื่อมต่อสำเร็จ");
                
                // Single Pass: Load everything to memory first
                czkem.EnableDevice(1, false);
                log?.Invoke($"⏳ [{deviceName}] กำลังอ่านข้อมูลเข้า memory...");
                
                // Read both Users and Templates into memory buffers
                bool readUsers = czkem.ReadAllUserID(1); 
                bool readTemplates = czkem.ReadAllTemplate(1);
                
                if (readUsers && readTemplates)
                {
                    string enrollNumber = "";
                    string name = "";
                    string password = "";
                    int privilege = 0;
                    bool enabled = false;
                    
                    int userCount = 0;
                    int templateCount = 0;
                    
                    // Iterate through users (Cursor is at start)
                    while (czkem.SSR_GetAllUserInfo(1, out enrollNumber, out name, out password, out privilege, out enabled))
                    {
                        userCount++;
                        if (userCount % 50 == 0) // Log every 50 to reduce spam
                        {
                            log?.Invoke($"⏳ [{deviceName}] ตรวจสอบแล้ว {userCount} users (พบ {templateCount} templates)...");
                        }
                        
                        // Check all 10 fingers for this user
                        for (int finger = 0; finger < 10; finger++)
                        {
                            string tmpData = "";
                            int tmpLength = 0;
                            int flag = 1;
                            
                            bool found = false;
                            
                            // 1. Try V10 (Prioritize local memory call)
                            try 
                            { 
                                if (czkem.GetUserTmpExStr(1, enrollNumber, finger, out flag, out tmpData, out tmpLength))
                                    found = true;
                            } 
                            catch { }
                            
                            // 2. Fallback to V9/Generic
                            if (!found)
                            {
                                try
                                {
                                    if (czkem.SSR_GetUserTmpStr(1, enrollNumber, finger, out tmpData, out tmpLength))
                                        found = true;
                                }
                                catch { }
                            }

                            if (found && !string.IsNullOrEmpty(tmpData) && tmpLength > 10) // Check > 10 to be safe
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
                                templateCount++;
                            }
                        }
                    }
                    log?.Invoke($"✅ [{deviceName}] เสร็จสิ้น: {templateCount} templates จาก {userCount} users");
                }
                else
                {
                     log?.Invoke($"❌ [{deviceName}] อ่านข้อมูลเข้า Memory ล้มเหลว (Users={readUsers}, Tmp={readTemplates})");
                }
                
                // Re-enable device
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
        
        // Legacy methods for single device (backward compatibility)
        private dynamic czkem;
        private bool isConnected = false;
        public bool IsConnected => isConnected;
        
        public bool Connect(string ipAddress, int port = 4370)
        {
            try
            {
                Type zkemType = Type.GetTypeFromProgID("zkemkeeper.ZKEM.1");
                if (zkemType == null)
                {
                    lastError = "zkemkeeper not registered";
                    return false;
                }
                czkem = Activator.CreateInstance(zkemType);
                isConnected = czkem.Connect_Net(ipAddress, port);
                if (!isConnected)
                {
                    lastError = "Connect failed";
                }
                return isConnected;
            }
            catch (Exception ex)
            {
                lastError = ex.Message;
                return false;
            }
        }
        
        public void Disconnect()
        {
            if (czkem != null && isConnected)
            {
                try { czkem.Disconnect(); } catch { }
                isConnected = false;
            }
        }
        
        public List<DeviceTemplate> GetAllTemplates(int machineNumber = 1)
        {
            var templates = new List<DeviceTemplate>();
            if (czkem == null || !isConnected) return templates;
            
            try
            {
                czkem.EnableDevice(machineNumber, false);
                
                if (czkem.ReadAllUserID(machineNumber))
                {
                    string enrollNumber = "";
                    string name = "";
                    string password = "";
                    int privilege = 0;
                    bool enabled = false;
                    
                    while (czkem.SSR_GetAllUserInfo(machineNumber, out enrollNumber, out name, out password, out privilege, out enabled))
                    {
                        for (int finger = 0; finger < 10; finger++)
                        {
                            string templateData = "";
                            int templateLength = 0;
                            
                            if (czkem.SSR_GetUserTmpStr(machineNumber, enrollNumber, finger, out templateData, out templateLength))
                            {
                                if (!string.IsNullOrEmpty(templateData) && templateLength > 100)
                                {
                                    templates.Add(new DeviceTemplate
                                    {
                                        UserId = enrollNumber,
                                        UserName = name,
                                        FingerId = finger,
                                        TemplateData = templateData,
                                        TemplateLength = templateLength
                                    });
                                }
                            }
                        }
                    }
                }
                
                czkem.EnableDevice(machineNumber, true);
            }
            catch (Exception ex)
            {
                lastError = ex.Message;
                czkem.EnableDevice(machineNumber, true);
            }
            
            return templates;
        }
    }
    
    public class DeviceTemplate
    {
        public string UserId { get; set; }
        public string UserName { get; set; }
        public int FingerId { get; set; }
        public string TemplateData { get; set; }
        public int TemplateLength { get; set; }
        public string DeviceName { get; set; }
    }
    
    public class DeviceInfo
    {
        public string Name { get; set; }
        public string IpAddress { get; set; }
    }
}
