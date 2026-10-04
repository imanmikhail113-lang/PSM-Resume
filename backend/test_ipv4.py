import socket
import time
from sqlalchemy import create_engine
import urllib.parse
import os
from dotenv import load_dotenv

load_dotenv()
db_uri = os.environ.get('SQLALCHEMY_DATABASE_URI')

# Parse URI
parsed = urllib.parse.urlparse(db_uri)
hostname = parsed.hostname
print(f"Original hostname: {hostname}")

try:
    ipv4 = socket.gethostbyname(hostname)
    print(f"Resolved IPv4: {ipv4}")
    
    # Rebuild URI with IP
    new_netloc = parsed.netloc.replace(hostname, ipv4)
    new_uri = parsed._replace(netloc=new_netloc).geturl()
    
    t0 = time.time()
    engine = create_engine(new_uri)
    conn = engine.connect()
    t1 = time.time()
    print(f"Connecting with IP took: {t1-t0:.4f} seconds")
except Exception as e:
    print("Error:", e)
