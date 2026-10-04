import os
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()
db_uri = os.environ.get('SQLALCHEMY_DATABASE_URI')
print("DB URI:", db_uri)
try:
    engine = create_engine(db_uri)
    connection = engine.connect()
    connection.close()
    print("Successfully connected to database.")
except Exception as e:
    print(f"Error: {e}")
