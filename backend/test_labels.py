import fitz

doc = fitz.open()
page = doc.new_page()

# Left column
# "123-456-7890" has slightly smaller y0 than "Phone:"
page.insert_text((100, 100.1), "123-456-7890", fontsize=12)
page.insert_text((50, 100.5), "Phone:", fontsize=12)

page.insert_text((100, 150.1), "hello@reallygreatsite.com", fontsize=12)
page.insert_text((50, 150.5), "Email:", fontsize=12)

doc.save("test_labels.pdf")
doc.close()

def parse_blocks_cols(blocks):
    columns = []
    for b in blocks:
        x0 = b[0]
        placed = False
        for col in columns:
            if abs(col['x0'] - x0) < 150: # increased tolerance to group label+value
                col['blocks'].append(b)
                placed = True
                break
        if not placed:
            columns.append({'x0': x0, 'blocks': [b]})
            
    columns.sort(key=lambda c: c['x0'])
    
    final_blocks = []
    for col in columns:
        # STRICT y0 sort
        col['blocks'].sort(key=lambda b: b[1])
        final_blocks.extend(col['blocks'])
    return final_blocks

def parse_blocks_cols_fixed(blocks):
    columns = []
    for b in blocks:
        x0 = b[0]
        placed = False
        for col in columns:
            if abs(col['x0'] - x0) < 150: # increased tolerance
                col['blocks'].append(b)
                placed = True
                break
        if not placed:
            columns.append({'x0': x0, 'blocks': [b]})
            
    columns.sort(key=lambda c: c['x0'])
    
    final_blocks = []
    for col in columns:
        # Sort by y0 (with tolerance) then x0
        col['blocks'].sort(key=lambda b: (round(b[1] / 10), b[0]))
        final_blocks.extend(col['blocks'])
    return final_blocks

doc = fitz.open("test_labels.pdf")
text_blocks = [b for b in doc[0].get_text("blocks") if b[6] == 0]

print("\n--- Strict y0 Sort ---")
for b in parse_blocks_cols(text_blocks):
    print(b[4].strip())

print("\n--- Fixed y0 Sort (with tolerance) ---")
for b in parse_blocks_cols_fixed(text_blocks):
    print(b[4].strip())

doc.close()
