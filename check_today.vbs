Set conn = CreateObject("ADODB.Connection")
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=X:\FP-E-coupon\Thai01\ATT2000.MDB"

' Get today's date
today = Date()
WScript.Echo "Today: " & today

' Check attendance for today
WScript.Echo ""
WScript.Echo "=== TODAY's CHECK-IN ==="
sql = "SELECT c.USERID, c.CHECKTIME, c.CHECKTYPE, u.Name, u.Badgenumber " & _
      "FROM CHECKINOUT c " & _
      "LEFT JOIN USERINFO u ON c.USERID = u.USERID " & _
      "WHERE c.CHECKTIME >= #" & FormatDateTime(today, 2) & "# " & _
      "AND c.CHECKTYPE = 'I' " & _
      "ORDER BY c.CHECKTIME DESC"

On Error Resume Next
Set rs = conn.Execute(sql)
If Err.Number <> 0 Then
    WScript.Echo "Error: " & Err.Description
    Err.Clear
    ' Try simpler query
    sql = "SELECT TOP 20 USERID, CHECKTIME, CHECKTYPE FROM CHECKINOUT WHERE CHECKTYPE = 'I' ORDER BY CHECKTIME DESC"
    Set rs = conn.Execute(sql)
End If
On Error Goto 0

count = 0
Do While Not rs.EOF
    WScript.Echo rs("USERID") & " | " & rs("CHECKTIME") & " | " & rs("CHECKTYPE")
    count = count + 1
    If count >= 20 Then Exit Do
    rs.MoveNext
Loop

WScript.Echo ""
WScript.Echo "Total Check-ins found: " & count

conn.Close
