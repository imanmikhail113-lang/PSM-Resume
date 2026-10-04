import pymysql

try:
    conn = pymysql.connect(host='localhost', user='root', password='', database='psm_db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email FROM users WHERE id = 5")
    user = cursor.fetchone()
    print("User 5 details:", user)
    conn.close()
except Exception as e:
    print("Error:", e)
