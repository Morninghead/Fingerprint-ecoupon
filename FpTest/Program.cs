using System;
using System.IO;
using System.Windows.Forms;

namespace FpTest
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            
            // Global exception handlers
            AppDomain.CurrentDomain.UnhandledException += (s, e) =>
            {
                var ex = e.ExceptionObject as Exception;
                File.WriteAllText("crash_log.txt", $"[{DateTime.Now}] UnhandledException:\n{ex}");
                MessageBox.Show($"Crash: {ex?.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            };
            
            Application.ThreadException += (s, e) =>
            {
                File.WriteAllText("crash_log.txt", $"[{DateTime.Now}] ThreadException:\n{e.Exception}");
                MessageBox.Show($"Thread Error: {e.Exception.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            };
            
            try
            {
                Application.Run(new MainForm());
            }
            catch (Exception ex)
            {
                File.WriteAllText("crash_log.txt", $"[{DateTime.Now}] Main Exception:\n{ex}");
                MessageBox.Show($"Error: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
