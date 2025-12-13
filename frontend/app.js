const API_BASE = "http://127.0.0.1:8000";


let openQuizzes = {};
let weakSpots = [];
let activeQuizId = null;

function el(tag, className = "") {
    const element = document.createElement(tag);
    if (className) element.className = className;
    return element;
}

/* ================= UI Helpers ================= */
const overlay = document.getElementById("loadingOverlay");
const generateBtn = document.getElementById("generateBtn");

function showLoading(text = "Generating questions…") {
    document.getElementById("quizControls").classList.add("hidden");
    showSkeletonLoader();
    overlay.style.display = "flex";
    overlay.querySelector(".loading-text").textContent = text;
    generateBtn.disabled = true;
}

function hideLoading() {
    overlay.style.display = "none";
    generateBtn.disabled = false;
}

function showSkeletonLoader(count = 5) {
    const container = document.getElementById("quizContainer");
    container.innerHTML = "";

    for (let i = 0; i < count; i++) {
        const card = document.createElement("div");
        card.className = "quiz-card";
        card.innerHTML = `
            <div class="skeleton skeleton-question"></div>
            <div class="skeleton skeleton-option"></div>
            <div class="skeleton skeleton-option"></div>
            <div class="skeleton skeleton-option"></div>
        `;
        container.appendChild(card);
    }
}

function showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    if (!toast) {
        console.error("Toast element not found");
        return;
    }

    toast.textContent = message;

    toast.classList.remove("toast-success", "toast-error", "toast-info");
    toast.classList.add(`toast-${type}`);

    toast.style.display = "block";

    setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
}


const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalInput = document.getElementById("modalInput");
const modalConfirm = document.getElementById("modalConfirm");
const modalCancel = document.getElementById("modalCancel");

function openModal({ title, message, showInput = false, inputValue = "", onConfirm }) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    if (showInput) {
        modalInput.classList.remove("hidden");
        modalInput.value = inputValue;
        modalInput.focus();
    } else {
        modalInput.classList.add("hidden");
    }

    modalOverlay.classList.remove("hidden");

    modalConfirm.onclick = () => {
        modalOverlay.classList.add("hidden");
        onConfirm(showInput ? modalInput.value : null);
    };

    modalCancel.onclick = () => {
        modalOverlay.classList.add("hidden");
    };
}

/* ================= Tabs ================= */
function addQuizToSidebar(id) {
    const quiz = openQuizzes[id];
    const list = document.getElementById("quizList");

    const row = document.createElement("div");
    row.className =
        "quiz-row flex items-center justify-between gap-2 p-2 rounded hover:bg-gray-700";

    const title = document.createElement("span");
    title.textContent = quiz.title || "Untitled Quiz";
    title.className = "cursor-pointer flex-1 truncate";
    title.onclick = () => {
        activeQuizId = id;
        renderQuiz(id);
    };

    const actions = document.createElement("div");
    actions.className = "flex gap-1";

    /* ✏️ Rename */
    const renameBtn = document.createElement("button");
    renameBtn.innerHTML = "✏️";
    renameBtn.title = "Rename quiz";
    renameBtn.onclick = () => {
        openModal({
            title: "Rename Quiz",
            message: "Enter a new name for this quiz.",
            showInput: true,
            inputValue: quiz.title || "",
            onConfirm: (newName) => {
                if (!newName.trim()) return;
                quiz.title = newName;
                title.textContent = newName;
                showToast("Quiz renamed.", "info");
            }
        });
    };

    /* 🗑️ Delete */
    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "🗑️";
    deleteBtn.title = "Delete quiz";
    deleteBtn.onclick = () => {
        openModal({
            title: "Delete Quiz",
            message: "Are you sure you want to delete this quiz from the session?",
            onConfirm: () => {
                delete openQuizzes[id];
                row.remove();

                if (activeQuizId === id) {
                    quizContainer.innerHTML = "";
                    quizControls.classList.add("hidden");
                    activeQuizId = null;
                }

                showToast("Quiz deleted from session.", "info");
            }
        });
    };

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);

    row.appendChild(title);
    row.appendChild(actions);
    list.appendChild(row);
}


document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active-tab"));
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("hidden"));
        btn.classList.add("active-tab");
        document.getElementById(btn.dataset.tab).classList.remove("hidden");
    };
});

