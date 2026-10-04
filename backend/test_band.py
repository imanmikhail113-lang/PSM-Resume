import fitz

def parse_blocks_banded(blocks, y_tolerance=50):
    if not blocks:
        return []
    
    # Sort primarily by y0
    sorted_blocks = sorted(blocks, key=lambda b: b[1])
    
    bands = []
    current_band = [sorted_blocks[0]]
    current_ymax = sorted_blocks[0][3]
    
    for b in sorted_blocks[1:]:
        # If block overlaps with current band vertically (with tolerance)
        if b[1] <= current_ymax + y_tolerance:
            current_band.append(b)
            current_ymax = max(current_ymax, b[3])
        else:
            bands.append(current_band)
            current_band = [b]
            current_ymax = b[3]
    bands.append(current_band)
    
    final_blocks = []
    for band in bands:
        # Within each band, sort by x0 (columns), then by y0
        band.sort(key=lambda b: (round(b[0]/10)*10, b[1]))
        final_blocks.extend(band)
        
    return final_blocks

doc = fitz.open()
page = doc.new_page()

# Header
page.insert_text((200, 20), "JOHN DOE", fontsize=20)

# Left column (Summary and Experience)
page.insert_text((50, 80), "Summary\nI am a Sales Representative\nwho initializes and\nmanages relationships.", fontsize=12)
page.insert_text((50, 180), "Work Experience\nCompany A\nDid stuff.", fontsize=12)

# Right column (Education and Skills)
page.insert_text((300, 80), "Education\nBorcelle University\nBachelor of Business Management\n2020 - 2023", fontsize=12)
page.insert_text((300, 180), "Skills\nSales\nMarketing\nCRM", fontsize=12)

doc.save("test_band.pdf")
doc.close()

doc = fitz.open("test_band.pdf")
blocks = doc[0].get_text("blocks")
text_blocks = [b for b in blocks if b[6] == 0]

print("--- Current row-by-row (BAD) ---")
for b in sorted(text_blocks, key=lambda b: (round(b[1] / 10), b[0])):
    print(b[4].strip())

print("\n--- Banded Logic ---")
for b in parse_blocks_banded(text_blocks, y_tolerance=20):
    print(b[4].strip())

print("\n--- Banded Logic (tolerance 50) ---")
for b in parse_blocks_banded(text_blocks, y_tolerance=50):
    print(b[4].strip())

doc.close()
