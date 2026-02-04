// Node.js Native Addon for ZKTeco SDK
// Provides direct FFI bindings to zkemsdk.dll for USB ZK9500 fingerprint capture
// Compile with: node-gyp rebuild

#include <node_api.h>
#include <node_object_wrap.h>
#include <windows.h>
#include <string>

// ZKTeco SDK function signatures
typedef int (__stdcall *PFN_ZKEM_Connect)(const char* ip, int port);
typedef int (__stdcall *PFN_ZKEM_Disconnect)();
typedef int (__stdcall *PFN_ZKEM_CaptureFingerprint)(unsigned char* template, int* length);
typedef int (__stdcall *PFN_ZKEM_GetDeviceVersion)(char* version);

// Global DLL handles and function pointers
HMODULE g_hModule = NULL;
PFN_ZKEM_Connect g_Connect = NULL;
PFN_ZKEM_Disconnect g_Disconnect = NULL;
PFN_ZKEM_CaptureFingerprint g_CaptureFingerprint = NULL;
PFN_ZKEM_GetDeviceVersion g_GetDeviceVersion = NULL;

// Load ZK EMS SDK DLL and get function pointers
bool LoadSDK() {
    g_hModule = LoadLibrary("zkemsdk.dll");
    if (!g_hModule) {
        return false;
    }

    g_Connect = (PFN_ZKEM_Connect)GetProcAddress(g_hModule, "ZKEM_Connect");
    g_Disconnect = (PFN_ZKEM_Disconnect)GetProcAddress(g_hModule, "ZKEM_Disconnect");
    g_CaptureFingerprint = (PFN_ZKEM_CaptureFingerprint)GetProcAddress(g_hModule, "ZKEM_CaptureFingerprint");
    g_GetDeviceVersion = (PFN_ZKEM_GetDeviceVersion)GetProcAddress(g_hModule, "ZKEM_GetDeviceVersion");

    return g_Connect && g_Disconnect && g_CaptureFingerprint;
}

// Cleanup SDK
void UnloadSDK() {
    if (g_hModule) {
        FreeLibrary(g_hModule);
        g_hModule = NULL;
        g_Connect = NULL;
        g_Disconnect = NULL;
        g_CaptureFingerprint = NULL;
        g_GetDeviceVersion = NULL;
    }
}

// Native method: Connect to ZK device
Napi::Value Connect(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
    }

    std::string ip = info[0].As<Napi::String>().Utf8Value();
    int port = info[1].As<Napi::Number>().Int32Value();

    if (!g_Connect) {
        return Napi::Boolean::New(env, false);
    }

    int result = g_Connect(ip.c_str(), port);

    return Napi::Boolean::New(env, result == 0);
}

// Native method: Disconnect from ZK device
Napi::Value Disconnect(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!g_Disconnect) {
        return Napi::Boolean::New(env, false);
    }

    int result = g_Disconnect();

    return Napi::Boolean::New(env, result == 0);
}

// Native method: Capture fingerprint
Napi::Value CaptureFingerprint(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!g_CaptureFingerprint) {
        Napi::Error::New(env, "Capture function not loaded").ThrowAsJavaScriptException();
    }

    unsigned char template[1024];
    int length = 0;

    int result = g_CaptureFingerprint(template, &length);

    if (result == 0 && length > 0) {
        // Return as buffer
        return Napi::Buffer::Copy(env, template, length);
    } else {
        Napi::Error::New(env, "Capture failed").ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Native method: Get device version
Napi::Value GetVersion(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!g_GetDeviceVersion) {
        return Napi::String::New(env, "SDK not loaded");
    }

    char version[64] = {0};
    int result = g_GetDeviceVersion(version);

    if (result == 0) {
        return Napi::String::New(env, version);
    } else {
        return Napi::String::New(env, "");
    }
}

// Module initialization
Napi::Value Init(Napi::Env env, Napi::Object exports) {
    // Load SDK on module init
    if (!LoadSDK()) {
        Napi::Error::New(env, "Failed to load ZK SDK").ThrowAsJavaScriptException();
    }

    exports.Set("connect", Napi::Function::New(env, Connect));
    exports.Set("disconnect", Napi::Function::New(env, Disconnect));
    exports.Set("captureFingerprint", Napi::Function::New(env, CaptureFingerprint));
    exports.Set("getVersion", Napi::Function::New(env, GetVersion));

    return exports;
}

// Cleanup on module unload
void Cleanup(void*) {
    UnloadSDK();
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init, Cleanup)
