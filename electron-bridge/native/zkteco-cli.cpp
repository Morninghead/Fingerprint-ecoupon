// ZKTeco SDK CLI Wrapper
// Compiles with Visual Studio C++ or MinGW
// Calls zkemsdk.dll for USB ZK9500 fingerprint operations

#include <windows.h>
#include <iostream>
#include <fstream>
#include <string>
#include <iomanip>
#include <vector>

// Function pointers for ZKTeco SDK
typedef int (__stdcall *PFN_ZKEM_Connect)(const char* ip, int port);
typedef int (__stdcall *PFN_ZKEM_Disconnect)();
typedef int (__stdcall *PFN_ZKEM_CaptureFingerprint)(unsigned char* fpData, int* length);
typedef int (__stdcall *PFN_ZKEM_GetDeviceVersion)(char* version);
typedef int (__stdcall *PFN_ZKEM_GetSerialNumber)(char* serial);

// Global function pointers
PFN_ZKEM_Connect g_Connect = NULL;
PFN_ZKEM_Disconnect g_Disconnect = NULL;
PFN_ZKEM_CaptureFingerprint g_CaptureFingerprint = NULL;
PFN_ZKEM_GetDeviceVersion g_GetDeviceVersion = NULL;
PFN_ZKEM_GetSerialNumber g_GetSerialNumber = NULL;

// Load ZK EMS SDK DLL and get function pointers
HMODULE LoadZKEMSDK() {
    HMODULE hModule = LoadLibrary("zkemsdk.dll");
    if (!hModule) {
        std::cerr << "{\"error\":\"Failed to load zkemsdk.dll\"}" << std::endl;
        return NULL;
    }

    g_Connect = (PFN_ZKEM_Connect)GetProcAddress(hModule, "ZKEM_Connect");
    g_Disconnect = (PFN_ZKEM_Disconnect)GetProcAddress(hModule, "ZKEM_Disconnect");
    g_CaptureFingerprint = (PFN_ZKEM_CaptureFingerprint)GetProcAddress(hModule, "ZKEM_CaptureFingerprint");
    g_GetDeviceVersion = (PFN_ZKEM_GetDeviceVersion)GetProcAddress(hModule, "ZKEM_GetDeviceVersion");
    g_GetSerialNumber = (PFN_ZKEM_GetSerialNumber)GetProcAddress(hModule, "ZKEM_GetSerialNumber");

    if (!g_CaptureFingerprint) {
        std::cerr << "{\"error\":\"CaptureFingerprint not found in DLL\"}" << std::endl;
    }

    return hModule;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cout << "{\"error\":\"Missing command\"}" << std::endl;
        return 1;
    }

    HMODULE hModule = LoadZKEMSDK();
    if (!hModule) return 1;

    std::string command(argv[1]);

    if (command == "capture") {
        if (!g_CaptureFingerprint) {
            std::cerr << "{\"error\":\"Capture function not available\"}" << std::endl;
            return 1;
        }

        unsigned char fpData[1024];
        int length = 0;

        int result = g_CaptureFingerprint(fpData, &length);

        if (result == 0 && length > 0) {
            // Output base64 encoded fingerprint template
            std::cout << "{\"success\":true,\"template\":\"";
            for (int i = 0; i < length; i++) {
                std::cout << std::hex << std::setw(2) << std::setfill('0') << (int)fpData[i];
            }
            std::cout << "\",\"length\":" << length << "}" << std::endl;
        } else {
            std::cerr << "{\"error\":\"Capture failed with code " << result << "\"}" << std::endl;
        }
    }
    else if (command == "version") {
        if (!g_GetDeviceVersion) {
            std::cerr << "{\"error\":\"Version function not available\"}" << std::endl;
            return 1;
        }

        char version[64] = {0};
        int result = g_GetDeviceVersion(version);

        if (result == 0) {
            std::cout << "{\"success\":true,\"version\":\"" << version << "\"}" << std::endl;
        } else {
            std::cerr << "{\"error\":\"GetVersion failed with code " << result << "\"}" << std::endl;
        }
    }
    else if (command == "serial") {
        if (!g_GetSerialNumber) {
            std::cerr << "{\"error\":\"Serial function not available\"}" << std::endl;
            return 1;
        }

        char serial[64] = {0};
        int result = g_GetSerialNumber(serial);

        if (result == 0) {
            std::cout << "{\"success\":true,\"serial\":\"" << serial << "\"}" << std::endl;
        } else {
            std::cerr << "{\"error\":\"GetSerial failed with code " << result << "\"}" << std::endl;
        }
    }
    else if (command == "connect") {
        if (argc < 3) {
            std::cerr << "{\"error\":\"Missing IP and port\"}" << std::endl;
            return 1;
        }

        if (!g_Connect) {
            std::cerr << "{\"error\":\"Connect function not available\"}" << std::endl;
            return 1;
        }

        int result = g_Connect(argv[2], atoi(argv[3]));

        if (result == 0) {
            std::cout << "{\"success\":true,\"connected\":true}" << std::endl;
        } else {
            std::cerr << "{\"error\":\"Connect failed with code " << result << "\"}" << std::endl;
        }
    }
    else if (command == "disconnect") {
        if (!g_Disconnect) {
            std::cerr << "{\"error\":\"Disconnect function not available\"}" << std::endl;
            return 1;
        }

        int result = g_Disconnect();

        if (result == 0) {
            std::cout << "{\"success\":true,\"connected\":false}" << std::endl;
        } else {
            std::cerr << "{\"error\":\"Disconnect failed with code " << result << "\"}" << std::endl;
        }
    }
    else {
        std::cout << "{\"error\":\"Unknown command: " << command << "\"}" << std::endl;
        return 1;
    }

    FreeLibrary(hModule);
    return 0;
}
