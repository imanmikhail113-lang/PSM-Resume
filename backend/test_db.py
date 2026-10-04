import os
from dotenv import load_dotenv
import pymysql

load_dotenv()
uri = os.environ.get('SQLALCHEMY_DATABASE_URI', 'mysql+pymysql://root:@localhost/psm_db')
print("DB URI:", uri)

# Parse uri
# mysql+pymysql://root:@localhost/psm_db
try:
    conn = pymysql.connect(host='localhost', user='root', password='', database='psm_db')
    cursor = conn.cursor()
    cursor.execute("DESCRIBE users")
    columns = cursor.fetchall()
    print("Users table columns:")
    for col in columns:
        print(col)
    conn.close()
except Exception as e:
    print("Error:", e)
