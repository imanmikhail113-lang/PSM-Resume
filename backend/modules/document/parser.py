import fitz  # PyMuPDF
import io
import re
from functools import cmp_to_key

def format_resume_sections(text: str) -> str:
    """
    Identifies common resume sections and formats them by ensuring
    there is an empty line before and after each section title.
    """
    SECTION_HEADERS = {
        'Summary': re.compile(r'^(?:[0-9\.\-•\*\s]+)?(summary|professional\s+summary|profile|objective|career\s+objective|executive\s+summary|about\s+me|about)$', re.IGNORECASE),
        'Education': re.compile(r'^(?:[0-9\.\-•\*\s]+)?(education|academic\s+history|academic\s+background|qualifications|academic\s+qualifications|education\s+background)$', re.IGNORECASE),
        'Work Experience': re.compile(r'^(?:[0-9\.\-•\*\s]+)?(work\s+experience|experience|employment\s+history|professional\s+experience|career\s+history|work\s+history|relevant\s+experience|experience\s+history)$', re.IGNORECASE),
        'Skills': re.compile(r'^(?:[0-9\.\-•\*\s]+)?(skills|core\s+skills|professional\s+skills|technical\s+skills|areas\s+of\s+expertise|key\s+skills|skills\s+&\s+expertise|expertise|core\s+competencies)$', re.IGNORECASE),
        'Projects': re.compile(r'^(?:[0-9\.\-•\*\s]+)?(projects|key\s+projects|personal\s+projects|academic\s+projects|recent\s+projects|relevant\s+projects)$', re.IGNORECASE),
        'Certifications': re.compile(r'^(?:[0-9\.\-•\*\s]+)?(certifications|certificates|licenses\s+&\s+certifications|courses)$', re.IGNORECASE),
        'Languages': re.compile(r'^(?:[0-9\.\-•\*\s]+)?(languages)$', re.IGNORECASE),
        'Awards': re.compile(r'^(?:[0-9\.\-•\*\s]+)?(awards|honors|honors\s+&\s+awards|achievements)$', re.IGNORECASE),
        'Interests': re.compile(r'^(?:[0-9\.\-•\*\s]+)?(interests|hobbies|interests\s+&\s+hobbies)$', re.IGNORECASE),
        'References': re.compile(r'^(?:[0-9\.\-•\*\s]+)?(references)$', re.IGNORECASE)
    }

    lines = text.split('\n')
    formatted_lines = []
    
    for line in lines:
        cleaned = line.strip()
        if not cleaned:
            continue
        
        # Test if the line matches any section header (stripped of trailing colon)
        is_header = False
        canonical_header = ""
        
        test_header = cleaned.rstrip(':').strip()
        if len(test_header) <= 40:
            for header_name, pattern in SECTION_HEADERS.items():
                if pattern.match(test_header):
                    is_header = True
                    canonical_header = header_name
                    break
        
        if is_header:
            # Add a blank line before the header if we have content already
            if formatted_lines and formatted_lines[-1] != "":
                formatted_lines.append("")
            
            # Add the standardized header
            formatted_lines.append(canonical_header)
            
            # Add a blank line after the header
            formatted_lines.append("")
        else:
            formatted_lines.append(cleaned)
            
    # Join with newlines
    result_text = "\n".join(formatted_lines)
    
    # Normalize multiple newlines (3 or more -> exactly 2)
    result_text = re.sub(r'\n{3,}', '\n\n', result_text)
    
    return result_text.strip()

def compare_columns(colA, colB):
    """
    Layout-aware comparator that orders disjoint columns vertically (top to bottom)
    and overlapping columns horizontally (left to right).
    """
    y0_A = min(b[1] for b in colA['blocks'])
    y1_A = max(b[3] for b in colA['blocks'])
    y0_B = min(b[1] for b in colB['blocks'])
    y1_B = max(b[3] for b in colB['blocks'])
    
    # Check vertical ordering (with 8pt tolerance)
    if y1_A <= y0_B + 8:
        return -1
    if y1_B <= y0_A + 8:
        return 1
        
    # Vertical overlap: sort horizontally left-to-right
    x0_A = min(b[0] for b in colA['blocks'])
    x0_B = min(b[0] for b in colB['blocks'])
    if x0_A < x0_B:
        return -1
    elif x0_A > x0_B:
        return 1
    return 0

def extract_text_from_pdf(file_stream: bytes) -> str:
    """
    Securely extracts text from a PDF byte stream using coordinate-based sorting
    to correctly handle multi-column layouts.
    """
    try:
        # Open the PDF from bytes in memory
        doc = fitz.open(stream=file_stream, filetype="pdf")
        full_text = ""

        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            
            # Reconstruct line-level blocks from page dict to handle aligned labels and values
            d = page.get_text("dict")
            text_blocks = []
            block_no = 0
            for b in d.get("blocks", []):
                if b.get("type") == 0:  # text
                    for line in b.get("lines", []):
                        # Join spans within the same line
                        line_text = "".join(span.get("text", "") for span in line.get("spans", []))
                        bbox = line.get("bbox")
                        text_blocks.append((
                            bbox[0], bbox[1], bbox[2], bbox[3],
                            line_text,
                            block_no,
                            0  # block_type
                        ))
                    block_no += 1
            
            if not text_blocks:
                continue

            # 1. Group blocks into columns using 80px tolerance
            columns = []
            for b in text_blocks:
                x0 = b[0]
                placed = False
                for col in columns:
                    if abs(col['x0'] - x0) < 80:
                        col['blocks'].append(b)
                        col['x0'] = min(col['x0'], x0)
                        placed = True
                        break
                if not placed:
                    columns.append({'x0': x0, 'blocks': [b]})
            
            # 2. Sort columns using our 2D layout logic (headers first, then columns left-to-right)
            columns.sort(key=cmp_to_key(compare_columns))
            
            # 3. Within each column, sort the text blocks from top to bottom (y0),
            # and then left to right (x0) for blocks on the same horizontal line.
            for col in columns:
                col['blocks'].sort(key=lambda b: (round(b[1] / 10), b[0]))
                for block in col['blocks']:
                    text = block[4].strip()
                    if text:
                        full_text += text + "\n"
                
        doc.close()
        return format_resume_sections(full_text.strip())
    except Exception as e:
        print(f"Error parsing PDF: {e}")
        return ""
