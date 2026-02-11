Set conn = CreateObject("ADODB.Connection")
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=X:\FP-E-coupon\Thai01\ATT2000.MDB"
Set rs = conn.Execute("SELECT TOP 5 USERID, FINGERID, TEMPLATE4, TEMPLATE FROM TEMPLATE")
Do While Not rs.EOF
    t4len = 0
    tlen = 0
    If Not IsNull(rs("TEMPLATE4")) Then t4len = LenB(rs("TEMPLATE4"))
    If Not IsNull(rs("TEMPLATE")) Then tlen = LenB(rs("TEMPLATE"))
    WScript.Echo "USERID=" & rs("USERID") & " FINGERID=" & rs("FINGERID") & " TEMPLATE4=" & t4len & " TEMPLATE=" & tlen
    rs.MoveNext
Loop
conn.Close
