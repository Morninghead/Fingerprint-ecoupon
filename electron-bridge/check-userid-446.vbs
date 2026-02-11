' Check template by USERID 446
Option Explicit

Dim conn, rs, mdbPath

mdbPath = "X:\FP-E-coupon\Thai01\ATT2000.MDB"

Set conn = CreateObject("ADODB.Connection")
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=" & mdbPath

WScript.Echo "=== User 25074 (USERID=446) ==="
WScript.Echo ""

' Check TEMPLATE by USERID 446
Set rs = CreateObject("ADODB.Recordset")
rs.CursorLocation = 3
rs.Open "SELECT USERID, FINGERID, TEMPLATE4 FROM TEMPLATE WHERE USERID = 446", conn, 3, 1

If rs.EOF Then
    WScript.Echo "NO TEMPLATE for USERID 446"
Else
    WScript.Echo "Templates found:"
    Do While Not rs.EOF
        Dim size, data, hex10
        size = rs("TEMPLATE4").ActualSize
        
        If size > 10 Then
            data = rs("TEMPLATE4").GetChunk(20)
            hex10 = ""
            Dim i
            For i = 0 To 9
                hex10 = hex10 & Right("0" & Hex(AscB(MidB(data, i+1, 1))), 2) & " "
            Next
        End If
        
        WScript.Echo "  Finger " & rs("FINGERID") & ": " & size & " bytes | First 10: " & hex10
        rs.MoveNext
    Loop
End If
rs.Close

conn.Close
