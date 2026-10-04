import fitz

doc = fitz.open()
page = doc.new_page()

# Insert left column
page.insert_text((50, 50), "Summary\nI am a Sales Representative\nwho initializes and\nmanages relationships", fontsize=12)
# Insert right column
page.insert_text((300, 50), "Education\nBorcelle University\nBachelor of Business Management\n2020 - 2023", fontsize=12)

doc.save("test_2col.pdf")
doc.close()

# Now parse it
doc = fitz.open("test_2col.pdf")
page = doc[0]
blocks = page.get_text("blocks")

print("--- Default order ---")
for b in blocks:
    print(b[4].strip())

print("\n--- Current row-by-row order ---")
blocks_row = sorted(blocks, key=lambda b: (round(b[1] / 10), b[0]))
for b in blocks_row:
    print(b[4].strip())
    
print("\n--- Column-by-column order (round x0 to 200) ---")
blocks_col = sorted(blocks, key=lambda b: (round(b[0] / 200), b[1]))
for b in blocks_col:
    print(b[4].strip())

doc.close()
