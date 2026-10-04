import fitz

def parse_words_column_aware(page):
    words = page.get_text("words") # (x0, y0, x1, y1, "word", block_no, line_no, word_no)
    
    # 1. Group words into columns based on x0.
    # To be safe, let's group by "blocks of text".
    # Actually, grouping individual words into columns by x0 might be tricky because
    # words in the same paragraph have different x0!
    # Instead, let's use the block_no!
    # PyMuPDF words have block_no (index 5).
    # So we can group words by block_no!
    pass
