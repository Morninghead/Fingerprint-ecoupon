package com.zkteco.fp;

import com.zkteco.biometric.FingerprintSensorEx;
import com.zkteco.biometric.FingerprintSensorErrorCode;
import java.io.*;
import java.net.*;
import java.util.*;
import java.util.Base64;

/**
 * Java CLI for ZK9500 Fingerprint Scanner
 * Usage: java -jar FpJavaCLI.jar <command> [args]
 * 
 * Commands:
 * scan - Continuous scanning mode, outputs JSON on match
 * identify <base64> - Match single template against DB
 * load <json_file> - Load templates from JSON file into DB
 * test - Test device connection
 */
public class FpScanner {

    private static long mhDevice = 0;
    private static long mhDB = 0;
    private static int fpWidth = 0;
    private static int fpHeight = 0;
    private static boolean isRunning = true;

    // Store employee info for lookup
    private static Map<Integer, EmployeeInfo> employees = new HashMap<>();

    public static void main(String[] args) {
        if (args.length == 0) {
            printUsage();
            return;
        }

        String command = args[0].toLowerCase();

        try {
            switch (command) {
                case "test":
                    testDevice();
                    break;
                case "scan":
                    String templatesPath = args.length > 1 ? args[1] : null;
                    scanMode(templatesPath);
                    break;
                case "load":
                    if (args.length < 2) {
                        System.out.println("{\"error\": \"Missing JSON file path\"}");
                        return;
                    }
                    loadTemplates(args[1]);
                    break;
                default:
                    printUsage();
            }
        } catch (Exception e) {
            System.out.println("{\"error\": \"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private static void printUsage() {
        System.out.println("ZK9500 Fingerprint CLI");
        System.out.println("Usage:");
        System.out.println("  java -jar FpJavaCLI.jar test              - Test device");
        System.out.println("  java -jar FpJavaCLI.jar scan [json_file]  - Scan mode");
        System.out.println("  java -jar FpJavaCLI.jar load <json_file>  - Load templates");
    }

    private static void testDevice() {
        System.out.println("{\"status\": \"testing\"}");

        if (FingerprintSensorErrorCode.ZKFP_ERR_OK != FingerprintSensorEx.Init()) {
            System.out.println("{\"error\": \"Init failed\"}");
            return;
        }

        int deviceCount = FingerprintSensorEx.GetDeviceCount();
        if (deviceCount <= 0) {
            System.out.println("{\"error\": \"No devices found\", \"count\": " + deviceCount + "}");
            FingerprintSensorEx.Terminate();
            return;
        }

        mhDevice = FingerprintSensorEx.OpenDevice(0);
        if (mhDevice == 0) {
            System.out.println("{\"error\": \"Failed to open device\"}");
            FingerprintSensorEx.Terminate();
            return;
        }

        // Get device info
        byte[] paramValue = new byte[4];
        int[] size = new int[1];
        size[0] = 4;
        FingerprintSensorEx.GetParameters(mhDevice, 1, paramValue, size);
        fpWidth = byteArrayToInt(paramValue);
        size[0] = 4;
        FingerprintSensorEx.GetParameters(mhDevice, 2, paramValue, size);
        fpHeight = byteArrayToInt(paramValue);

        System.out.println("{\"success\": true, \"deviceCount\": " + deviceCount +
                ", \"width\": " + fpWidth + ", \"height\": " + fpHeight + "}");

        FingerprintSensorEx.CloseDevice(mhDevice);
        FingerprintSensorEx.Terminate();
    }

    private static void scanMode(String templatesPath) {
        // Initialize
        if (FingerprintSensorErrorCode.ZKFP_ERR_OK != FingerprintSensorEx.Init()) {
            System.out.println("{\"error\": \"Init failed\"}");
            return;
        }

        if (FingerprintSensorEx.GetDeviceCount() <= 0) {
            System.out.println("{\"error\": \"No devices found\"}");
            FingerprintSensorEx.Terminate();
            return;
        }

        mhDevice = FingerprintSensorEx.OpenDevice(0);
        if (mhDevice == 0) {
            System.out.println("{\"error\": \"Failed to open device\"}");
            FingerprintSensorEx.Terminate();
            return;
        }

        mhDB = FingerprintSensorEx.DBInit();
        if (mhDB == 0) {
            System.out.println("{\"error\": \"Failed to init DB\"}");
            cleanup();
            return;
        }

        // Get image dimensions
        byte[] paramValue = new byte[4];
        int[] size = new int[1];
        size[0] = 4;
        FingerprintSensorEx.GetParameters(mhDevice, 1, paramValue, size);
        fpWidth = byteArrayToInt(paramValue);
        size[0] = 4;
        FingerprintSensorEx.GetParameters(mhDevice, 2, paramValue, size);
        fpHeight = byteArrayToInt(paramValue);

        // Load templates if provided
        int loadedCount = 0;
        if (templatesPath != null) {
            loadedCount = loadTemplatesFromFile(templatesPath);
        }

        System.out.println("{\"status\": \"ready\", \"templates\": " + loadedCount +
                ", \"width\": " + fpWidth + ", \"height\": " + fpHeight + "}");
        System.out.flush();

        // Set up shutdown hook
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            isRunning = false;
            cleanup();
        }));

