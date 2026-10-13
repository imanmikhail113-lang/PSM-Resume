import os
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()
db_uri = os.environ.get('SQLALCHEMY_DATABASE_URI')
if db_uri:
    import urllib.parse
    parsed = urllib.parse.urlparse(db_uri)
    masked = parsed._replace(netloc=f"{parsed.username}:***@{parsed.hostname}:{parsed.port}" if parsed.password else parsed.netloc).geturl()
    print("DB URI:", masked)
try:
    engine = create_engine(db_uri)
    connection = engine.connect()
    connection.close()
    print("Successfully connected to database.")
except Exception as e:
    print(f"Error: {e}")
