import time
from werkzeug.security import generate_password_hash
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine

# Time hashing
t0 = time.time()
h = generate_password_hash("password123")
t1 = time.time()
print(f"Hashing took: {t1-t0:.4f} seconds")

# Time connection
load_dotenv()
db_uri = os.environ.get('SQLALCHEMY_DATABASE_URI')
t2 = time.time()
try:
    engine = create_engine(db_uri)
    conn = engine.connect()
    t3 = time.time()
    print(f"Connecting took: {t3-t2:.4f} seconds")
    
    t4 = time.time()
    conn.execute(engine.dialect.statement_compiler(engine.dialect, None).statement_compiler_class(engine.dialect, None).compile(None)) # dummy, let's just do an execute
except Exception as e:
    pass
