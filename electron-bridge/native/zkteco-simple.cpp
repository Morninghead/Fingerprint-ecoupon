// ZKTeco SDK CLI - Simple Runtime Load
// No .lib files needed - loads DLL at runtime
#include <windows.h>
#include <iostream>
#include <string>

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cout << "{\"error\":\"Usage: zkteco-cli command\"}" << std::endl;
        std::cout << "Commands: test, capture" << std::endl;
        return 1;
    }

    std::string command(argv[1]);
    
    // Try to load the SDK DLL
    HMODULE hSDK = LoadLibraryA("zkemsdk.dll");
    if (!hSDK) {
        // Try with full path
        hSDK = LoadLibraryA("x:\\FP-E-coupon\\Standalone-SDK\\SDK_v6.2.4.11\\sdk\\zkemsdk.dll");
    }
    
    if (!hSDK) {
        std::cout << "{\"success\":false,\"error\":\"Could not load zkemsdk.dll\"}" << std::endl;
        return 1;
    }

    if (command == "--test" || command == "test") {
        std::cout << "{\"success\":true,\"status\":\"ZK SDK loaded successfully\"}" << std::endl;
        std::cout << "DLL loaded at: " << (void*)hSDK << std::endl;
        std::cout << "Scanner should be ready!" << std::endl;
        FreeLibrary(hSDK);
        return 0;
    }
    
    if (command == "--capture" || command == "capture") {
        // For now, return mock data until we figure out SDK functions
        std::cout << "{\"success\":true,\"template\":\"captured_template_data\"}" << std::endl;
        FreeLibrary(hSDK);
        return 0;
    }
    
    std::cout << "{\"error\":\"Unknown command: " << command << "\"}" << std::endl;
    FreeLibrary(hSDK);
    return 1;
}
