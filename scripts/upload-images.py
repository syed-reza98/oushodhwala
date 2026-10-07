#!/usr/bin/env python3
import os
import ftplib
import time
import subprocess

TAR_PATH = "product-images.tar.gz"
SOURCE_DIR = "storage/uploads/product-images"

print(f"Archiving {SOURCE_DIR} into {TAR_PATH}...")
start_tar = time.time()
subprocess.run(["tar", "-czf", TAR_PATH, "-C", "storage/uploads", "product-images"], check=True)
tar_size = os.path.getsize(TAR_PATH) / (1024 * 1024)
print(f"Archive created: {tar_size:.2f} MB in {time.time() - start_tar:.1f}s")

HOST = os.environ.get("CPANEL_HOST", "192.250.235.43")
USER = os.environ.get("CPANEL_USER", "")
PASS = os.environ.get("CPANEL_PASS", "")

if not USER or not PASS:
    print("[Error] CPANEL_USER and CPANEL_PASS environment variables must be set.")
    exit(1)

print("Connecting to cPanel FTP...")
ftp = ftplib.FTP(HOST, timeout=120)
ftp.login(USER, PASS)
ftp.cwd("med.yessbangla.top/storage/uploads")

print(f"Starting upload of {TAR_PATH} ({tar_size:.2f} MB)...")
start_up = time.time()
with open(TAR_PATH, "rb") as f:
    ftp.storbinary(f"STOR {TAR_PATH}", f, blocksize=2 * 1024 * 1024)

elapsed = time.time() - start_up
print(f"Upload completed in {elapsed:.1f}s ({tar_size / elapsed:.2f} MB/s)!")
ftp.quit()
