from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from backend.quiz_engine import (
    generate_mcqs,
    generate_medium_mcqs,
    generate_hard_mcqs_from_topic,
    generate_passage_for_quiz,
    get_ai_explanation,
    get_webpage_text
)

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/healthz")
async def healthz():
    return {
        "status": "ok",
        "service": "ai-quiz-generator"
    }

@app.get("/")
async def serve_frontend():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

# ================= CORS =================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================= Helpers =================
def safe_response(title: str, questions):
    """
    Ensures frontend ALWAYS receives a valid response.
    """
    if not questions:
        return {
            "title": title,
            "questions": [],
            "error": "AI response could not be parsed. Please try again."
        }
    return {
        "title": title,
        "questions": questions
    }

# ================= Generate from Topic =================
@app.post("/generate/topic")
async def gen_topic(data: dict):
    try:
        topic = data.get("topic", "").strip()
        mode = data.get("mode")
        num = data.get("num_questions")
        cognitive = data.get("cognitive_level")

        if not topic:
            return safe_response("Generated Topic Quiz", [])

        # Generate passage ONCE if needed
        passage = None
        if mode in ("Easy", "Medium"):
            passage = generate_passage_for_quiz(topic)
            if not passage:
                return safe_response(topic, [])

        if mode == "Easy":
            questions = generate_mcqs(passage, num)

        elif mode == "Medium":
            questions = generate_medium_mcqs(
                passage,
                num,
                cognitive,
                is_from_topic=True
            )

        else:  # Hard
            questions = generate_hard_mcqs_from_topic(
                topic,
                num,
                cognitive
            )

        return safe_response(topic, questions)

    except Exception as e:
        print("Error in /generate/topic:", e)
        return safe_response("Generated Topic Quiz", [])

# ================= Generate from Passage =================
@app.post("/generate/passage")
async def gen_passage(data: dict):
    try:
        passage = data.get("passage", "").strip()
        mode = data.get("mode")
        num = data.get("num_questions")
        cognitive = data.get("cognitive_level")

        if not passage:
            return safe_response("Passage Quiz", [])

        if mode == "Easy":
            questions = generate_mcqs(passage, num)
        else:
            questions = generate_medium_mcqs(
                passage,
                num,
                cognitive,
                is_from_topic=False
            )

        return safe_response("Passage Quiz", questions)

    except Exception as e:
        print("Error in /generate/passage:", e)
        return safe_response("Passage Quiz", [])

# ================= Generate from Webpage =================
@app.post("/generate/webpage")
async def gen_webpage(data: dict):
    try:
        url = data.get("url", "").strip()
        mode = data.get("mode")
        num = data.get("num_questions")
        cognitive = data.get("cognitive_level")

        if not url:
            return safe_response("Webpage Quiz", [])

        text, error = get_webpage_text(url)
        if error or not text:
            return {
                "title": "Webpage Quiz",
                "questions": [],
                "error": error or "Failed to extract webpage text."
            }

        if mode == "Easy":
            questions = generate_mcqs(text, num)
        else:
            questions = generate_medium_mcqs(
                text,
                num,
                cognitive,
                is_from_topic=False
            )

        return safe_response("Webpage Quiz", questions)

    except Exception as e:
        print("Error in /generate/webpage:", e)
        return safe_response("Webpage Quiz", [])

# ================= Explanation =================
@app.post("/explain")
async def explain(data: dict):
    try:
        explanation = get_ai_explanation(
            data.get("question"),
            data.get("user_answer"),
            data.get("correct_answer")
        )
        return { "explanation": explanation }
    except Exception as e:
        print("Error in /explain:", e)
        return { "explanation": "Sorry, explanation could not be generated." }
