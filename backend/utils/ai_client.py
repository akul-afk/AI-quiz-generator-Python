import os
import requests
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

def call_gemini(prompt):
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }

    res = requests.post(API_URL, json=payload)
    data = res.json()

    text = data["candidates"][0]["content"]["parts"][0].get("text", "")
    return text
