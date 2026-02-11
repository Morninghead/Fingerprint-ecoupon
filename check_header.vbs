Set conn = CreateObject("ADODB.Connection")
conn.Open "Provider=Microsoft.Jet.OLEDB.4.0;Data Source=X:\FP-E-coupon\Thai01\ATT2000.MDB"
Set rs = conn.Execute("SELECT TOP 3 USERID, FINGERID, TEMPLATE4 FROM TEMPLATE")
Do While Not rs.EOF
    t4 = rs("TEMPLATE4")
    If Not IsNull(t4) And LenB(t4) > 10 Then
        header = ""
        For i = 1 To 10
            b = AscB(MidB(t4, i, 1))
            h = Hex(b)
            If Len(h) = 1 Then h = "0" & h
            header = header & h
        Next
        WScript.Echo "USERID=" & rs("USERID") & " Header=" & header
    End If
    rs.MoveNext
Loop
conn.Close
