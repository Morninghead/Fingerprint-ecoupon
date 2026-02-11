' Check specific user in MDB
Option Explicit

Dim conn, rs, mdbPath

mdbPath = "X:\FP-E-coupon\Thai01\ATT2000.MDB"

Set conn = CreateObject("ADODB.Connection")
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=" & mdbPath

' Check USERINFO
WScript.Echo "=== USERINFO for 25074 ==="
Set rs = CreateObject("ADODB.Recordset")
rs.Open "SELECT * FROM USERINFO WHERE USERID = 25074 OR Badgenumber = '25074'", conn

If rs.EOF Then
    WScript.Echo "NOT FOUND in USERINFO"
Else
    Do While Not rs.EOF
        WScript.Echo "USERID: " & rs("USERID")
        WScript.Echo "Badgenumber: " & rs("Badgenumber")
        WScript.Echo "Name: " & rs("Name")
        rs.MoveNext
    Loop
End If
rs.Close

' Check TEMPLATE
WScript.Echo ""
WScript.Echo "=== TEMPLATE for 25074 ==="
Set rs = CreateObject("ADODB.Recordset")
rs.CursorLocation = 3
rs.Open "SELECT USERID, FINGERID, TEMPLATE4 FROM TEMPLATE WHERE USERID = 25074", conn, 3, 1

If rs.EOF Then
    WScript.Echo "NOT FOUND in TEMPLATE"
Else
    Do While Not rs.EOF
        Dim size
        size = rs("TEMPLATE4").ActualSize
        WScript.Echo "USERID: " & rs("USERID") & ", FINGERID: " & rs("FINGERID") & ", Size: " & size & " bytes"
        rs.MoveNext
    Loop
End If
rs.Close

conn.Close