        // Scan loop
        byte[] imgbuf = new byte[fpWidth * fpHeight];
        byte[] template = new byte[2048];
        int[] templateLen = new int[1];

        while (isRunning) {
            templateLen[0] = 2048;
            int ret = FingerprintSensorEx.AcquireFingerprint(mhDevice, imgbuf, template, templateLen);

            if (ret == 0) {
                // Successfully captured fingerprint
                int[] fid = new int[1];
                int[] score = new int[1];

                ret = FingerprintSensorEx.DBIdentify(mhDB, template, fid, score);

                if (ret == 0 && fid[0] > 0) {
                    // Found match!
                    EmployeeInfo emp = employees.get(fid[0]);
                    if (emp != null) {
                        System.out.println("{\"match\": true, \"fid\": " + fid[0] +
                                ", \"score\": " + score[0] +
                                ", \"employeeCode\": \"" + escapeJson(emp.employeeCode) + "\"" +
                                ", \"name\": \"" + escapeJson(emp.name) + "\"" +
                                ", \"mdbUserId\": " + emp.mdbUserId + "}");
                    } else {
                        System.out.println("{\"match\": true, \"fid\": " + fid[0] +
                                ", \"score\": " + score[0] + "}");
                    }
                    System.out.flush();
                } else {
                    System.out.println("{\"match\": false, \"error\": " + ret + "}");
                    System.out.flush();
                }

                // Wait a bit before next scan
                try {
                    Thread.sleep(1000);
                } catch (Exception e) {
                }
            }

            try {
                Thread.sleep(100);
            } catch (Exception e) {
            }
        }

