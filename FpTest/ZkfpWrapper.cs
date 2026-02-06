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
    }
}
