' Import all employees with fingerprints from MDB
' Group by employee code prefix (2x, 3x, 4x, 5x)
' Run with: C:\Windows\SysWOW64\cscript.exe import-all-employees.vbs

Option Explicit

Dim conn, rsUsers, rsTemplates, fso, outputFile
Dim mdbPath
Dim empCount, tplCount

mdbPath = "X:\FP-E-coupon\Thai01\ATT2000.MDB"

' Create output file
Set fso = CreateObject("Scripting.FileSystemObject")
Set outputFile = fso.CreateTextFile("X:\FP-E-coupon\electron-bridge\all_employees_with_fp.json", True)

' Connect to MDB
Set conn = CreateObject("ADODB.Connection")
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=" & mdbPath

WScript.Echo "Connected to MDB"
WScript.Echo "Importing employees and fingerprints..."
WScript.Echo ""

' Get all fingerprint templates (TEMPLATE4)
Dim templates
Set templates = CreateObject("Scripting.Dictionary")

Set rsTemplates = CreateObject("ADODB.Recordset")
rsTemplates.CursorLocation = 3
rsTemplates.Open "SELECT USERID, FINGERID, TEMPLATE4 FROM TEMPLATE WHERE TEMPLATE4 IS NOT NULL ORDER BY USERID, FINGERID", conn, 3, 1

WScript.Echo "Loading fingerprint templates..."
tplCount = 0

Do While Not rsTemplates.EOF
    Dim userId, fingerId, tplData, tplSize, tplBase64
    userId = rsTemplates.Fields("USERID").Value
    fingerId = rsTemplates.Fields("FINGERID").Value
    tplSize = rsTemplates.Fields("TEMPLATE4").ActualSize
    
    If tplSize > 10 Then
        tplData = rsTemplates.Fields("TEMPLATE4").GetChunk(tplSize)
        tplBase64 = BinaryToBase64(tplData)
        
        Dim key
        key = userId & "_" & fingerId
        templates.Add key, Array(fingerId, tplBase64, tplSize)
        tplCount = tplCount + 1
    End If
    
    rsTemplates.MoveNext
Loop
rsTemplates.Close

WScript.Echo "Loaded " & tplCount & " templates"
WScript.Echo ""

' Get all users
Set rsUsers = CreateObject("ADODB.Recordset")
rsUsers.CursorLocation = 3
rsUsers.Open "SELECT USERID, Badgenumber, Name FROM USERINFO ORDER BY Badgenumber", conn, 3, 1

' Group counters
Dim cnt2x, cnt3x, cnt4x, cnt5x, cntOther
cnt2x = 0 : cnt3x = 0 : cnt4x = 0 : cnt5x = 0 : cntOther = 0

' Write JSON header
outputFile.WriteLine "{"
outputFile.WriteLine "  ""employees"": ["

empCount = 0
Dim isFirst
isFirst = True

