import fitz

doc = fitz.open("test_band.pdf")
page = doc[0]

print("--- get_text('text', sort=True) ---")
print(page.get_text("text", sort=True))

print("--- get_text('blocks', sort=True) ---")
for b in page.get_text("blocks", sort=True):
    print(b[4].strip())

doc.close()
