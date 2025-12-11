import requests
from bs4 import BeautifulSoup

def get_webpage_text(url):
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        html = requests.get(url, headers=headers)
        soup = BeautifulSoup(html.text, "html.parser")

        paragraphs = " ".join([p.get_text() for p in soup.find_all("p")])

        if not paragraphs.strip():
            return None, "No text found in webpage."

        return paragraphs, None

    except Exception as e:
        return None, str(e)