/* ================= API Helper ================= */
async function postJSON(endpoint, payload) {
    const res = await fetch(API_BASE + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    return res.json();
}

/* ================= Generate ================= */
generateBtn.onclick = async () => {
    const mode = modeSelect.value;
    const cognitive = cognitiveSelect.value;
    const num = Number(numSelect.value);

    /* ✅ STEP 1: VALIDATE FIRST */
    if (!topicTab.classList.contains("hidden")) {
        if (!topicInput.value.trim()) {
            showToast("Please enter a topic.", "error");
            return;
        }
    }

    if (!passageTab.classList.contains("hidden")) {
        if (!passageInput.value.trim()) {
            showToast("Please paste a passage.", "error");
            return;
        }
    }

    if (!webTab.classList.contains("hidden")) {
        if (!webInput.value.trim()) {
            showToast("Please paste a valid URL.", "error");
            return;
        }
    }

    /* ✅ STEP 2: SHOW LOADING ONLY AFTER VALID INPUT */
    showLoading();

    try {
        let data;

        if (!topicTab.classList.contains("hidden")) {
            data = await postJSON("/generate/topic", {
                topic: topicInput.value,
                mode,
                cognitive_level: cognitive,
                num_questions: num
            });
        } 
        else if (!passageTab.classList.contains("hidden")) {
            data = await postJSON("/generate/passage", {
                passage: passageInput.value,
                mode,
                cognitive_level: cognitive,
                num_questions: num
            });
        } 
        else {
            data = await postJSON("/generate/webpage", {
                url: webInput.value,
                mode,
                cognitive_level: cognitive,
                num_questions: num
            });
        }

        if (!data.questions?.length) {
            hideLoading();
            showToast(data.error || "No questions could be generated.", "error");
            return;
        }

        const id = "quiz_" + Date.now();
        openQuizzes[id] = {
            title: data.title || "Generated Quiz",
            data: data.questions
        };

        activeQuizId = id;
        addQuizToSidebar(id);
        renderQuiz(id);

        showToast("Quiz added to current session.", "success");

    } catch (err) {
        console.error(err);
        showToast("Generation failed. Please try again.", "error");
    } finally {
        hideLoading();
    }
};


/* ================= Render Quiz ================= */
function renderQuiz(id) {
    const quiz = openQuizzes[id];
    quizContainer.innerHTML = "";

    quiz.data.forEach((q, i) => {
        const card = document.createElement("div");
        card.className = "quiz-card";
        card.innerHTML = `
            <p class="font-bold mb-2">${i + 1}. ${q.question_text}</p>
            ${q.options.map(o => `
                <label class="flex gap-2 mb-1">
                    <input type="radio" name="q${i}" value="${o}">
                    <span>${o}</span>
                </label>
            `).join("")}
        `;
        quizContainer.appendChild(card);
    });

    quizControls.classList.remove("hidden");
    scoreLabel.textContent = "";
}

/* ================= Submit Answers ================= */
submitBtn.onclick = () => {
    if (!activeQuizId) return;

    const questions = openQuizzes[activeQuizId].data;
    let score = 0;
    const container = quizContainer;

    questions.forEach((q, i) => {
        const selected = container.querySelector(`input[name='q${i}']:checked`);
        const qBlock = container.children[i];

        if (!selected) return;

        if (selected.value === q.correct_answer) {
            score++;
            qBlock.querySelector("p").style.color = "#22c55e";
        } else {
            qBlock.querySelector("p").style.color = "#ef4444";
            if (q.topic_tag && !weakSpots.includes(q.topic_tag)) {
                weakSpots.push(q.topic_tag);
            }
        }
    });

    weakSpotBtn.disabled = weakSpots.length === 0;
    scoreLabel.textContent = `Score: ${score}/${questions.length}`;
};

/* ================= Show Answers ================= */
showAnsBtn.onclick = () => {
    if (!activeQuizId) return;

    openQuizzes[activeQuizId].data.forEach((q, i) => {
        quizContainer
            .querySelectorAll(`input[name='q${i}']`)
            .forEach(r => {
                if (r.value === q.correct_answer) {
                    r.checked = true;
                    r.parentElement.style.color = "#22c55e";
                }
            });
    });
};

/* ================= Copy Quiz ================= */
copyBtn.onclick = () => {
    if (!activeQuizId) return;

    let text = "";
    openQuizzes[activeQuizId].data.forEach((q, i) => {
        text += `Q${i + 1}: ${q.question_text}\n`;
        q.options.forEach((o, j) => {
            text += `  ${String.fromCharCode(65 + j)}. ${o}\n`;
        });
        text += `Correct: ${q.correct_answer}\n\n`;
    });

    navigator.clipboard.writeText(text);
    showToast("Quiz copied to clipboard!", "success");
};

/* ================= Weak Spot Practice ================= */
weakSpotBtn.onclick = async () => {
    if (!weakSpots.length) {
        showToast("No weak spots yet. Answer some questions first.", "info");
        return;
    }

    const topics = [...new Set(weakSpots)].join(", ");
    const data = await postJSON("/generate/topic", {
        topic: topics,
        mode: "Hard",
        cognitive_level: "Application",
        num_questions: 5
    });

    if (!data.questions?.length) {
        showToast("Could not generate weak-spot questions.", "error");
        return;
    }

    const id = "quiz_" + Date.now();
    openQuizzes[id] = { title: "Weak Spot Review", data: data.questions };
    renderQuiz(id);
    showToast("Weak spot quiz generated!", "success");
};

/* ================= Save / Load Session ================= */
saveSessionBtn.onclick = () => {
    const payload = Object.values(openQuizzes);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `quiz_session_${Date.now()}.json`;
    a.click();
    showToast("Session saved successfully!", "success");
};

loadSessionBtn.onclick = () => {
    const fi = document.createElement("input");
    fi.type = "file";
    fi.accept = ".json";

    fi.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const parsed = JSON.parse(ev.target.result);

                // clear UI
                document.getElementById("quizList").innerHTML = "";
                openQuizzes = {};
                activeQuizId = null;

                parsed.forEach(item => {
                    const id = "quiz_" + Date.now() + Math.random();
                    openQuizzes[id] = {
                        title: item.title || "Loaded Quiz",
                        data: item.data || []
                    };
                    addQuizToSidebar(id);
                });

                const firstId = Object.keys(openQuizzes)[0];
                if (firstId) {
                    activeQuizId = firstId;
                    renderQuiz(firstId);
                }

                showToast("Session loaded successfully!", "success");
            } catch (err) {
                console.error(err);
                showToast("Invalid session file.", "error");
            }
        };
        reader.readAsText(file);
    };

    fi.click();
};


