' VBScript to extract fingerprint templates from ATT2000.MDB
' Using ADO with GetChunk to read binary data properly
' Run with: C:\Windows\SysWOW64\cscript.exe extract-templates-v2.vbs

Option Explicit

Dim conn, rs, fso, folder
Dim mdbPath, sql, templateData, userId, fingerId, fileName
Dim count, totalSize, actualData

mdbPath = "X:\FP-E-coupon\Thai01\ATT2000.MDB"

' Create output folder
Set fso = CreateObject("Scripting.FileSystemObject")
folder = "X:\FP-E-coupon\electron-bridge\templates2"
If Not fso.FolderExists(folder) Then
    fso.CreateFolder folder
End If

' Connect to MDB - try different providers
Set conn = CreateObject("ADODB.Connection")

' Try Jet first
On Error Resume Next
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=" & mdbPath
If Err.Number <> 0 Then
    Err.Clear
    ' Try ACE
    conn.Open "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=" & mdbPath
End If
On Error GoTo 0

If conn.State <> 1 Then
    WScript.Echo "ERROR: Could not connect to database"
    WScript.Quit 1
End If

WScript.Echo "Connected to MDB"
WScript.Echo "Attempting to read fingerprint templates..."
WScript.Echo ""

' Create a recordset with cursor type that supports binary fields
Set rs = CreateObject("ADODB.Recordset")
rs.CursorLocation = 3 ' adUseClient
rs.Open "SELECT TEMPLATEID, USERID, FINGERID, TEMPLATE FROM TEMPLATE WHERE TEMPLATE IS NOT NULL", conn, 3, 1

count = 0
totalSize = 0

Do While Not rs.EOF
    userId = rs("USERID")
    fingerId = rs("FINGERID")
    
    ' Get actual field size
    Dim fieldSize
    fieldSize = rs("TEMPLATE").ActualSize
    
    If fieldSize > 4 Then  ' Only process if it's actual data, not just a 4-byte reference
        templateData = rs("TEMPLATE").GetChunk(fieldSize)
        
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
            WScript.Echo "Extracted: " & count & " templates (size > 4 bytes)"
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
WScript.Echo "Total templates with real data: " & count
WScript.Echo "Total size: " & FormatNumber(totalSize / 1024, 2) & " KB"
WScript.Echo "Output folder: " & folder
