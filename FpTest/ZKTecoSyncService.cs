using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FpTest
{
    /// <summary>
    /// Sync attendance from ZKTeco devices to Supabase
    /// Uses ZKTeco SOAP/SDK to connect to devices by IP
    /// </summary>
    public class ZKTecoSyncService
    {
        private readonly string _supabaseUrl;
        private readonly string _supabaseKey;
        private readonly HttpClient _http;
        
        // Device configurations
        private readonly List<DeviceConfig> _devices = new List<DeviceConfig>();
        
        public ZKTecoSyncService(string supabaseUrl, string supabaseKey)
        {
            _supabaseUrl = supabaseUrl.TrimEnd('/');
            _supabaseKey = supabaseKey;
            _http = new HttpClient();
            _http.DefaultRequestHeaders.Add("apikey", _supabaseKey);
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_supabaseKey}");
        }
        
        public void AddDevice(string name, string ip, int port = 4370)
        {
            _devices.Add(new DeviceConfig { Name = name, IP = ip, Port = port });
        }
        
        /// <summary>
        /// Sync attendance from all configured devices
        /// </summary>
        public async Task<SyncResult> SyncAllDevicesAsync(Action<string> log)
        {
            var result = new SyncResult();
            
            log?.Invoke($"🔄 เริ่ม Sync จาก {_devices.Count} devices...");
            
            foreach (var device in _devices)
            {
                try
                {
                    log?.Invoke($"📡 กำลังเชื่อมต่อ {device.Name} ({device.IP})...");
                    
                    var deviceResult = await SyncDeviceAsync(device, log);
                    result.TotalRecords += deviceResult.TotalRecords;
                    result.NewRecords += deviceResult.NewRecords;
                    result.DevicesSynced++;
                    
                    log?.Invoke($"✅ {device.Name}: {deviceResult.NewRecords} รายการใหม่");
                }
                catch (Exception ex)
                {
                    result.Errors++;
                    log?.Invoke($"❌ {device.Name}: {ex.Message}");
                }
            }
            
            // Create meal credits for today's attendance
            if (result.NewRecords > 0)
            {
                await CreateTodayMealCreditsAsync(log);
            }
            
            return result;
        }
        
        private async Task<SyncResult> SyncDeviceAsync(DeviceConfig device, Action<string> log)
        {
            var result = new SyncResult();
            
            // Try to connect via ZKTeco SDK
            // For now, use HTTP/SOAP if available
            
            try
            {
                // Method 1: Try SOAP API (if device supports it)
                var soapResult = await TrySoapSyncAsync(device, log);
                if (soapResult != null)
                {
                    return soapResult;
                }
                
                // Method 2: Try direct SDK connection
                // This requires the ZKTeco SDK to be installed
                var sdkResult = await TrySdkSyncAsync(device, log);
                if (sdkResult != null)
                {
                    return sdkResult;
                }
                
                log?.Invoke($"⚠️ ไม่สามารถเชื่อมต่อ {device.Name} ได้ - ข้าม");
            }
            catch (Exception ex)
            {
                log?.Invoke($"❌ Error syncing {device.Name}: {ex.Message}");
            }
            
            return result;
        }
        
        private async Task<SyncResult> TrySoapSyncAsync(DeviceConfig device, Action<string> log)
        {
            try
            {
                // ZKTeco SOAP endpoint
                var soapUrl = $"http://{device.IP}/iWsService";
                
                // Try to ping first
                using (var ping = new System.Net.NetworkInformation.Ping())
                {
                    var reply = ping.Send(device.IP, 2000);
                    if (reply.Status != System.Net.NetworkInformation.IPStatus.Success)
                    {
                        log?.Invoke($"⚠️ {device.IP} ไม่ตอบสนอง");
                        return null;
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
                    return await ParseAndSaveAttendanceAsync(xml, device, log);
                }
            }
            catch (Exception ex)
            {
                // SOAP not available, try SDK
                log?.Invoke($"   SOAP ไม่พร้อม: {ex.Message}");
            }
            
            return null;
        }
        
        private async Task<SyncResult> TrySdkSyncAsync(DeviceConfig device, Action<string> log)
        {
            var result = new SyncResult();
            
            try
            {
                // Try ZKTeco SDK (zkemkeeper)
                Type zkemType = Type.GetTypeFromProgID("zkemkeeper.ZKEM.1");
                if (zkemType == null)
                {
                    log?.Invoke($"   SDK (zkemkeeper) ไม่พบ");
                    return null;
                }
                
                dynamic zkem = Activator.CreateInstance(zkemType);
                
                if (zkem.Connect_Net(device.IP, device.Port))
                {
                    log?.Invoke($"   เชื่อมต่อ SDK สำเร็จ");
                    
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
                            
                            // Only sync today's records
                            if (checkTime.Date == DateTime.Today)
                            {
                                var saved = await SaveAttendanceRecordAsync(dwEnrollNumber, checkTime, 
                                    dwInOutMode == 0 ? "IN" : "OUT", device.Name);
                                
                                if (saved)
                                    result.NewRecords++;
                                
                                result.TotalRecords++;
                            }
                        }
                    }
                    
                    zkem.Disconnect();
                }
                else
                {
                    log?.Invoke($"   ไม่สามารถเชื่อมต่อ SDK");
                    return null;
                }
            }
            catch (Exception ex)
            {
                log?.Invoke($"   SDK error: {ex.Message}");
                return null;
            }
            
            return result;
        }
        
        private async Task<SyncResult> ParseAndSaveAttendanceAsync(string xml, DeviceConfig device, Action<string> log)
        {
            var result = new SyncResult();
            
            // Parse SOAP response - format varies by device
            // This is a simplified parser
            try
            {
                // Look for attendance data in response
                // Format: <Row><PIN>12345</PIN><DateTime>2024-02-06 08:30:00</DateTime><Status>0</Status></Row>
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
                        if (checkTime.Date == DateTime.Today)
                        {
                            var saved = await SaveAttendanceRecordAsync(pin, checkTime, 
                                status == "0" ? "IN" : "OUT", device.Name);
                            
                            if (saved)
                                result.NewRecords++;
                            
                            result.TotalRecords++;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                log?.Invoke($"   Parse error: {ex.Message}");
            }
            
            return result;
        }
        
        private async Task<bool> SaveAttendanceRecordAsync(string employeeCode, DateTime checkTime, string checkType, string deviceName)
        {
            try
            {
                // Get employee ID from Supabase
                var empResponse = await _http.GetStringAsync(
                    $"{_supabaseUrl}/rest/v1/employees?employee_code=eq.{employeeCode}&select=id");
                
                var employees = JArray.Parse(empResponse);
                if (employees.Count == 0)
                    return false;
                
                var employeeId = employees[0]["id"].ToString();
                
                // Insert attendance (ignore duplicates)
                var attendance = new
                {
                    employee_id = employeeId,
                    check_time = checkTime.ToString("o"),
                    check_type = checkType,
                    device_sn = deviceName
                };
                
                var content = new StringContent(
                    JsonConvert.SerializeObject(attendance),
                    Encoding.UTF8,
                    "application/json");
                
                content.Headers.Add("Prefer", "resolution=ignore-duplicates");
                
                var response = await _http.PostAsync($"{_supabaseUrl}/rest/v1/attendance", content);
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }
        
        private async Task CreateTodayMealCreditsAsync(Action<string> log)
        {
            try
            {
                var today = DateTime.Today.ToString("yyyy-MM-dd");
                
                // Get employees who checked in today but don't have meal credits
                var sql = $@"
                    INSERT INTO meal_credits (employee_id, date, lunch_available, ot_meal_available)
                    SELECT DISTINCT a.employee_id, '{today}'::date, true, false
                    FROM attendance a
                    WHERE DATE(a.check_time AT TIME ZONE 'Asia/Bangkok') = '{today}'::date
                    AND NOT EXISTS (
                        SELECT 1 FROM meal_credits mc 
                        WHERE mc.employee_id = a.employee_id AND mc.date = '{today}'::date
                    )";
                
                // Use Supabase RPC or direct SQL
                // For simplicity, we'll let the trigger handle it
                log?.Invoke($"💳 Meal credits จะถูกสร้างอัตโนมัติผ่าน trigger");
            }
            catch (Exception ex)
            {
                log?.Invoke($"⚠️ Credit creation: {ex.Message}");
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
}
