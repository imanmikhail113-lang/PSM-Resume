import fitz

def parse_blocks_cols(blocks):
    columns = []
    for b in blocks:
        x0 = b[0]
        placed = False
        for col in columns:
            if abs(col['x0'] - x0) < 50:
                col['blocks'].append(b)
                placed = True
                break
        if not placed:
            columns.append({'x0': x0, 'blocks': [b]})
            
    columns.sort(key=lambda c: c['x0'])
    
    final_blocks = []
    for col in columns:
        col['blocks'].sort(key=lambda b: b[1])
        final_blocks.extend(col['blocks'])
    return final_blocks

doc = fitz.open("test_band.pdf")
blocks = doc[0].get_text("blocks")
text_blocks = [b for b in blocks if b[6] == 0]

print("\n--- Column Grouping Logic ---")
for b in parse_blocks_cols(text_blocks):
    print(b[4].strip())

doc.close()
