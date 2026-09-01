const socket = io();

const uploadForm = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const uploadButton = document.getElementById("uploadButton");
const uploadMessage = document.getElementById("uploadMessage");

const queueContainer = document.getElementById("queueContainer");
const emptyQueue = document.getElementById("emptyQueue");

const waitingCount = document.getElementById("waitingCount");
const processingCount = document.getElementById("processingCount");
const completedCount = document.getElementById("completedCount");
const workerCount = document.getElementById("workerCount");

const connectionDot = document.getElementById("connectionDot");
const connectionStatus = document.getElementById("connectionStatus");

// Generate a unique ID for this browser/client
let userId = localStorage.getItem("binaire_user_id");

if (!userId) {
    userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem("binaire_user_id", userId);
}

// ==========================================
// Socket Connection
// ==========================================

socket.on("connect", () => {
    connectionDot.className = "h-2.5 w-2.5 rounded-full bg-green-400";
    connectionStatus.textContent = "Connected";
});

socket.on("disconnect", () => {
    connectionDot.className = "h-2.5 w-2.5 rounded-full bg-red-400";
    connectionStatus.textContent = "Disconnected";
});

// ==========================================
// FILE SELECTION + VISUAL UPLOAD ORDER
// ==========================================

let selectedFilePriorities = [];

fileInput.addEventListener("change", () => {
    const files = Array.from(fileInput.files);

    const container = document.getElementById("selectedFilesContainer");
    const selectedFiles = document.getElementById("selectedFiles");
    const count = document.getElementById("selectedFileCount");

    selectedFiles.innerHTML = "";

    if (files.length === 0) {
        container.classList.add("hidden");
        fileName.textContent = "SELECT CSV FILES";
        selectedFilePriorities = [];
        return;
    }

    fileName.textContent = `${files.length} CSV FILES SELECTED`;

    fileName.classList.remove("text-slate-400");
    fileName.classList.add("text-[#8cff66]");

    container.classList.remove("hidden");

    count.textContent =
        `${files.length} FILE${files.length > 1 ? "S" : ""}`;

    // Default priority for every file
    selectedFilePriorities = files.map(() => "low");

    files.forEach((file, index) => {

        const row = document.createElement("div");

        row.className =
            "flex flex-col gap-3 border-2 border-[#46564e] bg-[#0b0f0e] p-4 sm:flex-row sm:items-center sm:justify-between";

        row.innerHTML = `
            <div class="flex min-w-0 items-center gap-3">

                <span class="text-[#8cff66] text-lg">
                    ${String(index + 1).padStart(2, "0")}
                </span>

                <span class="text-[#8cff66]">
                    ▣
                </span>

                <div class="min-w-0">
                    <p class="truncate text-sm font-bold text-[#d8e8df]">
                        ${escapeHTML(file.name)}
                    </p>

                    <p class="text-[10px] uppercase text-[#46564e]">
                        ${(file.size / 1024).toFixed(1)} KB
                    </p>
                </div>

            </div>

            <select
                class="file-priority w-full border-2 border-[#46564e] bg-[#111714] px-3 py-2 text-xs font-bold text-[#d8e8df] outline-none focus:border-[#8cff66] sm:w-40"
                data-index="${index}"
            >
                <option value="high">HIGH PRIORITY</option>
                <option value="low" selected>LOW PRIORITY</option>
            </select>
        `;

        selectedFiles.appendChild(row);
    });


    // Listen for priority changes
    document.querySelectorAll(".file-priority").forEach(select => {

        select.addEventListener("change", () => {

            const index = Number(select.dataset.index);

            selectedFilePriorities[index] = select.value;

        });

    });
});


// ==========================================
// UPLOAD FILES ONE BY ONE
// ==========================================

uploadForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const files = Array.from(fileInput.files);

    if (files.length === 0) {

        showMessage(
            "PLEASE SELECT AT LEAST ONE CSV FILE.",
            "error"
        );

        return;
    }


    // Validate CSV files
    const invalidFile = files.find(
        file => !file.name.toLowerCase().endsWith(".csv")
    );

    if (invalidFile) {

        showMessage(
            "ONLY CSV FILES ARE ALLOWED.",
            "error"
        );

        return;
    }


    const prioritySelectors =
        document.querySelectorAll(".file-priority");


    try {

        uploadButton.disabled = true;


        // Upload in exact visual order
        for (let i = 0; i < files.length; i++) {

            const file = files[i];

            const priority =
                prioritySelectors[i].value;


            // Highlight currently uploading file
            prioritySelectors[i].parentElement.classList.add(
                "border-[#8cff66]"
            );


            uploadButton.textContent =
                `UPLOADING ${i + 1}/${files.length}...`;


            showMessage(
                `UPLOADING ${i + 1}/${files.length}: ${file.name}`,
                "info"
            );


            const formData = new FormData();

            formData.append("file", file);

            formData.append(
                "priority",
                priority
            );

            formData.append(
                "userId",
                userId
            );


            const response = await fetch(
                "/api/upload",
                {
                    method: "POST",
                    body: formData
                }
            );


            const data = await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    `FAILED: ${file.name}`
                );

            }


            // Show uploaded status
            prioritySelectors[i].parentElement.innerHTML += `
                <span class="text-[10px] font-bold text-[#8cff66]">
                    ✓ UPLOADED
                </span>
            `;


            // Small delay only for visual feedback
            await new Promise(resolve =>
                setTimeout(resolve, 500)
            );
        }


        showMessage(
            `${files.length} FILE(S) ADDED TO QUEUE SUCCESSFULLY.`,
            "success"
        );


        uploadForm.reset();


        document
            .getElementById("selectedFilesContainer")
            .classList.add("hidden");


        document.getElementById(
            "selectedFiles"
        ).innerHTML = "";


        fileName.textContent =
            "SELECT CSV FILES";


        selectedFilePriorities = [];


    } catch (error) {

        console.error(error);

        showMessage(
            error.message || "UPLOAD FAILED.",
            "error"
        );

    } finally {

        uploadButton.disabled = false;

        uploadButton.textContent =
            "UPLOAD & PROCESS";
    }
});