/* ================= Enter Key Handling ================= */
["topicInput", "webInput"].forEach(id => {
    document.getElementById(id)?.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            generateBtn.click();
        }
    });
});

passageInput?.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        generateBtn.click();
    }
});
document.getElementById("pdfBtn").addEventListener("click", () => {
    if (!activeQuizId) {
        showToast("No quiz to export.", "error");
        return;
    }

    const quiz = openQuizzes[activeQuizId];

    /* ===== Create clean PDF container ===== */
    const pdfRoot = document.createElement("div");
    pdfRoot.style.fontFamily = "Times New Roman, serif";
    pdfRoot.style.color = "#000";
    pdfRoot.style.padding = "24px";
    pdfRoot.style.background = "#fff";

    /* Title */
    const title = document.createElement("h1");
    title.textContent = quiz.title || "Quiz";
    title.style.textAlign = "center";
    title.style.marginBottom = "24px";
    pdfRoot.appendChild(title);

    /* Questions */
    quiz.data.forEach((q, index) => {
        const block = document.createElement("div");
        block.style.marginBottom = "20px";
        block.style.pageBreakInside = "avoid";

        /* Question text */
        const qText = document.createElement("p");
        qText.innerHTML = `<strong>${index + 1}.</strong> ${q.question_text}`;
        qText.style.marginBottom = "8px";
        block.appendChild(qText);

        /* Options */
        const opts = document.createElement("ol");
        opts.type = "A";
        opts.style.marginLeft = "20px";

        q.options.forEach(opt => {
            const li = document.createElement("li");
            li.textContent = opt;
            li.style.marginBottom = "4px";
            opts.appendChild(li);
        });

        block.appendChild(opts);
        pdfRoot.appendChild(block);
    });

    /* ===== Generate PDF ===== */
    html2pdf()
        .set({
            margin: 0.75,
            filename: (quiz.title || "quiz").replace(/\s+/g, "_") + ".pdf",
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: "in", format: "a4", orientation: "portrait" }
        })
        .from(pdfRoot)
        .save();

    showToast("PDF downloaded successfully.", "success");
});
const answerTitle = document.createElement("h2");
answerTitle.textContent = "Answer Key";
pdfRoot.appendChild(answerTitle);

quiz.data.forEach((q, i) => {
    const ans = document.createElement("p");
    ans.textContent = `${i + 1}. ${q.correct_answer}`;
    pdfRoot.appendChild(ans);
});

