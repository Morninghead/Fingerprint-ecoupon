Set conn = CreateObject("ADODB.Connection")
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=X:\FP-E-coupon\Thai01\ATT2000.MDB"

' List all tables
Set cat = CreateObject("ADOX.Catalog")
cat.ActiveConnection = conn
WScript.Echo "=== TABLES ==="
For Each tbl In cat.Tables
    If tbl.Type = "TABLE" Then
        WScript.Echo tbl.Name
    End If
Next

' Check CHECKINOUT table (attendance logs)
WScript.Echo ""
WScript.Echo "=== CHECKINOUT (Last 10) ==="
Set rs = conn.Execute("SELECT TOP 10 * FROM CHECKINOUT ORDER BY CHECKTIME DESC")
For i = 0 To rs.Fields.Count - 1
    WScript.Echo "Column: " & rs.Fields(i).Name
Next
WScript.Echo "---"
Do While Not rs.EOF
    WScript.Echo "USERID=" & rs("USERID") & " TIME=" & rs("CHECKTIME") & " TYPE=" & rs("CHECKTYPE")
    rs.MoveNext
Loop

conn.Close