// ==========================================
// Receive Queue Updates
// ==========================================

socket.on("queue:update", (data) => {
    updateStatistics(data);
    renderQueue(data);
});

// ==========================================
// Receive Individual Job Updates
// ==========================================

socket.on("job:update", (job) => {
    console.log("Job updated:", job);
});

// ==========================================
// Statistics
// ==========================================

function updateStatistics(data) {
    waitingCount.textContent = data.totalWaiting || 0;

    processingCount.textContent = data.processing ? data.processing.length : 0;

    completedCount.textContent = data.completed ? data.completed.length : 0;

    workerCount.textContent = `${data.activeWorkers || 0} / ${data.maxWorkers || 2}`;
}

// ==========================================
// Render Queue
// ==========================================

function renderQueue(data) {
    const jobs = [
        ...(data.processing || []),
        ...(data.waiting || []),
        ...(data.completed || []),
    ];

    if (jobs.length === 0) {
        emptyQueue.classList.remove("hidden");

        queueContainer.innerHTML = "";
        queueContainer.appendChild(emptyQueue);

        return;
    }

    emptyQueue.classList.add("hidden");

    queueContainer.innerHTML = "";

    jobs.forEach((job) => {
        const card = createJobCard(job);

        queueContainer.appendChild(card);
    });
}

// ==========================================
// Create Job Card
// ==========================================

function createJobCard(job) {
    const card = document.createElement("div");

    card.className =
        "rounded-xl border border-white/10 bg-slate-900/60 p-4 transition hover:border-white/20";

    const priorityClass =
        job.priority === "high"
            ? "bg-red-500/10 text-red-400 border-red-500/20"
            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";

    const statusClass = getStatusClass(job.status);

    let progressHTML = "";

    if (job.status === "Processing...") {
        progressHTML = `
            <div class="mt-4">
                <div class="mb-2 flex justify-between text-xs">
                    <span class="text-slate-400">Processing</span>
                    <span class="text-blue-400">${job.progress}%</span>
                </div>

                <div class="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                        class="h-full rounded-full bg-blue-500 transition-all duration-300"
                        style="width: ${job.progress}%">
                    </div>
                </div>
            </div>
        `;
    }

    let resultHTML = "";

    if (job.status === "Completed") {
        resultHTML = `
            <div class="mt-4 rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                <p class="text-xs text-slate-400">
                    Sum of all numbers
                </p>

                <p class="mt-1 text-xl font-bold text-green-400">
                    ${formatNumber(job.result)}
                </p>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div class="min-w-0">

                <div class="flex flex-wrap items-center gap-2">

                    <h4 class="truncate font-semibold text-white">
                        ${escapeHTML(job.fileName)}
                    </h4>

                    <span
                        class="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${priorityClass}">
                        ${job.priority}
                    </span>

                </div>

                <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">

                    <span>
                        User: ${escapeHTML(job.userId)}
                    </span>

                    <span>
                        Process ID: ${job.processId}
                    </span>

                    ${job.queuePosition
            ? `<span>Position: ${job.queuePosition}</span>`
            : ""
        }

                </div>

            </div>

            <div class="shrink-0">

                <span
                    class="inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${statusClass}">
                    ${job.status}
                </span>

            </div>

        </div>

        ${progressHTML}
        ${resultHTML}
    `;

    return card;
}

// ==========================================
// Status Colors
// ==========================================

function getStatusClass(status) {
    switch (status) {
        case "Processing...":
            return "bg-blue-500/10 text-blue-400 border-blue-500/20";

        case "Completed":
            return "bg-green-500/10 text-green-400 border-green-500/20";

        case "Waiting for processing":
            return "bg-purple-500/10 text-purple-400 border-purple-500/20";

        case "Failed":
            return "bg-red-500/10 text-red-400 border-red-500/20";

        default:
            return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
}

// ==========================================
// Message
// ==========================================

function showMessage(message, type) {
    uploadMessage.classList.remove(
        "hidden",
        "bg-red-500/10",
        "text-red-400",
        "bg-green-500/10",
        "text-green-400",
        "bg-blue-500/10",
        "text-blue-400",
    );

    if (type === "error") {
        uploadMessage.classList.add("bg-red-500/10", "text-red-400");
    }

    if (type === "success") {
        uploadMessage.classList.add("bg-green-500/10", "text-green-400");
    }

    if (type === "info") {
        uploadMessage.classList.add("bg-blue-500/10", "text-blue-400");
    }

    uploadMessage.textContent = message;
}

// ==========================================
// Format Number
// ==========================================

function formatNumber(value) {
    if (typeof value !== "number") {
        return value;
    }

    return value.toLocaleString("en-US", {
        maximumFractionDigits: 10,
    });
}

// ==========================================
// Prevent HTML Injection
// ==========================================

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