Do While Not rsUsers.EOF
    Dim mdbUserId, empCode, empName, prefix, company
    mdbUserId = rsUsers.Fields("USERID").Value
    empCode = rsUsers.Fields("Badgenumber").Value
    empName = rsUsers.Fields("Name").Value
    
    If IsNull(empCode) Then empCode = ""
    If IsNull(empName) Then empName = ""
    
    ' Skip empty employee codes
    If Len(empCode) > 0 Then
        ' Determine prefix group
        If Len(empCode) >= 1 Then
            prefix = Left(empCode, 1)
        Else
            prefix = "0"
        End If
        
        ' Set company placeholder based on prefix
        Select Case prefix
            Case "2"
                company = ""
                cnt2x = cnt2x + 1
            Case "3"
                company = ""
                cnt3x = cnt3x + 1
            Case "4"
                company = ""
                cnt4x = cnt4x + 1
            Case "5"
                company = ""
                cnt5x = cnt5x + 1
            Case Else
                company = ""
                cntOther = cntOther + 1
        End Select
        
        ' Clean strings
        empName = Replace(empName, "\", "\\")
        empName = Replace(empName, """", "\""")
        empName = Replace(empName, vbCr, "")
        empName = Replace(empName, vbLf, "")
        empCode = Replace(empCode, """", "\""")
        
        ' Get fingerprints for this user
        Dim fpArray, fpCount, i
        fpArray = ""
        fpCount = 0
        
        For i = 0 To 9
            Dim tplKey
            tplKey = mdbUserId & "_" & i
            If templates.Exists(tplKey) Then
                Dim tplInfo
                tplInfo = templates(tplKey)
                
                If fpCount > 0 Then fpArray = fpArray & ","
                fpArray = fpArray & vbCrLf & "        {"
                fpArray = fpArray & """finger_id"": " & tplInfo(0) & ", "
                fpArray = fpArray & """template_size"": " & tplInfo(2) & ", "
                fpArray = fpArray & """template_data"": """ & tplInfo(1) & """"
                fpArray = fpArray & "}"
                fpCount = fpCount + 1
            End If
        Next
        
        ' Only write if has fingerprints
        If fpCount > 0 Then
            If Not isFirst Then outputFile.WriteLine ","
            isFirst = False
            
            outputFile.Write "    {"
            outputFile.Write """mdb_user_id"": " & mdbUserId & ", "
            outputFile.Write """employee_code"": """ & empCode & """, "
            outputFile.Write """name"": """ & empName & """, "
            outputFile.Write """prefix"": """ & prefix & "x"", "
            outputFile.Write """company"": """ & company & """, "
            outputFile.Write """fingerprint_count"": " & fpCount & ", "
            outputFile.Write """fingerprints"": [" & fpArray & vbCrLf & "      ]"
            outputFile.Write "}"
            
            empCount = empCount + 1
            
            If empCount Mod 100 = 0 Then
                WScript.Echo "Processed: " & empCount & " employees"
            End If
        End If
    End If
    
    rsUsers.MoveNext
Loop

outputFile.WriteLine ""
outputFile.WriteLine "  ],"
outputFile.WriteLine "  ""summary"": {"
outputFile.WriteLine "    ""total_employees"": " & empCount & ","
outputFile.WriteLine "    ""total_templates"": " & tplCount & ","
outputFile.WriteLine "    ""group_2x"": " & cnt2x & ","
outputFile.WriteLine "    ""group_3x"": " & cnt3x & ","
outputFile.WriteLine "    ""group_4x"": " & cnt4x & ","
outputFile.WriteLine "    ""group_5x"": " & cnt5x & ","
outputFile.WriteLine "    ""group_other"": " & cntOther
outputFile.WriteLine "  }"
outputFile.WriteLine "}"

outputFile.Close
rsUsers.Close
conn.Close

WScript.Echo ""
WScript.Echo "====================================="
WScript.Echo "IMPORT COMPLETE"
WScript.Echo "====================================="
WScript.Echo "Total employees with FP: " & empCount
WScript.Echo "Total templates: " & tplCount
WScript.Echo ""
WScript.Echo "By prefix:"
WScript.Echo "  2x: " & cnt2x & " employees"
WScript.Echo "  3x: " & cnt3x & " employees"
WScript.Echo "  4x: " & cnt4x & " employees"
WScript.Echo "  5x: " & cnt5x & " employees"
WScript.Echo "  Other: " & cntOther & " employees"
WScript.Echo ""
WScript.Echo "Output: all_employees_with_fp.json"

' Function to convert binary to Base64
Function BinaryToBase64(binaryData)
    Dim domDoc, domElem
    Set domDoc = CreateObject("MSXML2.DOMDocument.3.0")
    Set domElem = domDoc.CreateElement("temp")
    domElem.DataType = "bin.base64"
    domElem.NodeTypedValue = binaryData
    BinaryToBase64 = Replace(Replace(domElem.Text, vbCr, ""), vbLf, "")
    Set domElem = Nothing
    Set domDoc = Nothing
End Function
