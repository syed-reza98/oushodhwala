import ftplib
import os

HOST = os.environ.get("CPANEL_HOST", "")
USER = os.environ.get("CPANEL_USER", "")
PASS = os.environ.get("CPANEL_PASS", "")

if not HOST or not USER or not PASS:
    raise SystemExit("[Error] CPANEL_HOST, CPANEL_USER and CPANEL_PASS environment variables must be set.")

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
