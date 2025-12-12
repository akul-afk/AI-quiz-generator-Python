// frontend/app.js
// Full replacement. Handles PDF upload, save/load session, rename, delete.

const API_BASE = "http://127.0.0.1:8000"; // <-- set to your backend

let openQuizzes = {};
let weakSpots = [];
let activeQuizId = null;

// ---------- Helpers ----------
function el(tag, cls = "") {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    return d;
}

function formatTitleForDisplay(title) {
    if (!title) return "Untitled";
    return title.length > 28 ? title.slice(0, 28) + "..." : title;
}

// ---------- Tabs ----------
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active-tab"));
        document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.add("hidden"));

        btn.classList.add("active-tab");
        document.getElementById(btn.dataset.tab).classList.remove("hidden");
    });
});

// ---------- Generate Quiz ----------
document.getElementById("generateBtn").addEventListener("click", async () => {
    const mode = document.getElementById("modeSelect").value;
    const cognitive = document.getElementById("cognitiveSelect").value;
    const num = parseInt(document.getElementById("numSelect").value);

    // Detect active tab
    if (!document.getElementById("topicTab").classList.contains("hidden")) {
        const topic = document.getElementById("topicInput").value.trim();
        if (!topic) { alert("Enter a topic"); return; }
        await callGenerateJSON("/generate/topic", { topic, mode, cognitive_level: cognitive, num_questions: num });
    }
    else if (!document.getElementById("passageTab").classList.contains("hidden")) {
        const passage = document.getElementById("passageInput").value.trim();
        if (!passage) { alert("Paste a passage"); return; }
        await callGenerateJSON("/generate/passage", { passage, mode, cognitive_level: cognitive, num_questions: num });
    }
    else if (!document.getElementById("webTab").classList.contains("hidden")) {
        const url = document.getElementById("webInput").value.trim();
        if (!url) { alert("Paste a URL"); return; }
        await callGenerateJSON("/generate/webpage", { url, mode, cognitive_level: cognitive, num_questions: num });
    }
    else if (!document.getElementById("pdfTab").classList.contains("hidden")) {
        // PDF: use FormData to upload the file
        const fileInput = document.getElementById("pdfInput");
        if (!fileInput.files || fileInput.files.length === 0) { alert("Select a PDF file first."); return; }
        const file = fileInput.files[0];

        const form = new FormData();
        form.append("file", file);                // Upload file
        form.append("mode", mode);                // mode field
        form.append("cognitive_level", cognitive);
        form.append("num_questions", num);

        // Show simple loading UI
        const genBtn = document.getElementById("generateBtn");
        genBtn.disabled = true;
        genBtn.textContent = "Uploading PDF...";

        try {
            const res = await fetch(API_BASE + "/generate/pdf", {
                method: "POST",
                body: form
            });
            const data = await res.json();
            if (!data.questions || data.questions.length === 0) {
                alert(data.error || "No questions generated from PDF.");
            } else {
                const quizId = "quiz_" + Date.now();
                openQuizzes[quizId] = { title: data.title || file.name, data: data.questions };
                addQuizToSidebar(quizId);
                renderQuiz(quizId);
            }
        } catch (e) {
            console.error(e);
            alert("PDF upload failed. See console.");
        } finally {
            genBtn.disabled = false;
            genBtn.textContent = "Generate Quiz";
        }
    }
});

// Helper to call JSON endpoints and process response
async function callGenerateJSON(endpoint, payload) {
    const genBtn = document.getElementById("generateBtn");
    genBtn.disabled = true;
    genBtn.textContent = "Generating...";

    try {
        const res = await fetch(API_BASE + endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.questions || data.questions.length === 0) {
            alert(data.error || "No questions generated.");
            return;
        }

        const quizId = "quiz_" + Date.now();
        openQuizzes[quizId] = { title: data.title || payload.topic || "Generated Quiz", data: data.questions };
        addQuizToSidebar(quizId);
        renderQuiz(quizId);
    } catch (e) {
        console.error(e);
        alert("Generation failed. Check backend console.");
    } finally {
        genBtn.disabled = false;
        genBtn.textContent = "Generate Quiz";
    }
}

