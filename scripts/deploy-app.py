#!/usr/bin/env python3
import os
import ftplib
import time
import pty
import select

HOST = "192.250.235.43"
USER = "yessban2"
PASS = "O5qe6bUi1:@WC8"

def upload_file(local_path, remote_dir, block_mb=2):
    size_mb = os.path.getsize(local_path) / (1024 * 1024)
    filename = os.path.basename(local_path)
    print(f"\n[Upload] Starting upload of {filename} ({size_mb:.2f} MB) to {remote_dir}...")
    
    ftp = ftplib.FTP(HOST, timeout=300)
    ftp.login(USER, PASS)
    ftp.cwd(remote_dir)
    
    start = time.time()
    uploaded = 0
    last_log = start

    def cb(data):
        nonlocal uploaded, last_log
        uploaded += len(data)
        now = time.time()
        if now - last_log > 3:
            pct = (uploaded / (size_mb * 1024 * 1024)) * 100
            rate = (uploaded / (1024 * 1024)) / (now - start)
            print(f"  [{pct:5.1f}%] {uploaded/(1024*1024):.1f}/{size_mb:.1f} MB ({rate:.2f} MB/s)")
            last_log = now

    with open(local_path, "rb") as f:
        ftp.storbinary(f"STOR {filename}", f, blocksize=block_mb * 1024 * 1024, callback=cb)

    elapsed = time.time() - start
    print(f"  [100.0%] Upload completed in {elapsed:.1f}s ({size_mb / max(elapsed, 0.1):.2f} MB/s)!")
    ftp.quit()

def run_ssh(cmd, timeout=120):
    print(f"\n[SSH] Running command on server:\n{cmd}")
    pid, fd = pty.fork()
    if pid == 0:
        os.execvp("ssh", ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null", f"{USER}@{HOST}", cmd])
    else:
        output = b""
        done_pwd = False
        start = time.time()
        while time.time() - start < timeout:
            r, _, _ = select.select([fd], [], [], 0.5)
            if r:
                try:
                    data = os.read(fd, 2048)
                    if not data:
                        break
                    output += data
                    if not done_pwd and b"password:" in output.lower():
                        os.write(fd, f"{PASS}\n".encode())
                        done_pwd = True
                except OSError:
                    break
        try:
            os.close(fd)
        except:
            pass
        return output.decode("utf-8", errors="replace")

def main():
    print("==================================================")
    print("      OUSHODHWALA APP DEPLOYMENT TO CPANEL         ")
    print("==================================================")
    
    # 1. Upload App Bundle
    upload_file("oushodhwala-app-deploy.tar.gz", "med.yessbangla.top")

    # 2. Remote Extraction & Service Reload
    ssh_script = """
    set -e
    cd ~/med.yessbangla.top
    
    echo "1. Preserving production .env..."
    cp .env .env.bak
    
    echo "2. Unpacking Application Bundle..."
    tar -xzf oushodhwala-app-deploy.tar.gz
    cp .env.bak .env
    
    echo "3. Reloading Phusion Passenger..."
    mkdir -p tmp
    touch tmp/restart.txt
    
    echo "4. Checking server status..."
    ls -lh server.js
    echo " Application deployment and restart complete!"
    """
    
    res = run_ssh(ssh_script)
    print("\n--- Remote Output ---")
    print(res)

if __name__ == "__main__":
    main()
