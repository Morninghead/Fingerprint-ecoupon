' Check all columns in TEMPLATE table for actual binary data
Option Explicit

Dim conn, rs, mdbPath

mdbPath = "X:\FP-E-coupon\Thai01\ATT2000.MDB"

Set conn = CreateObject("ADODB.Connection")
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=" & mdbPath

WScript.Echo "Checking TEMPLATE table column sizes..."
WScript.Echo ""

Set rs = CreateObject("ADODB.Recordset")
rs.CursorLocation = 3
rs.Open "SELECT TOP 10 * FROM TEMPLATE", conn, 3, 1

Do While Not rs.EOF
    WScript.Echo "--- User " & rs("USERID") & " Finger " & rs("FINGERID") & " ---"
    
    Dim i
    For i = 0 To rs.Fields.Count - 1
        Dim fld, actualSize
        Set fld = rs.Fields(i)
        
        On Error Resume Next
        actualSize = fld.ActualSize
        If Err.Number <> 0 Then
            actualSize = -1
            Err.Clear
        End If
        On Error GoTo 0
        
        If actualSize > 0 Then
            WScript.Echo "  " & fld.Name & ": ActualSize=" & actualSize & ", Type=" & fld.Type
        End If
    Next
    
    rs.MoveNext
Loop

rs.Close
conn.Close
