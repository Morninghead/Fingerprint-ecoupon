' Extract employee info and fingerprints with matching
' Run with: C:\Windows\SysWOW64\cscript.exe extract-users-with-fp.vbs

Option Explicit

Dim conn, rs, rsFP, fso, outputFile
Dim mdbPath
Dim count, fpCount

mdbPath = "X:\FP-E-coupon\Thai01\ATT2000.MDB"

' Create output file
Set fso = CreateObject("Scripting.FileSystemObject")
Set outputFile = fso.CreateTextFile("X:\FP-E-coupon\electron-bridge\users_with_fp.json", True)

' Connect to MDB
Set conn = CreateObject("ADODB.Connection")
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=" & mdbPath

WScript.Echo "Connected to MDB"
WScript.Echo "Extracting employee info with fingerprints..."
WScript.Echo ""

' Get fingerprint counts first
Dim fpCounts
Set fpCounts = CreateObject("Scripting.Dictionary")
Set rsFP = CreateObject("ADODB.Recordset")
rsFP.CursorLocation = 3
rsFP.Open "SELECT USERID, COUNT(*) AS FPCount FROM TEMPLATE WHERE TEMPLATE4 IS NOT NULL GROUP BY USERID", conn, 3, 1
Do While Not rsFP.EOF
    Dim uid, cnt
    uid = CStr(rsFP.Fields("USERID").Value)
    cnt = rsFP.Fields("FPCount").Value
    fpCounts.Add uid, cnt
    rsFP.MoveNext
Loop
rsFP.Close
Set rsFP = Nothing

WScript.Echo "Found " & fpCounts.Count & " users with fingerprints"
WScript.Echo ""

' Query USERINFO for employee data
Set rs = CreateObject("ADODB.Recordset")
rs.CursorLocation = 3
rs.Open "SELECT USERID, Badgenumber, Name FROM USERINFO ORDER BY USERID", conn, 3, 1

' Write JSON header
outputFile.WriteLine "{"
outputFile.WriteLine "  ""employees"": ["

count = 0
fpCount = 0

Do While Not rs.EOF
    Dim userId, name, badgeNum, hasFP, numFP
    
    userId = rs.Fields("USERID").Value
    name = rs.Fields("Name").Value
    badgeNum = rs.Fields("Badgenumber").Value
    
    If IsNull(name) Then name = ""
    If IsNull(badgeNum) Then badgeNum = ""
    
    ' Clean strings for JSON
    name = Replace(name, "\", "\\")
    name = Replace(name, """", "\""")
    name = Replace(name, vbCr, "")
    name = Replace(name, vbLf, "")
    
    badgeNum = Replace(badgeNum, "\", "\\")
    badgeNum = Replace(badgeNum, """", "\""")
    
    ' Check if user has fingerprints
    hasFP = fpCounts.Exists(CStr(userId))
    If hasFP Then
        numFP = fpCounts(CStr(userId))
        fpCount = fpCount + 1
    Else
        numFP = 0
    End If
    
    ' Write JSON object
    If count > 0 Then outputFile.WriteLine ","
    outputFile.Write "    {"
    outputFile.Write """mdb_user_id"": " & userId & ", "
    outputFile.Write """employee_code"": """ & badgeNum & """, "
    outputFile.Write """name"": """ & name & """, "
    outputFile.Write """has_fingerprint"": " & LCase(CStr(hasFP)) & ", "
    outputFile.Write """fingerprint_count"": " & numFP
    outputFile.Write "}"
    
    count = count + 1
    
    If count Mod 200 = 0 Then
        WScript.Echo "Processed: " & count & " employees"
    End If
    
    rs.MoveNext
Loop

outputFile.WriteLine ""
outputFile.WriteLine "  ],"
outputFile.WriteLine "  ""total_employees"": " & count & ","
outputFile.WriteLine "  ""employees_with_fp"": " & fpCount
outputFile.WriteLine "}"

outputFile.Close
rs.Close
conn.Close

WScript.Echo ""
WScript.Echo "====================================="
WScript.Echo "EXTRACTION COMPLETE"
WScript.Echo "====================================="
WScript.Echo "Total employees: " & count
WScript.Echo "Employees with fingerprints: " & fpCount
WScript.Echo "Output: users_with_fp.json"
