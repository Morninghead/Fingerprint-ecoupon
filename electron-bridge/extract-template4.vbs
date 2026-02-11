' Extract fingerprint templates from TEMPLATE4 column (the actual data!)
' Run with: C:\Windows\SysWOW64\cscript.exe extract-template4.vbs

Option Explicit

Dim conn, rs, fso, folder
Dim mdbPath, userId, fingerId, fileName, templateData
Dim count, totalSize

mdbPath = "X:\FP-E-coupon\Thai01\ATT2000.MDB"

' Create output folder
Set fso = CreateObject("Scripting.FileSystemObject")
folder = "X:\FP-E-coupon\electron-bridge\fp-templates"
If Not fso.FolderExists(folder) Then
    fso.CreateFolder folder
End If

' Connect to MDB
Set conn = CreateObject("ADODB.Connection")
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=" & mdbPath

WScript.Echo "Connected to MDB"
WScript.Echo "Extracting fingerprint templates from TEMPLATE4 column..."
WScript.Echo ""

' Query with cursor
Set rs = CreateObject("ADODB.Recordset")
rs.CursorLocation = 3
rs.Open "SELECT USERID, FINGERID, TEMPLATE4 FROM TEMPLATE WHERE TEMPLATE4 IS NOT NULL", conn, 3, 1

count = 0
totalSize = 0

Do While Not rs.EOF
    userId = rs("USERID")
    fingerId = rs("FINGERID")
    
    Dim fieldSize
    fieldSize = rs("TEMPLATE4").ActualSize
    
    If fieldSize > 10 Then  ' Real template data
        templateData = rs("TEMPLATE4").GetChunk(fieldSize)
        
        fileName = folder & "\user_" & userId & "_finger_" & fingerId & ".bin"
        
        ' Save binary to file
        Dim stream
        Set stream = CreateObject("ADODB.Stream")
        stream.Type = 1 ' Binary
        stream.Open
        stream.Write templateData
        stream.SaveToFile fileName, 2 ' Overwrite
        stream.Close
        
        totalSize = totalSize + fieldSize
        count = count + 1
        
        If count Mod 100 = 0 Then
            WScript.Echo "Extracted: " & count & " templates"
        End If
    End If
    
    rs.MoveNext
Loop

rs.Close
conn.Close

WScript.Echo ""
WScript.Echo "====================================="
WScript.Echo "EXTRACTION COMPLETE"
WScript.Echo "====================================="
WScript.Echo "Total templates: " & count
WScript.Echo "Total size: " & FormatNumber(totalSize / 1024, 2) & " KB"
WScript.Echo "Output folder: " & folder
