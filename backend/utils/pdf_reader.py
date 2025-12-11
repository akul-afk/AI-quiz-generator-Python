import pdfplumber

def extract_text_from_pdf(raw_bytes):
    text = ""
    with pdfplumber.open(bytes_io := bytes(raw_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text
