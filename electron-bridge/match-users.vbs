' Export USERINFO from MDB to CSV for matching
Option Explicit

Dim conn, rs, fso, outFile
Dim mdbPath

mdbPath = "X:\FP-E-coupon\Thai01\ATT2000.MDB"

Set fso = CreateObject("Scripting.FileSystemObject")
Set outFile = fso.CreateTextFile("X:\FP-E-coupon\electron-bridge\mdb-users.csv", True)

Set conn = CreateObject("ADODB.Connection")
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=" & mdbPath

WScript.Echo "Exporting USERINFO from MDB..."

Set rs = CreateObject("ADODB.Recordset")
rs.Open "SELECT USERID, Badgenumber, Name, CardNo FROM USERINFO ORDER BY USERID", conn

' Header
outFile.WriteLine "USERID,Badgenumber,Name,CardNo"

Dim count
count = 0

Do While Not rs.EOF
    Dim line
    line = rs("USERID") & "," & _
           Replace(rs("Badgenumber") & "", """", """""") & "," & _
           Replace(rs("Name") & "", """", """""") & "," & _
           (rs("CardNo") & "")
    outFile.WriteLine line
    count = count + 1
    rs.MoveNext
Loop

outFile.Close
rs.Close
conn.Close

WScript.Echo "Exported " & count & " users to mdb-users.csv"
