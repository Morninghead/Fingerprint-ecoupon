{
  "targets": [
    {
      "target_name": "zkteco_native",
      "sources": ["zkteco-native.cpp"],
      "include_dirs": [
        "<(module_path)/../Standalone-SDK/Communication Protocol SDK(32Bit Ver6.2.4.11)/sdk"
      ],
      "libraries": ["-lzkemsdk", "-lusbcomm", "-lzkemkeeper"],
      "defines": ["WIN32", "UNICODE"],
      "conditions": [
        ["OS=='win'", {
          "libraries": ["-lzkemsdk", "-lusbcomm", "-lzkemkeeper"]
        }]
      ]
    }
  ]
}
