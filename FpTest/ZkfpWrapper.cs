using System;
using System.Runtime.InteropServices;
using System.Text;

namespace FpTest
{
    /// <summary>
    /// ZKFinger C API Wrapper - uses libzkfp.dll directly
    /// Compatible with binary templates from ZKTeco devices
    /// </summary>
    public static class zkfp
    {
        public const int ZKFP_ERR_OK = 0;
        public const int ZKFP_ERR_INITLIB = -1;
        public const int ZKFP_ERR_INIT = -2;
        public const int ZKFP_ERR_NO_DEVICE = -3;
        public const int ZKFP_ERR_NOT_SUPPORT = -4;
        public const int ZKFP_ERR_INVALID_PARAM = -5;
        public const int ZKFP_ERR_OPEN = -6;
        public const int ZKFP_ERR_INVALID_HANDLE = -7;
        public const int ZKFP_ERR_CAPTURE = -8;
        public const int ZKFP_ERR_EXTRACT_FP = -9;
        public const int ZKFP_ERR_ABSORT = -10;
        public const int ZKFP_ERR_MEMORY_NOT_ENOUGH = -11;
        public const int ZKFP_ERR_BUSY = -12;
        public const int ZKFP_ERR_ADD_FINGER = -13;
        public const int ZKFP_ERR_DEL_FINGER = -14;
        public const int ZKFP_ERR_FAIL = -17;
        public const int ZKFP_ERR_CANCEL = -18;
        public const int ZKFP_ERR_VERIFY_FP = -20;
        public const int ZKFP_ERR_MERGE = -22;
        public const int ZKFP_ERR_NOT_OPENED = -23;
        public const int ZKFP_ERR_NOT_INIT = -24;
        public const int ZKFP_ERR_ALREADY_INIT = -25;

        // Parameter codes
        public const int CYCAPTER_PARAM_IMAGE_WIDTH = 1;
        public const int CYCAPTER_PARAM_IMAGE_HEIGHT = 2;
        public const int CYCAPTER_PARAM_IMAGE_DPI = 3;

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_Init();

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_Terminate();

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_GetDeviceCount();

        [DllImport("libzkfp.dll")]
        public static extern IntPtr ZKFPM_OpenDevice(int index);

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_CloseDevice(IntPtr handle);

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_GetParameters(IntPtr handle, int code, byte[] paramValue, ref int size);

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_AcquireFingerprint(IntPtr handle, byte[] fpImage, int cbFPImage, byte[] fpTemplate, ref int cbTemplate);

        [DllImport("libzkfp.dll")]
        public static extern IntPtr ZKFPM_DBInit();

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_DBFree(IntPtr handle);

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_DBAdd(IntPtr handle, int fid, byte[] fpTemplate, int cbTemplate);

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_DBDel(IntPtr handle, int fid);

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_DBClear(IntPtr handle);

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_DBCount(IntPtr handle);

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_DBIdentify(IntPtr handle, byte[] fpTemplate, int cbTemplate, ref int fid, ref int score);

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_DBMatch(IntPtr handle, byte[] template1, int cbTemplate1, byte[] template2, int cbTemplate2);

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_DBMerge(IntPtr handle, byte[] template1, byte[] template2, byte[] template3, byte[] regTemplate, ref int cbRegTemplate);

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_GenRegTemplate(byte[] template1, byte[] template2, byte[] template3, byte[] regTemplate, ref int cbRegTemplate);

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_ExtractFromImage(IntPtr handle, [MarshalAs(UnmanagedType.LPStr)] string pImageFile, int DPI, byte[] fpTemplate, ref int cbTemplate);

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_GetCaptureParams(IntPtr handle, ref int imageWidth, ref int imageHeight, ref int imageDPI);

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_GetCaptureParamsEx(IntPtr handle, ref int imageWidth, ref int imageHeight, ref int imageDPI);

        [DllImport("libzkfp.dll")]
        public static extern int ZKFPM_SetParameters(IntPtr handle, int code, byte[] paramValue, int size);
        
        // Helper methods
        public static int ByteArray2Int(byte[] buf, ref int value)
        {
            if (buf == null || buf.Length < 4)
            {
                value = 0;
                return -1;
            }
            value = buf[0] + buf[1] * 256 + buf[2] * 256 * 256 + buf[3] * 256 * 256 * 256;
            return 0;
        }

