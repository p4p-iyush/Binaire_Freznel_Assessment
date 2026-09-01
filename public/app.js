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


// Replace your current upload section in app.js with this

uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const files = Array.from(fileInput.files);
    const priority = document.getElementById("priority").value;

    if (files.length === 0) {
        showMessage("Please select at least one CSV file.", "error");
        return;
    }

    const invalidFile = files.find(
        file => !file.name.toLowerCase().endsWith(".csv")
    );

    if (invalidFile) {
        showMessage("Only CSV files are allowed.", "error");
        return;
    }

    try {
        uploadButton.disabled = true;
        uploadButton.textContent = `Uploading ${files.length} files...`;

        for (const file of files) {
            const formData = new FormData();

            formData.append("files", file);
            formData.append("priority", priority);
            formData.append("userId", userId);

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || `Failed to upload ${file.name}`
                );
            }
        }

        showMessage(
            `${files.length} file(s) added to queue successfully.`,
            "success"
        );

        uploadForm.reset();
        fileName.textContent = "Click to select CSV file";
        fileName.className = "text-sm text-slate-400";

    } catch (error) {
        console.error(error);

        showMessage(
            error.message || "Something went wrong.",
            "error"
        );

    } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = "Upload & Process";
    }
});


// Update the file selection section too

fileInput.addEventListener("change", () => {

    const files = Array.from(fileInput.files);

    if (files.length === 0) {
        fileName.textContent = "Click to select CSV files";
        return;
    }

    fileName.textContent =
        files.length === 1
            ? files[0].name
            : `${files.length} CSV files selected`;

    fileName.classList.remove("text-slate-400");
    fileName.classList.add("text-blue-400");
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

    processingCount.textContent =
        data.processing ? data.processing.length : 0;

    completedCount.textContent =
        data.completed ? data.completed.length : 0;

    workerCount.textContent =
        `${data.activeWorkers || 0} / ${data.maxWorkers || 2}`;
}


// ==========================================
// Render Queue
// ==========================================

function renderQueue(data) {

    const jobs = [
        ...(data.processing || []),
        ...(data.waiting || []),
        ...(data.completed || [])
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

                    ${
                        job.queuePosition
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
        "text-blue-400"
    );

    if (type === "error") {
        uploadMessage.classList.add(
            "bg-red-500/10",
            "text-red-400"
        );
    }

    if (type === "success") {
        uploadMessage.classList.add(
            "bg-green-500/10",
            "text-green-400"
        );
    }

    if (type === "info") {
        uploadMessage.classList.add(
            "bg-blue-500/10",
            "text-blue-400"
        );
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
        maximumFractionDigits: 10
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