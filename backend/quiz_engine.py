import os
import re
import json
import random
import requests
import spacy
from bs4 import BeautifulSoup

# ===============================g=
# Load spaCy Model
# ===============================

try:
    nlp = spacy.load("en_core_web_sm")
except:
    raise Exception("spaCy model 'en_core_web_sm' not found. Ensure it exists in your repo.")

# ===============================
# Load Gemini API Key
# ===============================

from dotenv import load_dotenv

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise Exception("Gemini API key missing in .env")

def clean_text_for_easy_mode(text):
    text = re.sub(r'[\*#\$]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


# ============================================================
# ====================== EASY MODE ===========================
# ============================================================

def generate_mcqs(text, num_questions):
    """Generate basic fill-in-the-blank MCQs using spaCy noun chunks."""

    clean = clean_text_for_easy_mode(text)
    doc = nlp(clean)

    answers = [chunk.text for chunk in doc.noun_chunks if 2 < len(chunk.text) < 25]
    answers = list(set(answers))

    if len(answers) < 4:
        return []

    questions = []
    counter = 0

    for ans in random.sample(answers, min(len(answers), num_questions * 2)):

        # Find sentence containing the answer
        sentence = ""
        for sent in doc.sents:
            if ans in sent.text:
                sentence = sent.text.replace(ans, "_______")
                break

        if not sentence:
            continue

        distractors = [a for a in answers if a != ans]
        if len(distractors) < 3:
            continue

        options = random.sample(distractors, 3) + [ans]
        random.shuffle(options)

        questions.append({
            "id": counter,
            "question_text": sentence,
            "options": options,
            "correct_answer": ans,
            "topic_tag": "fill-in-the-blank"
        })

        counter += 1
        if len(questions) >= num_questions:
            break

    return questions


# ============================================================
# ============ GEMINI AI HELPERS =============================
# ============================================================

import json
import re

def parse_ai_json(text: str):
    """
    Robust JSON parser for LLM output.
    Handles invalid escapes, markdown fences, and extra text.
    Never raises — returns [] on failure.
    """

    if not text:
        return []

    # Remove markdown code fences
    cleaned = re.sub(r"```(json)?", "", text, flags=re.IGNORECASE).strip()

    # Extract first JSON array
    start = cleaned.find("[")
    end = cleaned.rfind("]")
    if start == -1 or end == -1:
        return []

    cleaned = cleaned[start:end + 1]

    # 🔥 FIX: Remove invalid backslash escapes
    cleaned = re.sub(r"\\(?![\"\\/bfnrtu])", "", cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        print("JSON parse failed after cleanup:", e)
        return []



def call_gemini(system_prompt, user_prompt):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key={GEMINI_API_KEY}"

    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"parts": [{"text": user_prompt}]}]
    }

    res = requests.post(url, json=payload, timeout=90)

    if res.status_code != 200:
        print("Gemini Error:", res.text)
        return ""

    data = res.json()
    text = data["candidates"][0]["content"]["parts"][0].get("text", "")

    return text


# ============================================================
# ==================== MEDIUM MODE ===========================
# ============================================================

def generate_medium_mcqs(text, num_questions, level, is_from_topic=False):

    sys_prompt = (
    "You are an expert quiz designer following Bloom's Taxonomy.\n\n"
    f"Create exactly {num_questions} multiple-choice questions at the '{level}' level.\n\n"
    "CRITICAL RULES:\n"
    "- The user DOES NOT see the passage.\n"
    "- Questions must be fully self-contained.\n"
    "- DO NOT use phrases like:\n"
    "  'according to the passage',\n"
    "  'the passage states',\n"
    "  'the text describes',\n"
    "  'as mentioned above'.\n\n"
    "Return ONLY a valid JSON array.\n"
    "Each object must contain:\n"
    "- question_text\n"
    "- options (exactly 4)\n"
    "- correct_answer\n"
    "- topic_tag\n"
    "OPTION QUALITY RULES:\n"
    "- All options must be similar in length (±15%).\n"
    "- All options must have the same grammatical structure.\n"
    "- The correct answer must NOT be longer or more detailed than distractors.\n"
    "- Avoid explanations, examples, or qualifiers inside any option.\n"
    "- Distractors must be equally plausible."

)

    user_prompt = (
    "Use the following content for INTERNAL REFERENCE ONLY.\n"
    "Do NOT mention this content explicitly in the questions.\n\n"
    f"{text}\n\n"
    "Generate the MCQs now."
)

    raw = call_gemini(sys_prompt, user_prompt)
    parsed = parse_ai_json(raw)

    


    if not parsed:
        return []
    FORBIDDEN = [
    "the passage",
    "the text",
    "according to",
    "as mentioned above",
    "this passage"
    ]
    parsed = [
    q for q in parsed
    if not any(p in q["question_text"].lower() for p in FORBIDDEN)
]   

    # Add IDs
    for i, q in enumerate(parsed):
        q["id"] = i

    return parsed


# ============================================================
# ====================== HARD MODE ===========================
# ============================================================

def generate_hard_mcqs_from_topic(topic, num_questions, level):

    sys_prompt = (
    "You are an expert quiz designer.\n\n"
    f"Create exactly {num_questions} HARD multiple-choice questions about the topic:\n"
    f"'{topic}'\n\n"
    f"Use Bloom's Taxonomy level: {level}.\n\n"
    "CRITICAL RULES:\n"
    "- There is NO passage.\n"
    "- The user only knows the topic.\n"
    "- DO NOT reference any passage, text, article, or source.\n"
    "- Questions must be completely self-contained.\n\n"
    "Return ONLY a valid JSON array.\n"
    "Each object must contain:\n"
    "- question_text\n"
    "- options (exactly 4)\n"
    "- correct_answer\n"
    "- topic_tag"
)
    raw = call_gemini(sys_prompt, "")

    parsed = parse_ai_json(raw)

    if not parsed:
        return []
    FORBIDDEN = [
    "the passage",
    "the text",
    "according to",
    "as mentioned above",
    "this passage"
]
    parsed = [
    q for q in parsed
    if not any(p in q["question_text"].lower() for p in FORBIDDEN)
]

    for i, q in enumerate(parsed):
        q["id"] = i

    return parsed
    


# ============================================================
# ================== PASSAGE GENERATION ======================
# ============================================================

def generate_passage_for_quiz(topic, word_count=400):

    sys_prompt = "Write an educational passage with many concepts and named entities."

    user_prompt = f"Write a {word_count}-word passage about: {topic}"

    raw = call_gemini(sys_prompt, user_prompt)
    if not raw:
        return None

    return raw


# ============================================================
# ======================= WEB SCRAPER ========================
# ============================================================

def get_webpage_text(url):
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        r = requests.get(url, headers=headers, timeout=10)
        r.raise_for_status()

        soup = BeautifulSoup(r.text, "html.parser")
        text = " ".join([p.get_text() for p in soup.find_all("p")])

        if not text.strip():
            return None, "No readable text found."

        return text, None

    except Exception as e:
        return None, str(e)



# ============================================================
# ===================== EXPLANATION AI =======================
# ============================================================

def get_ai_explanation(question, user_answer, correct_answer):

    sys_prompt = "You are a friendly AI tutor. Explain why the student's answer is wrong."

    user_prompt = (
        f"Question: {question}\n"
        f"Student answered: {user_answer}\n"
        f"Correct answer: {correct_answer}\n"
        "Explain simply in one paragraph."
    )

    return call_gemini(sys_prompt, user_prompt)
