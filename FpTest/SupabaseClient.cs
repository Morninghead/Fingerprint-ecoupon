using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace FpTest
{
    public class SupabaseClient
    {
        private readonly string _url;
        private readonly string _key;
        private readonly HttpClient _client;
        
        // Cache for employee data (to avoid repeated API calls)
        private readonly System.Collections.Concurrent.ConcurrentDictionary<string, EmployeeWithCredit> _empCache 
            = new System.Collections.Concurrent.ConcurrentDictionary<string, EmployeeWithCredit>();
        private DateTime _cacheTime = DateTime.MinValue;

        public SupabaseClient(string url, string key)
        {
            _url = url.TrimEnd('/');
            _key = key;
            _client = new HttpClient();
            _client.Timeout = TimeSpan.FromSeconds(10); // 10 second timeout
            _client.DefaultRequestHeaders.Add("apikey", _key);
            _client.DefaultRequestHeaders.Add("Authorization", $"Bearer {_key}");
        }
        
        public void ClearCache() { _empCache.Clear(); _cacheTime = DateTime.MinValue; }
        
        // Helper for PATCH (not available in .NET 4.8)
        private async Task<HttpResponseMessage> SendPatchAsync(string url, HttpContent content)
        {
            var request = new HttpRequestMessage(new HttpMethod("PATCH"), url)
            {
                Content = content
            };
            return await _client.SendAsync(request);
        }

        /// <summary>
        /// Get employee by employee_code with their today's credits
        /// Uses cache for 30 seconds to speed up repeated scans
        /// </summary>
        public async Task<EmployeeWithCredit> GetEmployeeWithCreditAsync(string employeeCode)
        {
            // Check cache first (valid for 30 seconds)
            if (_empCache.TryGetValue(employeeCode, out var cached) && 
                (DateTime.Now - _cacheTime).TotalSeconds < 30)
            {
                return cached;
            }
            
            try
            {
                // First get employee with company
                var empResponse = await _client.GetStringAsync(
                    $"{_url}/rest/v1/employees?employee_code=eq.{employeeCode}&select=id,employee_code,name,company_id,companies(lunch_price,ot_meal_price)");
                
                var employees = JArray.Parse(empResponse);
                if (employees.Count == 0) return null;

                var emp = employees[0];
                var employeeId = emp["id"].ToString();
                var companyData = emp["companies"];
                
                var result = new EmployeeWithCredit
                {
                    EmployeeId = employeeId,
                    EmployeeCode = emp["employee_code"]?.ToString(),
                    Name = emp["name"]?.ToString(),
                    CompanyId = emp["company_id"]?.ToString(),
                    LunchPrice = companyData?["lunch_price"]?.Value<decimal>() ?? 45m,
                    OtMealPrice = companyData?["ot_meal_price"]?.Value<decimal>() ?? 45m
                };

                // Get today's credits
                var today = DateTime.Now.ToString("yyyy-MM-dd");
                var creditResponse = await _client.GetStringAsync(
                    $"{_url}/rest/v1/meal_credits?employee_id=eq.{employeeId}&date=eq.{today}&select=lunch_available,ot_meal_available");
                
                var credits = JArray.Parse(creditResponse);
                if (credits.Count > 0)
                {
                    result.LunchAvailable = credits[0]["lunch_available"]?.Value<bool>() ?? false;
                    result.OtMealAvailable = credits[0]["ot_meal_available"]?.Value<bool>() ?? false;
                    result.HasTodayCredit = true;
                }
                else
                {
                    result.HasTodayCredit = false;
                }

                // Get today's transactions to check if already used
                var transResponse = await _client.GetStringAsync(
                    $"{_url}/rest/v1/transactions?employee_id=eq.{employeeId}&timestamp=gte.{today}T00:00:00&timestamp=lt.{today}T23:59:59&select=meal_type,amount,timestamp");
                
                var transactions = JArray.Parse(transResponse);
                foreach (var tx in transactions)
                {
                    var mealType = tx["meal_type"]?.ToString();
                    if (mealType == "LUNCH") result.LunchUsed = true;
                    if (mealType == "OT_MEAL") result.OtMealUsed = true;
                }

                // Get today's attendance (check-in time)
                // Note: attendance table uses employee_code and check_type='I' for IN
                try
                {
                    var attendanceResponse = await _client.GetStringAsync(
                        $"{_url}/rest/v1/attendance?employee_code=eq.{employeeCode}&check_time=gte.{today}T00:00:00&check_type=eq.I&order=check_time.asc&limit=1");
                    
                    var attendance = JArray.Parse(attendanceResponse);
                    if (attendance.Count > 0)
                    {
                        var checkTimeStr = attendance[0]["check_time"]?.ToString();
                        if (DateTime.TryParse(checkTimeStr, out DateTime checkTime))
                        {
                            result.CheckInTime = checkTime;
                        }
                    }
                }
                catch { /* ไม่มี attendance - ไม่เป็นไร */ }

                // Update cache
                _empCache[employeeCode] = result;
                _cacheTime = DateTime.Now;
                
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Supabase error: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Record a meal transaction
        /// </summary>
        public async Task<bool> RecordMealTransactionAsync(string employeeId, string companyId, string mealType, decimal amount)
        {
            try
            {
                var transaction = new
                {
                    employee_id = employeeId,
                    company_id = companyId,
                    meal_type = mealType,
                    amount = amount,
                    is_override = false,
                    status = "VALID"
                };

                var content = new StringContent(
                    JsonConvert.SerializeObject(transaction),
                    Encoding.UTF8,
                    "application/json");

                content.Headers.Add("Prefer", "return=minimal");
                var response = await _client.PostAsync($"{_url}/rest/v1/transactions", content);
                
                if (response.IsSuccessStatusCode)
                {
                    // Mark credit as used
                    var today = DateTime.Now.ToString("yyyy-MM-dd");
                    var updateField = mealType == "LUNCH" ? "lunch_available" : "ot_meal_available";
                    
                    var updateContent = new StringContent(
                        $"{{\"{updateField}\": false}}",
                        Encoding.UTF8,
                        "application/json");

                    await SendPatchAsync(
                        $"{_url}/rest/v1/meal_credits?employee_id=eq.{employeeId}&date=eq.{today}",
                        updateContent);
                }

                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Transaction error: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Sync fingerprint template to Supabase
        /// </summary>
        public async Task<bool> SyncFingerprintTemplateAsync(string employeeId, int fingerId, string templateBase64)
        {
            try
            {
                // Check if fingerprint exists
                var checkResponse = await _client.GetStringAsync(
                    $"{_url}/rest/v1/fingerprint_templates?employee_id=eq.{employeeId}&finger_id=eq.{fingerId}");
                
                var existing = JArray.Parse(checkResponse);
                
                var template = new
                {
                    employee_id = employeeId,
                    finger_id = fingerId,
                    template_data = templateBase64,
                    template_version = "10",
                    updated_at = DateTime.UtcNow.ToString("o")
                };

                var content = new StringContent(
                    JsonConvert.SerializeObject(template),
                    Encoding.UTF8,
                    "application/json");

                HttpResponseMessage response;
                if (existing.Count > 0)
                {
                    // Update existing
                    response = await SendPatchAsync(
                        $"{_url}/rest/v1/fingerprint_templates?employee_id=eq.{employeeId}&finger_id=eq.{fingerId}",
                        content);
                }
                else
                {
                    // Insert new
                    content.Headers.Add("Prefer", "return=minimal");
                    response = await _client.PostAsync($"{_url}/rest/v1/fingerprint_templates", content);
                }

                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Sync error: {ex.Message}");
                return false;
            }
        }
    }

    public class EmployeeWithCredit
    {
        public string EmployeeId { get; set; }
        public string EmployeeCode { get; set; }
        public string Name { get; set; }
        public string CompanyId { get; set; }
        public bool HasTodayCredit { get; set; }
        public bool LunchAvailable { get; set; }
        public bool OtMealAvailable { get; set; }
        public bool LunchUsed { get; set; }
        public bool OtMealUsed { get; set; }
        public decimal LunchPrice { get; set; } = 45m;
        public decimal OtMealPrice { get; set; } = 45m;
        public DateTime? CheckInTime { get; set; }

        public string GetCreditStatus()
        {
            if (!HasTodayCredit) 
                return "❌ ไม่มี credit / No credit / ခွင့်မရှိ";
            
            var status = new StringBuilder();
            
            // Lunch status - 3 languages
            if (LunchAvailable && !LunchUsed)
                status.Append("🍚 อาหาร พร้อม / Lunch OK / ထမင်းရ  ");
            else if (LunchUsed)
                status.Append("✅ อาหาร ใช้แล้ว / Used / သုံးပြီး  ");
            else
                status.Append("❌ อาหาร ไม่มี / No Lunch / မရှိ  ");

            // OT status - 3 languages
            if (OtMealAvailable && !OtMealUsed)
                status.Append("🌙 OT พร้อม / OT OK / OT ရ");
            else if (OtMealUsed)
                status.Append("✅ OT ใช้แล้ว / Used");
            else
                status.Append("❌ OT ไม่มี / No OT");

            return status.ToString();
        }
    }
}
