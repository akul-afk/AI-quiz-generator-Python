🧠 AI Quiz Generator (FastAPI + Gemini + spaCy)

An intelligent, full-stack AI-powered quiz generation platform that creates high-quality MCQs from:

Topics

Passages

Webpages

Built with FastAPI (backend) and vanilla JS + Tailwind (frontend), powered by Google Gemini, spaCy, and Bloom’s Taxonomy.

🚀 Live Features
✅ Quiz Generation Modes
Mode	Source	Logic
Easy	Passage / Topic / Web	spaCy noun-chunk based fill-in-the-blank
Medium	Passage / Topic / Web	Gemini AI (Bloom’s Taxonomy)
Hard	Topic only	Gemini AI (self-contained reasoning questions)
🎯 Input Types

Topic (e.g., “Operating Systems”)

Passage (paste text)

Webpage URL (scrapes readable text)

🧩 User Experience

Skeleton loaders while AI generates questions

Toast notifications (success / error / info)

Keyboard shortcuts (Enter / Ctrl+Enter)

Hover effects, glow animations, modern scrollbar

Session sidebar with rename & delete dialogs

📚 Session Management

Multiple quizzes per session

Rename quizzes

Delete quizzes

Save entire session as JSON

Load sessions back into UI

📄 PDF Export

Each quiz can be exported as a clean, printable PDF with:

Quiz title

All questions and options

Answer Key on a new page

The answer key is generated only inside the PDF (not visible in UI).

🏗️ Architecture Overview
AI-Quiz-Generator/
│
├── backend/
│   ├── main.py              # FastAPI app + routes
│   ├── quiz_engine.py       # AI logic (spaCy + Gemini)
│   └── requirements.txt
│
├── frontend/
│   ├── index.html           # UI
│   ├── app.js               # All frontend logic
│   └── style.css
│
└── README.md

🔌 Backend (FastAPI)
🔹 API Endpoints
Endpoint	Method	Purpose
/generate/topic	POST	Generate quiz from topic
/generate/passage	POST	Generate quiz from passage
/generate/webpage	POST	Generate quiz from URL
/explain	POST	Explain incorrect answer
/healthz	GET	Health check (Render)
/	GET	Serves frontend
🔹 CORS (Important)

CORS middleware must be declared before routes:

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


This is required for Render + browser access.

🤖 AI Logic (quiz_engine.py)
Easy Mode (spaCy)

Extracts noun chunks

Replaces with blanks

Generates distractors from same text

Fully offline (no API call)

Medium Mode (Gemini)

Uses Bloom’s Taxonomy

Passage used internally only

AI is explicitly instructed:

❌ NOT to reference the passage

❌ NOT to say “according to the text”

JSON is aggressively cleaned & validated

Hard Mode (Gemini)

Topic-only reasoning questions

No passage involved

Self-contained, higher-order thinking

🔒 JSON Safety

AI output is cleaned using:

Markdown fence removal

Invalid escape handling

Array extraction

Safe fallback (never crashes UI)

🖥️ Frontend (Vanilla JS)
State Management
openQuizzes = { quizId: { title, data } }
activeQuizId = "quiz_123"


All features (PDF, rename, delete, render) depend on this state.

🚨 Important JS Rules (Lessons Learned)

Never use return outside a function

Never reference quiz globally

Always access quiz via:

const quiz = openQuizzes[activeQuizId];


Violating these rules will break the entire app.

📄 PDF Export (html2pdf)

PDF generation is fully encapsulated inside the button handler:

No global DOM usage

No shared variables

Answer Key appended after questions

Starts on a new page

Answer Key
1. Correct answer
2. Correct answer
...

🧪 Known Bias & Mitigation
⚠️ Observation

AI models often make the longest option the correct answer.

Mitigations (Implemented / Recommended)

Option shuffling

Post-generation filtering

Can add future:

Length normalization

Distractor rewriting

Correct-answer position balancing

🌍 Deployment (Render)
Backend

Python Web Service

Build command:

pip install -r backend/requirements.txt


Start command:

uvicorn backend.main:app --host 0.0.0.0 --port 10000
