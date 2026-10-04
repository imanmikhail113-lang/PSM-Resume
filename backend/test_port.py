import time
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
import urllib.parse

load_dotenv()
db_uri = os.environ.get('SQLALCHEMY_DATABASE_URI')

parsed = urllib.parse.urlparse(db_uri)
if parsed.port == 6543:
    # Try 5432
    new_uri = db_uri.replace(':6543/', ':5432/')
    print(f"Testing port 5432...")
    t0 = time.time()
    engine = create_engine(new_uri)
    conn = engine.connect()
    t1 = time.time()
    print(f"Connecting to 5432 took: {t1-t0:.4f} seconds")
    conn.close()
