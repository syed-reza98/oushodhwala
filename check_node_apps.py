import ftplib

HOST = "192.250.235.43"
USER = "yessban2"
PASS = "O5qe6bUi1:@WC8"

ftp = ftplib.FTP(HOST, timeout=30)
ftp.login(USER, PASS)

node_dirs = []
items = []
ftp.retrlines("LIST", items.append)

for item in items:
    name = item.split()[-1]
    if item.startswith("d") and ("yessbangla.top" in name or "com" in name):
        try:
            ftp.cwd(f"/{name}")
            sub_items = []
            ftp.retrlines("NLST", sub_items.append)
            if "package.json" in sub_items or "server.js" in sub_items or "app.js" in sub_items:
                node_dirs.append((name, sub_items))
        except Exception:
            pass

print(f"Discovered {len(node_dirs)} Node.js applications under account:")
for d, sub in node_dirs:
    app_files = [x for x in ["package.json", "server.js", "app.js", "index.js", ".htaccess"] if x in sub]
    print(f" - {d}: {app_files}")

ftp.quit()
