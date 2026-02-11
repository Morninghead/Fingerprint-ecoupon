' VBScript to extract fingerprint templates from ATT2000.MDB
' Run with: cscript extract-templates.vbs

Option Explicit

Dim conn, rs, fso, folder, outputFile
Dim mdbPath, sql, templateData, userId, fingerId, fileName
Dim count, totalSize

mdbPath = "X:\FP-E-coupon\Thai01\ATT2000.MDB"

' Create output folder
Set fso = CreateObject("Scripting.FileSystemObject")
folder = "X:\FP-E-coupon\electron-bridge\templates"
If Not fso.FolderExists(folder) Then
    fso.CreateFolder folder
End If

' Connect to MDB
Set conn = CreateObject("ADODB.Connection")
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=" & mdbPath

WScript.Echo "Connected to MDB"
WScript.Echo "Extracting fingerprint templates..."
WScript.Echo ""

' Query templates
sql = "SELECT TEMPLATEID, USERID, FINGERID, TEMPLATE FROM TEMPLATE WHERE TEMPLATE IS NOT NULL"
Set rs = conn.Execute(sql)

count = 0
totalSize = 0

Do While Not rs.EOF
    userId = rs("USERID")
    fingerId = rs("FINGERID")
    templateData = rs("TEMPLATE")
    
    If Not IsNull(templateData) Then
        ' Check if it's actually binary data
        If VarType(templateData) = 8209 Then ' vbArray + vbByte
            fileName = folder & "\user_" & userId & "_finger_" & fingerId & ".bin"
            
            ' Save binary to file
            Dim stream
            Set stream = CreateObject("ADODB.Stream")
            stream.Type = 1 ' Binary
            stream.Open
            stream.Write templateData
            stream.SaveToFile fileName, 2 ' Overwrite
            stream.Close
            
            totalSize = totalSize + LenB(templateData)
            count = count + 1
            
            If count Mod 100 = 0 Then
                WScript.Echo "Extracted: " & count & " templates"
            End If
        Else
            WScript.Echo "User " & userId & " finger " & fingerId & ": Not binary data (type=" & VarType(templateData) & ")"
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