// ---------- Sidebar: add quiz entry with rename & delete ----------
function addQuizToSidebar(id) {
    const q = openQuizzes[id];

    // Container row
    const row = el("div", "quiz-row flex items-center justify-between p-2 rounded hover:bg-gray-700");
    row.dataset.quizId = id;

    // Title area (click to open)
    const left = el("div", "flex-1 cursor-pointer");
    const titleSpan = el("span", "font-medium");
    titleSpan.textContent = formatTitleForDisplay(q.title);
    left.appendChild(titleSpan);
    left.addEventListener("click", () => renderQuiz(id));

    // Right controls
    const right = el("div", "flex items-center space-x-2");

    // Rename (pencil)
    const renameBtn = el("button", "p-1");
    renameBtn.title = "Rename";
    renameBtn.innerHTML = "✏️";
    renameBtn.addEventListener("click", () => {
        const newName = prompt("Enter new quiz name:", q.title || "");
        if (newName !== null) {
            q.title = newName;
            titleSpan.textContent = formatTitleForDisplay(newName);
        }
    });

    // Download/save (floppy) — saves single quiz JSON
    const saveBtn = el("button", "p-1");
    saveBtn.title = "Download Quiz";
    saveBtn.innerHTML = "💾";
    saveBtn.addEventListener("click", () => {
        const filename = (q.title || "quiz").replace(/\s+/g, "_") + ".json";
        const blob = new Blob([JSON.stringify(q.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = el("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    });

    // Delete (trash)
    const delBtn = el("button", "p-1");
    delBtn.title = "Delete";
    delBtn.innerHTML = "🗑️";
    delBtn.addEventListener("click", () => {
        if (!confirm("Delete this saved quiz?")) return;
        delete openQuizzes[id];
        row.remove();
        if (activeQuizId === id) {
            document.getElementById("quizContainer").innerHTML = "";
            document.getElementById("quizControls").classList.add("hidden");
            activeQuizId = null;
        }
    });

    right.appendChild(renameBtn);
    right.appendChild(saveBtn);
    right.appendChild(delBtn);

    row.appendChild(left);
    row.appendChild(right);
    document.getElementById("quizList").appendChild(row);
}

// ---------- Render Quiz ----------
function renderQuiz(id) {
    activeQuizId = id;
    const container = document.getElementById("quizContainer");
    container.innerHTML = "";

    const quizObj = openQuizzes[id];
    if (!quizObj) return;

    const titleEl = el("h2", "text-2xl font-bold mb-4");
    titleEl.textContent = quizObj.title || "Quiz";
    container.appendChild(titleEl);

    const questions = quizObj.data;
    questions.forEach((q, index) => {
        const block = el("div", "p-4 bg-gray-800 rounded border border-gray-700 mb-4");

        const qTitle = el("p", "font-bold text-lg");
        qTitle.textContent = `${index + 1}. ${q.question_text}`;
        block.appendChild(qTitle);

        const opts = el("div", "mt-2 space-y-2");
        // ensure options order is fixed for rendering (not mutated original)
        const localOpts = Array.isArray(q.options) ? [...q.options] : [];
        localOpts.forEach(opt => {
            const label = el("label", "flex items-center space-x-2");
            const input = el("input");
            input.type = "radio";
            input.name = `q${index}`;
            input.value = opt;
            label.appendChild(input);
            const span = el("span");
            span.textContent = opt;
            label.appendChild(span);
            opts.appendChild(label);
        });

        // Explain button placeholder that will be added if wrong
        block.appendChild(opts);
        container.appendChild(block);
    });

    document.getElementById("quizControls").classList.remove("hidden");
    document.getElementById("scoreLabel").textContent = "";
}

// ---------- Submit Answers ----------
document.getElementById("submitBtn").addEventListener("click", async () => {
    if (!activeQuizId) return;
    const questions = openQuizzes[activeQuizId].data;
    let score = 0;
    const container = document.getElementById("quizContainer");
    weakSpots = weakSpots || [];

    questions.forEach((q, i) => {
        const selected = container.querySelector(`input[name='q${i}']:checked`);
        const qBlock = container.children[i + 1]; // because first child is title element
        // reset any previous explain button
        const prevExplain = qBlock.querySelector(".explain-btn");
        if (prevExplain) prevExplain.remove();

        if (!selected) {
            // not answered
            qBlock.querySelector("p").style.color = "";
        } else if (selected.value === q.correct_answer) {
            score++;
            qBlock.querySelector("p").style.color = "#2ECC71"; // green
        } else {
            qBlock.querySelector("p").style.color = "#E74C3C"; // red
            // add to weak spots
            if (q.topic_tag && !weakSpots.includes(q.topic_tag)) {
                weakSpots.push(q.topic_tag);
            }
            // add Explain button
            const explainBtn = el("button", "explain-btn mt-2 py-1 px-2 rounded");
            explainBtn.textContent = "🧑‍🏫 Explain Why";
            explainBtn.addEventListener("click", () => getExplanationAndShow(q.question_text, selected.value, q.correct_answer));
            qBlock.appendChild(explainBtn);
        }
    });

    document.getElementById("weakSpotBtn").disabled = weakSpots.length === 0;
    document.getElementById("scoreLabel").textContent = `Score: ${score}/${questions.length}`;
    document.getElementById("submitBtn").disabled = true;
});

// ---------- Show Answers ----------
document.getElementById("showAnsBtn").addEventListener("click", () => {
    if (!activeQuizId) return;
    const questions = openQuizzes[activeQuizId].data;
    const container = document.getElementById("quizContainer");

    questions.forEach((q, i) => {
        const radios = container.querySelectorAll(`input[name='q${i}']`);
        radios.forEach(r => {
            if (r.value === q.correct_answer) {
                r.checked = true;
                r.parentElement.style.color = "#2ECC71";
            } else {
                r.parentElement.style.color = "";
            }
        });
    });

    document.getElementById("showAnsBtn").disabled = true;
});

// ---------- Copy Quiz ----------
document.getElementById("copyBtn").addEventListener("click", () => {
    if (!activeQuizId) return;
    const quiz = openQuizzes[activeQuizId].data;
    let text = "";
    quiz.forEach((q, i) => {
        text += `Q${i + 1}: ${q.question_text}\n`;
        q.options.forEach((o, j) => {
            text += `  ${String.fromCharCode(65 + j)}. ${o}\n`;
        });
        text += `Correct: ${q.correct_answer}\n\n`;
    });
    navigator.clipboard.writeText(text).then(() => alert("Copied quiz to clipboard"));
});

// ---------- Explanation (calls backend) ----------
async function getExplanationAndShow(question, userAnswer, correctAnswer) {
    try {
        const res = await fetch(API_BASE + "/explain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question, user_answer: userAnswer, correct_answer: correctAnswer })
        });
        const data = await res.json();
        alert(data.explanation || "No explanation returned.");
    } catch (e) {
        console.error(e);
        alert("Failed to fetch explanation.");
    }
}

// ---------- Weak Spot Practice ----------
document.getElementById("weakSpotBtn").addEventListener("click", async () => {
    if (weakSpots.length === 0) { alert("No weak spots yet!"); return; }
    const topics = [...new Set(weakSpots)].join(", ");
    const res = await fetch(API_BASE + "/generate/topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topics, mode: "Hard", cognitive_level: "Application", num_questions: 5 })
    });
    const data = await res.json();
    if (!data.questions || data.questions.length === 0) { alert("No questions generated for weak spots."); return; }
    const quizId = "quiz_" + Date.now();
    openQuizzes[quizId] = { title: "Weak Spot Review", data: data.questions };
    addQuizToSidebar(quizId);
    renderQuiz(quizId);
});

// ---------- Save / Load Session (client side) ----------
document.getElementById("saveSessionBtn").addEventListener("click", () => {
    // Save all quizzes into single JSON file
    const filename = "quiz_session_" + Date.now() + ".json";
    const payload = [];
    for (const [qid, info] of Object.entries(openQuizzes)) {
        payload.push({ id: qid, title: info.title, data: info.data });
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
});

// Load session: create a hidden file input and click it
document.getElementById("loadSessionBtn").addEventListener("click", () => {
    const fi = el("input");
    fi.type = "file";
    fi.accept = ".json,application/json";
    fi.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                // parsed expected: array of {id?, title, data}
                // Clear current list UI
                document.getElementById("quizList").innerHTML = "";
                openQuizzes = {};
                parsed.forEach(item => {
                    const qid = item.id || ("quiz_" + Date.now() + Math.floor(Math.random() * 1000));
                    openQuizzes[qid] = { title: item.title || "Loaded Quiz", data: item.data || [] };
                    addQuizToSidebar(qid);
                });
                // show first quiz if any
                const keys = Object.keys(openQuizzes);
                if (keys.length) renderQuiz(keys[0]);
                alert("Session loaded.");
            } catch (err) {
                console.error(err);
                alert("Failed to parse session file.");
            }
        };
        reader.readAsText(file);
    };
    document.body.appendChild(fi);
    fi.click();
    fi.remove();
});
