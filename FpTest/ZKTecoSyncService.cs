using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FpTest
{
    /// <summary>
    /// Sync attendance from ZKTeco devices to Supabase
    /// Uses incremental sync - only syncs new data since last sync
    /// </summary>
    public class ZKTecoSyncService
    {
        private readonly string _supabaseUrl;
        private readonly string _supabaseKey;
        private readonly HttpClient _http;
        
        // Device configurations
        private readonly List<DeviceConfig> _devices = new List<DeviceConfig>();
        
        // State file for incremental sync
        private readonly string _stateFilePath;
        private SyncState _state;
        
        // Sync window: number of days to sync back for FIRST TIME only
        private const int FIRST_SYNC_DAYS = 7;
        // Safety margin: always sync at least 1 day back to catch edge cases
        private const int SAFETY_DAYS = 1;
        
        public ZKTecoSyncService(string supabaseUrl, string supabaseKey)
        {
            _supabaseUrl = supabaseUrl.TrimEnd('/');
            _supabaseKey = supabaseKey;
            _http = new HttpClient();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");
            
            // State file in app directory
            _stateFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "fptest-sync-state.json");
            LoadState();
        }
        
        public void AddDevice(string name, string ip, int port = 4370)
        {
            _devices.Add(new DeviceConfig { Name = name, IP = ip, Port = port });
        }
        
        #region State Management
        
        private void LoadState()
        {
            try
            {
                if (File.Exists(_stateFilePath))
                {
                    var json = File.ReadAllText(_stateFilePath);
                    _state = JsonConvert.DeserializeObject<SyncState>(json) ?? new SyncState();
                }
                else
                {
                    _state = new SyncState();
                }
            }
            catch
            {
                _state = new SyncState();
            }
        }
        
        private void SaveState()
        {
            try
            {
                var json = JsonConvert.SerializeObject(_state, Formatting.Indented);
                File.WriteAllText(_stateFilePath, json);
            }
            catch { }
        }
        
        private DateTime GetSyncStartDate(string deviceIp)
        {
            // Check if we have last sync time for this device
            if (_state.LastSyncPerDevice.TryGetValue(deviceIp, out var lastSync))
            {
                // Use last sync time minus safety margin
                var syncFrom = lastSync.AddDays(-SAFETY_DAYS);
                return syncFrom.Date;
            }
            
            // First time: sync FIRST_SYNC_DAYS back
            return DateTime.Today.AddDays(-FIRST_SYNC_DAYS);
        }
        
        private void UpdateLastSync(string deviceIp, DateTime latestRecord)
        {
            _state.LastSyncPerDevice[deviceIp] = latestRecord;
            _state.LastRun = DateTime.Now;
            SaveState();
        }
        
        #endregion
        
        /// <summary>
        /// Sync attendance from all configured devices
        /// </summary>
        public async Task<SyncResult> SyncAllDevicesAsync(Action<string> log)
        {
            var result = new SyncResult();
            
            // Show sync mode
            var isFirstSync = _state.LastRun == DateTime.MinValue;
            if (isFirstSync)
            {
                log?.Invoke($"🔄 Sync ครั้งแรก - ดึงข้อมูล {FIRST_SYNC_DAYS} วันย้อนหลัง");
            }
            else
            {
                log?.Invoke($"🔄 Incremental Sync จาก {_state.LastRun:dd/MM HH:mm}");
            }
            
            log?.Invoke($"📡 {_devices.Count} devices...");
            
            foreach (var device in _devices)
            {
                try
                {
                    var syncStart = GetSyncStartDate(device.IP);
                    var deviceResult = await SyncDeviceAsync(device, syncStart, log);
                    
                    if (deviceResult != null)
                    {
                        result.TotalRecords += deviceResult.TotalRecords;
                        result.NewRecords += deviceResult.NewRecords;
                        
                        if (deviceResult.NewRecords > 0)
                        {
                            result.DevicesSynced++;
                            log?.Invoke($"✅ {device.Name}: +{deviceResult.NewRecords} รายการใหม่");
                        }
                        else if (deviceResult.TotalRecords > 0)
                        {
                            log?.Invoke($"✅ {device.Name}: ไม่มีข้อมูลใหม่");
                        }
                    }
                }
                catch (Exception)
                {
                    result.Errors++;
                }
            }
            
            // Create meal credits for today's attendance
            if (result.NewRecords > 0)
            {
                await CreateTodayMealCreditsAsync(log);
            }
            
            // แสดง 10 attendance ล่าสุดจาก Supabase เสมอ
            await ShowRecentAttendanceAsync(log);
            
            return result;
        }
        
        private async Task<SyncResult> SyncDeviceAsync(DeviceConfig device, DateTime syncFrom, Action<string> log)
        {
            var result = new SyncResult();
            
            try
            {
                // Method 1: Try SOAP API (if device supports it)
                var soapResult = await TrySoapSyncAsync(device, syncFrom, log);
                if (soapResult != null)
                {
                    return soapResult;
                }
                
                // Method 2: Try direct SDK connection
                var sdkResult = await TrySdkSyncAsync(device, syncFrom, log);
                if (sdkResult != null)
                {
                    return sdkResult;
                }
            }
            catch
            {
                // Device unreachable - skip quietly
            }
            
            return result;
        }
        
        private async Task<SyncResult> TrySoapSyncAsync(DeviceConfig device, DateTime syncFrom, Action<string> log)
        {
            try
            {
                // ZKTeco SOAP endpoint
                var soapUrl = $"http://{device.IP}/iWsService";
                
                // Try to ping first (fast timeout)
                using (var ping = new System.Net.NetworkInformation.Ping())
                {
                    var reply = ping.Send(device.IP, 500); // 500ms timeout
                    if (reply.Status != System.Net.NetworkInformation.IPStatus.Success)
                    {
                        return null; // Skip quietly
                    }
                }
                
                // SOAP request to get attendance logs
                var soapEnvelope = @"<?xml version=""1.0"" encoding=""utf-8""?>
<soap:Envelope xmlns:soap=""http://schemas.xmlsoap.org/soap/envelope/"">
  <soap:Body>
    <GetAttLog xmlns=""http://tempuri.org/"">
      <ArgComKey>0</ArgComKey>
    </GetAttLog>
  </soap:Body>
</soap:Envelope>";
                
                var content = new StringContent(soapEnvelope, Encoding.UTF8, "text/xml");
                content.Headers.Add("SOAPAction", "http://tempuri.org/GetAttLog");
                
                _http.Timeout = TimeSpan.FromSeconds(30);
                var response = await _http.PostAsync(soapUrl, content);
                
                if (response.IsSuccessStatusCode)
                {
                    var xml = await response.Content.ReadAsStringAsync();
                    return await ParseAndSaveAttendanceAsync(xml, device, syncFrom, log);
                }
            }
            catch (Exception ex)
            {
                // SOAP not available, try SDK
                log?.Invoke($"   SOAP ไม่พร้อม: {ex.Message}");
            }
            
            return null;
        }
        
        private async Task<SyncResult> TrySdkSyncAsync(DeviceConfig device, DateTime syncFrom, Action<string> log)
        {
            var result = new SyncResult();
            DateTime? latestRecordTime = null;
            
            try
            {
                // Try ZKTeco SDK (zkemkeeper)
                Type zkemType = Type.GetTypeFromProgID("zkemkeeper.ZKEM.1");
                if (zkemType == null)
                    return null;
                
                dynamic zkem = Activator.CreateInstance(zkemType);
                
                if (zkem.Connect_Net(device.IP, device.Port))
                {
                    log?.Invoke($"📡 เชื่อมต่อ {device.Name} ({device.IP}) สำเร็จ");
                    log?.Invoke($"   📅 Sync ตั้งแต่: {syncFrom:dd/MM/yyyy}");
                    
                    // Get attendance logs
                    if (zkem.ReadGeneralLogData(1))
                    {
                        string dwEnrollNumber = "";
                        int dwVerifyMode = 0;
                        int dwInOutMode = 0;
                        int dwYear = 0, dwMonth = 0, dwDay = 0, dwHour = 0, dwMinute = 0, dwSecond = 0;
                        int dwWorkCode = 0;
                        
                        while (zkem.SSR_GetGeneralLogData(1, out dwEnrollNumber, out dwVerifyMode, 
                            out dwInOutMode, out dwYear, out dwMonth, out dwDay, 
                            out dwHour, out dwMinute, out dwSecond, ref dwWorkCode))
                        {
                            var checkTime = new DateTime(dwYear, dwMonth, dwDay, dwHour, dwMinute, dwSecond);
                            
                            // Filter by sync start date AND valid range
                            // Skip future dates and dates before 2025
                            var maxValidDate = DateTime.Today.AddDays(1); // Tomorrow is max
                            var minValidDate = new DateTime(2025, 1, 1);
                            
                            if (checkTime >= syncFrom && checkTime < maxValidDate && checkTime >= minValidDate)
                            {
                                var saved = await SaveAttendanceRecordAsync(dwEnrollNumber, checkTime, "SCAN", device.IP, dwInOutMode);
                                
                                // Log record (without raw state)
                                var status = saved ? "✅ NEW" : "⏭️ DUP";
                                log?.Invoke($"   {status} {checkTime:dd/MM HH:mm} | PIN:{dwEnrollNumber}");
                                
                                if (saved)
                                    result.NewRecords++;
                                
                                result.TotalRecords++;
                                
                                // Track latest record for state update
                                if (!latestRecordTime.HasValue || checkTime > latestRecordTime.Value)
                                    latestRecordTime = checkTime;
                            }
                            // Skip invalid dates silently (future or too old)
                        }
                    }
                    
                    zkem.Disconnect();
                    
                    // Update last sync time if we got records
                    if (latestRecordTime.HasValue)
                    {
                        UpdateLastSync(device.IP, latestRecordTime.Value);
                    }
                }
                else
                {
                    return null;
                }
            }
            catch
            {
                return null;
            }
            
            return result;
        }
        
        private async Task<SyncResult> ParseAndSaveAttendanceAsync(string xml, DeviceConfig device, DateTime syncFrom, Action<string> log)
        {
            var result = new SyncResult();
            DateTime? latestRecordTime = null;
            
            // Parse SOAP response - format varies by device
            try
            {
                var doc = new System.Xml.XmlDocument();
                doc.LoadXml(xml);
                
                var rows = doc.GetElementsByTagName("Row");
                foreach (System.Xml.XmlNode row in rows)
                {
                    var pin = row.SelectSingleNode("PIN")?.InnerText;
                    var dateTimeStr = row.SelectSingleNode("DateTime")?.InnerText;
                    var status = row.SelectSingleNode("Status")?.InnerText;
                    
                    if (!string.IsNullOrEmpty(pin) && DateTime.TryParse(dateTimeStr, out var checkTime))
                    {
                        // Filter by sync start date AND valid range
                        var maxValidDate = DateTime.Today.AddDays(1);
                        var minValidDate = new DateTime(2025, 1, 1);
                        
                        if (checkTime >= syncFrom && checkTime < maxValidDate && checkTime >= minValidDate)
                        {
                            var rawState = int.TryParse(status, out var s) ? s : 0;
                            var saved = await SaveAttendanceRecordAsync(pin, checkTime, "SCAN", device.IP, rawState);
                            
                            // Log record (without raw state)
                            var logStatus = saved ? "✅ NEW" : "⏭️ DUP";
                            log?.Invoke($"   {logStatus} {checkTime:dd/MM HH:mm} | PIN:{pin}");
                            
                            if (saved)
                                result.NewRecords++;
                            
                            result.TotalRecords++;
                            
                            // Track latest record
                            if (!latestRecordTime.HasValue || checkTime > latestRecordTime.Value)
                                latestRecordTime = checkTime;
                        }
                    }
                }
                
                // Update last sync time
                if (latestRecordTime.HasValue)
                {
                    UpdateLastSync(device.IP, latestRecordTime.Value);
                }
            }
            catch (Exception ex)
            {
                log?.Invoke($"   Parse error: {ex.Message}");
            }
            
            return result;
        }

        private async Task<bool> SaveAttendanceRecordAsync(string employeeCode, DateTime checkTime, string checkType, string deviceName, int rawState = 0)
        {
            try
            {
                var attendance = new
                {
                    employee_code = employeeCode,
                    // เวลาจากเครื่อง ZKTeco เป็นเวลาไทย (UTC+7) - ระบุ timezone ให้ชัด
                    check_time = checkTime.ToString("yyyy-MM-ddTHH:mm:ss+07:00"),
                    // check_type ไม่ส่ง - schema เป็น VARCHAR(1) แต่เราต้องการ "SCAN"
                    raw_state = rawState,
                    device_ip = deviceName
                };
                
                var content = new StringContent(
                    JsonConvert.SerializeObject(attendance),
                    Encoding.UTF8,
                    "application/json");
                
                // ใช้ Prefer: resolution=ignore-duplicates สำหรับ upsert
                content.Headers.Add("Prefer", "resolution=ignore-duplicates,return=minimal");
                
                var response = await _http.PostAsync(
                    $"{_supabaseUrl}/rest/v1/attendance", 
                    content);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync();
                    // Check if it's a duplicate error (23505 = unique violation)
                    if (errorBody.Contains("23505") || errorBody.Contains("duplicate"))
                    {
                        return false; // Duplicate - expected
                    }
                    Console.WriteLine($"❌ Save error: {response.StatusCode} - {errorBody}");
                    return false;
                }
                
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Exception: {ex.Message}");
                return false;
            }
        }
        
        private async Task CreateTodayMealCreditsAsync(Action<string> log)
        {
            try
            {
                var today = DateTime.Today.ToString("yyyy-MM-dd");
                
                log?.Invoke($"💳 กำลังให้สิทธิ์ meal credits สำหรับวันที่ {today}...");
                
                var apiUrl = "http://localhost:3000/api/auto-grant-credits";
                var requestBody = new { date = today, grantOT = false };
                
                var content = new StringContent(
                    JsonConvert.SerializeObject(requestBody),
                    Encoding.UTF8,
                    "application/json");
                
                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(30);
                    var response = await client.PostAsync(apiUrl, content);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        var result = await response.Content.ReadAsStringAsync();
                        var json = JObject.Parse(result);
                        var lunchGranted = json["lunchGranted"]?.Value<int>() ?? 0;
                        var employees = json["employeesWithAttendance"]?.Value<int>() ?? 0;
                        
                        log?.Invoke($"✅ ให้สิทธิ์ lunch แล้ว {lunchGranted} คน (จากพนักงานที่มา {employees} คน)");
                    }
                    else
                    {
                        log?.Invoke($"⚠️ API error: {response.StatusCode}");
                    }
                }
            }
            catch (Exception ex)
            {
                log?.Invoke($"⚠️ ให้สิทธิ์ meal credit ล้มเหลว: {ex.Message}");
                log?.Invoke($"   (ตรวจสอบว่า Next.js server รันอยู่ที่ localhost:3000)");
            }
        }
        
        private async Task ShowRecentAttendanceAsync(Action<string> log)
        {
            try
            {
                var response = await _http.GetStringAsync(
                    $"{_supabaseUrl}/rest/v1/attendance?order=check_time.desc&limit=10&select=employee_code,check_time,check_type,device_ip");
                
                var records = JArray.Parse(response);
                
                if (records.Count > 0)
                {
                    log?.Invoke($"📋 Attendance ล่าสุดใน Supabase ({records.Count} รายการ):");
                    foreach (var rec in records)
                    {
                        var pin = rec["employee_code"]?.ToString();
                        var timeStr = rec["check_time"]?.ToString();
                        var device = rec["device_ip"]?.ToString();
                        
                        if (DateTime.TryParse(timeStr, out var checkTime))
                        {
                            log?.Invoke($"   📌 {checkTime:dd/MM HH:mm} | PIN:{pin} | {device}");
                        }
                    }
                }
                else
                {
                    log?.Invoke($"📋 ไม่มี attendance ใน Supabase");
                }
            }
            catch (Exception ex)
            {
                log?.Invoke($"⚠️ ดึง attendance: {ex.Message}");
            }
        }
    }
    
    public class DeviceConfig
    {
        public string Name { get; set; }
        public string IP { get; set; }
        public int Port { get; set; } = 4370;
    }
    
    public class SyncResult
    {
        public int DevicesSynced { get; set; }
        public int TotalRecords { get; set; }
        public int NewRecords { get; set; }
        public int Errors { get; set; }
    }
    
    public class SyncState
    {
        public DateTime LastRun { get; set; } = DateTime.MinValue;
        public Dictionary<string, DateTime> LastSyncPerDevice { get; set; } = new Dictionary<string, DateTime>();
    }
}
