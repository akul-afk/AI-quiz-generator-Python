from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import *
from quiz_engine import (
    generate_mcqs,
    generate_medium_mcqs,
    generate_hard_mcqs_from_topic,
    generate_passage_for_quiz,
    get_ai_explanation
)
from utils.web_scraper import get_webpage_text
from utils.pdf_reader import extract_text_from_pdf

app = FastAPI(title="AI MCQ Generator Web API")

# Allow frontend access (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# =============== QUIZ GENERATION ENDPOINTS ============
# ======================================================

@app.post("/generate/topic")
async def generate_from_topic(req: TopicRequest):
    passage = generate_passage_for_quiz(req.topic, word_count=400)

    if req.mode == "Easy":
        quiz = generate_mcqs(passage, req.num_questions)
    elif req.mode == "Medium":
        quiz = generate_medium_mcqs(passage, req.num_questions, req.cognitive_level, True)
    else:
        quiz = generate_hard_mcqs_from_topic(req.topic, req.num_questions, req.cognitive_level)

    return {"title": req.topic, "questions": quiz}


@app.post("/generate/passage")
async def generate_from_passage(req: PassageRequest):
    text = req.passage

    if req.mode == "Easy":
        quiz = generate_mcqs(text, req.num_questions)
    else:
        quiz = generate_medium_mcqs(text, req.num_questions, req.cognitive_level, False)

    return {"title": "Passage Quiz", "questions": quiz}


@app.post("/generate/webpage")
async def generate_from_webpage(req: WebpageRequest):
    passage, error = get_webpage_text(req.url)
    if error:
        return {"error": error}

    if req.mode == "Easy":
        quiz = generate_mcqs(passage, req.num_questions)
    else:
        quiz = generate_medium_mcqs(passage, req.num_questions, req.cognitive_level, False)

    return {"title": "Webpage Quiz", "questions": quiz}


@app.post("/generate/pdf")
async def generate_from_pdf(file: UploadFile = File(...), mode: str = "Medium", cognitive_level: str = "Comprehension", num_questions: int = 10):
    text = extract_text_from_pdf(await file.read())

    if mode == "Easy":
        quiz = generate_mcqs(text, num_questions)
    else:
        quiz = generate_medium_mcqs(text, num_questions, cognitive_level, False)

    return {"title": file.filename, "questions": quiz}

@app.post("/explain")
async def explain_wrong_answer(req: ExplainRequest):
    explanation = get_ai_explanation(req.question, req.user_answer, req.correct_answer)
    return {"explanation": explanation}


# ======================================================
# ================= HEALTH ENDPOINT ====================
# ======================================================

@app.get("/")
def root():
    return {"status": "AI MCQ Generator API Running"}