        cleanup();
    }

    private static int loadTemplatesFromFile(String path) {
        int loaded = 0;
        int failed = 0;
        int total = 0;
        try {
            String content = new String(java.nio.file.Files.readAllBytes(java.nio.file.Paths.get(path)));
            // Simple JSON parsing for templates array
            // Expected format: {"templates": [{"mdb_user_id": 1, "employee_code": "E001",
            // "finger_id": 0, "template_data": "base64..."}]}

            // Parse templates array
            int templatesStart = content.indexOf("\"templates\"");
            if (templatesStart < 0) {
                System.out.println("{\"warning\": \"No templates array found\"}");
                return 0;
            }

            int arrayStart = content.indexOf("[", templatesStart);
            int arrayEnd = content.lastIndexOf("]");
            if (arrayStart < 0 || arrayEnd < 0)
                return 0;

            String templatesJson = content.substring(arrayStart, arrayEnd + 1);

            // Parse each template object
            int pos = 0;
            while ((pos = templatesJson.indexOf("{", pos)) >= 0) {
                int objEnd = templatesJson.indexOf("}", pos);
                if (objEnd < 0)
                    break;

                String obj = templatesJson.substring(pos, objEnd + 1);

                try {
                    int mdbUserId = extractInt(obj, "mdb_user_id");
                    String employeeCode = extractString(obj, "employee_code");
                    int fingerId = extractInt(obj, "finger_id");
                    String templateData = extractString(obj, "template_data");

                    if (templateData != null && !templateData.isEmpty()) {
                        total++;
                        byte[] rawTemplateBytes = Base64.getDecoder().decode(templateData);

                        // Check for SS21 header and strip it
                        // SS21 format: bytes 2-5 = "SS21" (0x53 0x53 0x32 0x31)
                        // Try offset 20 as per ZKTeco documentation
                        byte[] cleanTemplate;
                        int headerOffset = 20; // Try 20 bytes offset
                        if (rawTemplateBytes.length > headerOffset &&
                                rawTemplateBytes[2] == 0x53 && rawTemplateBytes[3] == 0x53 &&
                                rawTemplateBytes[4] == 0x32 && rawTemplateBytes[5] == 0x31) {
                            // Strip header
                            cleanTemplate = new byte[rawTemplateBytes.length - headerOffset];
                            System.arraycopy(rawTemplateBytes, headerOffset, cleanTemplate, 0, cleanTemplate.length);

                            if (total <= 3) {
                                System.out.println("{\"debug\": \"SS21 header stripped\", \"offset\": " + headerOffset
                                        + ", \"originalSize\": " + rawTemplateBytes.length
                                        + ", \"cleanSize\": " + cleanTemplate.length + "}");
                                System.out.flush();
                            }
                        } else {
                            cleanTemplate = rawTemplateBytes;
                        }

                        // Pad to 2048 bytes as SDK expects
                        byte[] templateBytes = new byte[2048];
                        int copyLen = Math.min(cleanTemplate.length, 2048);
                        System.arraycopy(cleanTemplate, 0, templateBytes, 0, copyLen);

                        // Create unique FID (fingerprint ID) for DB
                        int fid = mdbUserId * 10 + fingerId;

                        int ret = FingerprintSensorEx.DBAdd(mhDB, fid, templateBytes);
                        if (ret == 0) {
                            loaded++;

                            // Store employee info
                            if (!employees.containsKey(fid)) {
                                EmployeeInfo emp = new EmployeeInfo();
                                emp.mdbUserId = mdbUserId;
                                emp.employeeCode = employeeCode != null ? employeeCode : String.valueOf(mdbUserId);
                                emp.name = "";
                                employees.put(fid, emp);
                            }

                            // Log first 3 successful
                            if (loaded <= 3) {
                                System.out.println("{\"debug\": \"DBAdd OK\", \"fid\": " + fid + ", \"size\": "
                                        + templateBytes.length + "}");
                                System.out.flush();
                            }
                        } else {
                            failed++;
                            // Log first 3 failures
                            if (failed <= 3) {
                                System.out.println("{\"debug\": \"DBAdd FAIL\", \"fid\": " + fid + ", \"size\": "
                                        + templateBytes.length + ", \"ret\": " + ret + "}");
                                System.out.flush();
                            }
                        }
                    }
                } catch (Exception e) {
                    // Skip invalid template
                }

                pos = objEnd + 1;
            }

            System.out.println("{\"loadSummary\": {\"total\": " + total + ", \"loaded\": " + loaded + ", \"failed\": "
                    + failed + "}}");
            System.out.flush();

        } catch (Exception e) {
            System.out.println("{\"warning\": \"Failed to load templates: " + escapeJson(e.getMessage()) + "\"}");
        }
        return loaded;
    }

    private static void loadTemplates(String path) {
        // Initialize DB only
        if (FingerprintSensorErrorCode.ZKFP_ERR_OK != FingerprintSensorEx.Init()) {
            System.out.println("{\"error\": \"Init failed\"}");
            return;
        }

        mhDB = FingerprintSensorEx.DBInit();
        if (mhDB == 0) {
            System.out.println("{\"error\": \"Failed to init DB\"}");
            FingerprintSensorEx.Terminate();
            return;
        }

        int loaded = loadTemplatesFromFile(path);
        System.out.println("{\"success\": true, \"loaded\": " + loaded + "}");

        FingerprintSensorEx.DBFree(mhDB);
        FingerprintSensorEx.Terminate();
    }

    private static void cleanup() {
        if (mhDB != 0) {
            FingerprintSensorEx.DBFree(mhDB);
            mhDB = 0;
        }
        if (mhDevice != 0) {
            FingerprintSensorEx.CloseDevice(mhDevice);
            mhDevice = 0;
        }
        FingerprintSensorEx.Terminate();
    }

    // Helper: extract int from JSON object
    private static int extractInt(String json, String key) {
        int keyPos = json.indexOf("\"" + key + "\"");
        if (keyPos < 0)
            return 0;
        int colonPos = json.indexOf(":", keyPos);
        if (colonPos < 0)
            return 0;
        int start = colonPos + 1;
        while (start < json.length() && !Character.isDigit(json.charAt(start)) && json.charAt(start) != '-')
            start++;
        int end = start;
        while (end < json.length() && (Character.isDigit(json.charAt(end)) || json.charAt(end) == '-'))
            end++;
        try {
            return Integer.parseInt(json.substring(start, end).trim());
        } catch (Exception e) {
            return 0;
        }
    }

    // Helper: extract string from JSON object
    private static String extractString(String json, String key) {
        int keyPos = json.indexOf("\"" + key + "\"");
        if (keyPos < 0)
            return null;
        int colonPos = json.indexOf(":", keyPos);
        if (colonPos < 0)
            return null;
        int quoteStart = json.indexOf("\"", colonPos + 1);
        if (quoteStart < 0)
            return null;
        int quoteEnd = json.indexOf("\"", quoteStart + 1);
        if (quoteEnd < 0)
            return null;
        return json.substring(quoteStart + 1, quoteEnd);
    }

    private static String escapeJson(String s) {
        if (s == null)
            return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }

    private static int byteArrayToInt(byte[] bytes) {
        int number = bytes[0] & 0xFF;
        number |= ((bytes[1] << 8) & 0xFF00);
        number |= ((bytes[2] << 16) & 0xFF0000);
        number |= ((bytes[3] << 24) & 0xFF000000);
        return number;
    }

    static class EmployeeInfo {
        int mdbUserId;
        String employeeCode;
        String name;
    }
}
