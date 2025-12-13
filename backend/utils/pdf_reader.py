from io import BytesIO
import pdfplumber

def extract_text_from_pdf(raw_bytes):
    """
    Accepts raw PDF bytes and extracts text safely using BytesIO.
    """
    try:
        text = ""
        with pdfplumber.open(BytesIO(raw_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"

        return text.strip()
    except Exception as e:
        print("PDF Error:", e)
        return ""
