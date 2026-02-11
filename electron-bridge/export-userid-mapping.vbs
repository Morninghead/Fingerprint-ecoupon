' Export USERID -> Badgenumber mapping from MDB
Option Explicit

Dim conn, rs, fso, outFile, mdbPath

mdbPath = "X:\FP-E-coupon\Thai01\ATT2000.MDB"

Set fso = CreateObject("Scripting.FileSystemObject")
Set outFile = fso.CreateTextFile("X:\FP-E-coupon\electron-bridge\userid-mapping.json", True)

Set conn = CreateObject("ADODB.Connection")
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=" & mdbPath

Set rs = CreateObject("ADODB.Recordset")
rs.Open "SELECT USERID, Badgenumber FROM USERINFO WHERE Badgenumber IS NOT NULL", conn

outFile.WriteLine "{"
Dim first
first = True

Do While Not rs.EOF
    If Not first Then outFile.WriteLine ","
    first = False
    outFile.Write """" & rs("USERID") & """: """ & rs("Badgenumber") & """"
    rs.MoveNext
Loop

outFile.WriteLine ""
outFile.WriteLine "}"
outFile.Close
rs.Close
conn.Close

WScript.Echo "Exported USERID -> Badgenumber mapping"
