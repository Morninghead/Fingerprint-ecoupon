using System;
using System.Data.OleDb;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static readonly string MDB_PATH = @"X:\FP-E-coupon\Thai01\ATT2000.MDB";
    static readonly string SUPABASE_URL = "https://wfqqxembqjpyrlcjgepf.supabase.co";
    static readonly string SUPABASE_KEY = Environment.GetEnvironmentVariable("SUPABASE_KEY") ?? 
        File.ReadAllText(@"X:\FP-E-coupon\.env.local")
            .Split('\n')
            .ToList()
            .Find(l => l.StartsWith("NEXT_PUBLIC_SUPABASE_KEY="))
            ?.Split('=', 2)[1].Trim() ?? "";

    static async Task Main()
    {
        Console.WriteLine($"📂 Connecting to MDB: {MDB_PATH}");
        Console.WriteLine($"🌐 Supabase URL: {SUPABASE_URL}");
        
        string connStr = $@"Provider=Microsoft.Jet.OLEDB.4.0;Data Source={MDB_PATH};";
        
        using var conn = new OleDbConnection(connStr);
        conn.Open();
        Console.WriteLine("✅ Connected to MDB");
        
        // Read templates
        string sql = "SELECT USERID, FINGERID, TEMPLATE4, TEMPLATE FROM TEMPLATE";
        using var cmd = new OleDbCommand(sql, conn);
        using var reader = cmd.ExecuteReader();
        
        int processed = 0;
        int updated = 0;
        int errors = 0;
        
        using var httpClient = new HttpClient();
        httpClient.DefaultRequestHeaders.Add("apikey", SUPABASE_KEY);
        httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {SUPABASE_KEY}");
        httpClient.DefaultRequestHeaders.Add("Prefer", "resolution=merge-duplicates");
        
        while (reader.Read())
        {
            int userId = Convert.ToInt32(reader["USERID"]);
            int fingerId = Convert.ToInt32(reader["FINGERID"]);
            
            // Try TEMPLATE4 first (V10), fallback to TEMPLATE
            byte[] templateData = null;
            try { templateData = reader["TEMPLATE4"] as byte[]; } catch { }
            if (templateData == null || templateData.Length < 100)
            {
                try { templateData = reader["TEMPLATE"] as byte[]; } catch { }
            }
            
            if (templateData == null || templateData.Length < 100) continue;
            
            string base64Data = Convert.ToBase64String(templateData);
            
            // Log first few
            if (processed < 5)
            {
                var header = BitConverter.ToString(templateData, 0, 6).Replace("-", "");
                Console.WriteLine($"  #{processed+1}: userId={userId}, finger={fingerId}, size={templateData.Length}, header={header}");
            }
            
            // Upsert to Supabase
            var payload = new
            {
                mdb_user_id = userId,
                finger_id = fingerId,
                template_data = base64Data,
                template_size = templateData.Length,
                updated_at = DateTime.UtcNow.ToString("o")
            };
            
            var json = JsonSerializer.Serialize(new[] { payload });
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            
            var response = await httpClient.PostAsync(
                $"{SUPABASE_URL}/rest/v1/fingerprint_templates",
                content
            );
            
            if (response.IsSuccessStatusCode)
            {
                updated++;
            }
            else
            {
                errors++;
                if (errors <= 3)
                {
                    var errorText = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"  ❌ Error: {errorText}");
                }
            }
            
            processed++;
            
            // Progress
            if (processed % 500 == 0)
            {
                Console.WriteLine($"  ⏳ Processed {processed}...");
            }
        }
        
        Console.WriteLine();
        Console.WriteLine("✅ Import completed!");
        Console.WriteLine($"   Processed: {processed}");
        Console.WriteLine($"   Updated: {updated}");
        Console.WriteLine($"   Errors: {errors}");
    }
}
