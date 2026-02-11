// ZK9500 Fingerprint Scanner CLI - With Image Capture
// Supports: test, capture [timeout_seconds]
// Default timeout: 10 seconds

#include <windows.h>
#include <iostream>
#include <string>
#include <vector>
#include <cstdlib>

// SDK headers
#include "libzkfp.h"
#include "libzkfperrdef.h"
#include "libzkfptype.h"

#define MAX_TEMPLATE_SIZE 2048
#define DEFAULT_TIMEOUT_SECONDS 30

// Base64 encoding table
static const char base64_chars[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Base64 encode function
std::string base64_encode(const unsigned char* data, size_t len) {
    std::string result;
    result.reserve(((len + 2) / 3) * 4);
    
    for (size_t i = 0; i < len; i += 3) {
        unsigned int n = data[i] << 16;
        if (i + 1 < len) n |= data[i + 1] << 8;
        if (i + 2 < len) n |= data[i + 2];
        
        result += base64_chars[(n >> 18) & 0x3F];
        result += base64_chars[(n >> 12) & 0x3F];
        result += (i + 1 < len) ? base64_chars[(n >> 6) & 0x3F] : '=';
        result += (i + 2 < len) ? base64_chars[n & 0x3F] : '=';
    }
    return result;
}

// SDK Error code descriptions
const char* getErrorDescription(int code) {
    switch (code) {
        case 0:  return "Success";
        case -1: return "SDK not initialized";
        case -2: return "Invalid parameter";
        case -3: return "Device open failed";
        case -4: return "Device not found";
        case -5: return "Driver error";
        case -6: return "Device not open";
        case -7: return "Capture in progress";
        case -8: return "No finger detected";  // ZKFP_ERR_TIMEOUT
        case -9: return "Algorithm error";
        case -10: return "Database error";
        case -11: return "Unknown error";
        case -12: return "Memory allocation failed";
        case -13: return "Invalid template";
        case -14: return "Merge template error";
        case -15: return "Not enrolled";
        case -16: return "Already enrolled";
        case -17: return "Busy";
        default: return "Unknown error";
    }
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cout << "{\"success\":false,\"error\":\"Usage: zk9500-cli [test|capture] [timeout_seconds]\"}" << std::endl;
        return 1;
    }

    std::string command(argv[1]);
    
    // Parse optional timeout parameter (default 10 seconds)
    int timeoutSeconds = DEFAULT_TIMEOUT_SECONDS;
    if (argc >= 3) {
        timeoutSeconds = std::atoi(argv[2]);
        if (timeoutSeconds <= 0 || timeoutSeconds > 120) {
            timeoutSeconds = DEFAULT_TIMEOUT_SECONDS;
        }
    }

    // Initialize SDK
    int ret = ZKFPM_Init();
    if (ret != ZKFP_ERR_OK) {
        std::cout << "{\"success\":false,\"error\":\"Failed to initialize SDK\",\"code\":" << ret 
                  << ",\"message\":\"" << getErrorDescription(ret) << "\"}" << std::endl;
        return 1;
    }

    // Get device count
    int deviceCount = ZKFPM_GetDeviceCount();
    if (deviceCount == 0) {
        std::cout << "{\"success\":false,\"error\":\"No fingerprint devices found\",\"code\":-4"
                  << ",\"message\":\"Please connect the ZK9500 scanner\"}" << std::endl;
        ZKFPM_Terminate();
        return 1;
    }

    if (command == "test") {
        std::cout << "{\"success\":true,\"devices\":" << deviceCount 
                  << ",\"message\":\"Scanner ready\"}" << std::endl;
        ZKFPM_Terminate();
        return 0;
    }

    if (command == "capture") {
        // Open first device
        HANDLE hDevice = ZKFPM_OpenDevice(0);
        if (hDevice == NULL) {
            std::cout << "{\"success\":false,\"error\":\"Failed to open device\",\"code\":-3"
                      << ",\"message\":\"Device may be in use by another application\"}" << std::endl;
            ZKFPM_Terminate();
            return 1;
        }

        // Get image width and height (CRITICAL - from demo code!)
        unsigned int size = 4;
        int imgWidth = 0;
        ZKFPM_GetParameters(hDevice, 1, (unsigned char*)&imgWidth, &size);
        
        size = 4;
        int imgHeight = 0;
        ZKFPM_GetParameters(hDevice, 2, (unsigned char*)&imgHeight, &size);

        std::cerr << "[DEBUG] Image size: " << imgWidth << "x" << imgHeight << std::endl;
        std::cerr << "[DEBUG] Timeout: " << timeoutSeconds << " seconds" << std::endl;

        if (imgWidth == 0 || imgHeight == 0) {
            std::cout << "{\"success\":false,\"error\":\"Failed to get image dimensions\",\"code\":-2"
                      << ",\"message\":\"Device communication error\"}" << std::endl;
            ZKFPM_CloseDevice(hDevice);
            ZKFPM_Terminate();
            return 1;
        }

        // Allocate image buffer (width * height)
        std::vector<unsigned char> imgBuf(imgWidth * imgHeight);
        
        // Allocate template buffer
        unsigned char template_buf[MAX_TEMPLATE_SIZE];
        unsigned int templateLen = MAX_TEMPLATE_SIZE;

        std::cerr << "[STATUS] Ready! Place finger on scanner..." << std::endl;
        std::cerr << "[DEBUG] Waiting for fingerprint (timeout: " << timeoutSeconds << "s)" << std::endl;

        // Poll for fingerprint with configurable timeout
        int attempts = 0;
        while (attempts < timeoutSeconds) {
            // Capture fingerprint with IMAGE buffer
            ret = ZKFPM_AcquireFingerprint(hDevice, imgBuf.data(), imgWidth * imgHeight, template_buf, &templateLen);

            if (ret == ZKFP_ERR_OK) {
                // FINGER DETECTED! Log base64 template to stderr for debugging
                std::string templateBase64 = base64_encode(template_buf, templateLen);
                std::cerr << "[SUCCESS] Finger detected! Template captured." << std::endl;
                std::cerr << "[DEBUG] Template size: " << templateLen << " bytes" << std::endl;
                std::cerr << "[DEBUG] Template Base64 (first 100 chars): " << templateBase64.substr(0, 100) << "..." << std::endl;
                std::cerr << "[DEBUG] Full Template Base64: " << templateBase64 << std::endl;
                
                // Success! Return both template and image
                std::cout << "{\"success\":true,\"template\":\"";
                for (unsigned int i = 0; i < templateLen; i++) {
                    printf("%02x", template_buf[i]);
                }
                std::cout << "\",";
                
                // Add image data (hex encoded)
                std::cout << "\"image\":\"";
                for (unsigned int i = 0; i < (unsigned int)(imgWidth * imgHeight); i++) {
                    printf("%02x", imgBuf[i]);
                }
                std::cout << "\",";
                
                // Add base64 template for convenience
                std::cout << "\"templateBase64\":\"" << templateBase64 << "\",";
                
                std::cout << "\"width\":" << imgWidth << ",";
                std::cout << "\"height\":" << imgHeight << ",";
                std::cout << "\"size\":" << templateLen << ",";
                std::cout << "\"elapsed_seconds\":" << (attempts + 1) << ",";
                std::cout << "\"message\":\"Fingerprint captured successfully\"}" << std::endl;
                
                ZKFPM_CloseDevice(hDevice);
                ZKFPM_Terminate();
                return 0;
            }
            
            // If timeout/no finger, keep trying until our timeout
            if (ret == ZKFP_ERR_TIMEOUT || ret == -8) {
                attempts++;
                if (attempts % 5 == 0) {
                    std::cerr << "[DEBUG] Waiting for finger... (" << attempts << "/" << timeoutSeconds << "s)" << std::endl;
                }
                Sleep(1000);  // Wait 1 second before next attempt
                continue;
            }
            
            // Other error - stop immediately
            std::cerr << "[ERROR] Capture failed with code: " << ret << " - " << getErrorDescription(ret) << std::endl;
            std::cout << "{\"success\":false,\"error\":\"Capture failed\",\"code\":" << ret 
                      << ",\"message\":\"" << getErrorDescription(ret) << "\"}" << std::endl;
            ZKFPM_CloseDevice(hDevice);
            ZKFPM_Terminate();
            return 1;
        }

        // Timeout - no finger detected within the time limit
        std::cerr << "[TIMEOUT] No finger detected within " << timeoutSeconds << " seconds" << std::endl;
        std::cout << "{\"success\":false,\"error\":\"Timeout\",\"code\":-8"
                  << ",\"timeout_seconds\":" << timeoutSeconds
                  << ",\"message\":\"No finger detected within " << timeoutSeconds << " seconds. Please place your finger on the scanner.\"}" << std::endl;
        ZKFPM_CloseDevice(hDevice);
        ZKFPM_Terminate();
        return 1;
    }

    std::cout << "{\"success\":false,\"error\":\"Unknown command\",\"message\":\"Use 'test' or 'capture [timeout]'\"}" << std::endl;
    ZKFPM_Terminate();
    return 1;
}
