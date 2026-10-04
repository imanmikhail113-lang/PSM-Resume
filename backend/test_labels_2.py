import fitz

doc = fitz.open("test_labels.pdf")
text_blocks = [b for b in doc[0].get_text("blocks") if b[6] == 0]

print("--- Coordinates ---")
for b in text_blocks:
    print(f"Text: '{b[4].strip()}', x0={b[0]}, y0={b[1]}")

doc.close()