        public static string BlobToBase64(byte[] blob, int len)
        {
            if (blob == null || len <= 0)
                return "";
            byte[] temp = new byte[len];
            Array.Copy(blob, temp, len);
            return Convert.ToBase64String(temp);
        }

        public static byte[] Base64ToBlob(string base64)
        {
            if (string.IsNullOrEmpty(base64))
                return null;
            return Convert.FromBase64String(base64);
        }
        
        // ===== FPCacheDB Helper Methods =====
        
        /// <summary>
        /// Add fingerprint template to cache using string format (auto converts to binary)
        /// Templates from ZKTeco devices are in base64 string format
        /// </summary>
        /// <param name="dbHandle">Handle from ZKFPM_DBInit()</param>
        /// <param name="fid">Fingerprint ID (unique identifier)</param>
        /// <param name="templateStr">Template as base64 string</param>
        /// <returns>0 = success, other = error</returns>
        public static int AddRegTemplateStrToFPCacheDB(IntPtr dbHandle, int fid, string templateStr)
        {
            if (string.IsNullOrEmpty(templateStr))
                return -1;
                
            try
            {
                // ZKTeco templates from SSR_GetUserTmpStr are NOT base64!
                // They are hexadecimal strings - need to convert to bytes
                byte[] templateBytes;
                
                // Check if it's base64 or hex
                if (templateStr.Length > 0 && IsHexString(templateStr))
                {
                    // Convert hex string to bytes
                    templateBytes = HexStringToBytes(templateStr);
                }
                else
                {
                    // Try base64
                    templateBytes = Convert.FromBase64String(templateStr);
                }
                
                if (templateBytes == null || templateBytes.Length < 100)
                    return -2;
                    
                return ZKFPM_DBAdd(dbHandle, fid, templateBytes, templateBytes.Length);
            }
            catch
            {
                return -3;
            }
        }
        
        private static bool IsHexString(string str)
        {
            if (string.IsNullOrEmpty(str)) return false;
            // Hex strings only contain 0-9, A-F
            foreach (char c in str.ToUpperInvariant())
            {
                if (!((c >= '0' && c <= '9') || (c >= 'A' && c <= 'F')))
                    return false;
            }
            return true;
        }
        
        private static byte[] HexStringToBytes(string hex)
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
        
        /// <summary>
        /// Identify fingerprint in cache using binary template
        /// </summary>
        public static int IdentificationInFPCacheDB(IntPtr dbHandle, object capturedTemplate, ref object score, ref object processedNum)
        {
            byte[] templateBytes = capturedTemplate as byte[];
            if (templateBytes == null || templateBytes.Length == 0)
            {
                score = 0;
                processedNum = 0;
                return -1;
            }
            
            int fid = 0;
            int scoreInt = 0;
            int result = ZKFPM_DBIdentify(dbHandle, templateBytes, templateBytes.Length, ref fid, ref scoreInt);
            
            score = scoreInt;
            processedNum = ZKFPM_DBCount(dbHandle); // Get number of templates in DB
            
            return result == 0 ? fid : -1;
        }
        
        /// <summary>
        /// Create a new FPCacheDB
        /// </summary>
        public static IntPtr CreateFPCacheDB()
        {
            return ZKFPM_DBInit();
        }
        
        /// <summary>
        /// Close and free FPCacheDB
        /// </summary>
        public static int CloseFPCacheDB(IntPtr dbHandle)
        {
            return ZKFPM_DBFree(dbHandle);
        }
        
        /// <summary>
        /// Get count of templates in cache
        /// </summary>
        public static int GetFPCacheDBCount(IntPtr dbHandle)
        {
            return ZKFPM_DBCount(dbHandle);
        }
        
        /// <summary>
        /// Clear all templates from cache
        /// </summary>
        public static int ClearFPCacheDB(IntPtr dbHandle)
        {
            return ZKFPM_DBClear(dbHandle);
        }
        
        // Properties for compatibility (not actually settable in this lib)
        public static string FPEngineVersion { get; set; } = "10";
        public static int InitEngine() => ZKFPM_Init();
        public static int Terminate() => ZKFPM_Terminate();
        
        // Image display (placeholder - requires additional implementation)
        public static int PrintImageAt(int hdc, int x, int y, int width, int height)
        {
            // This would need specific image handling - return success for now
            return 0;
        }
    }
}
