
const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const { Server } = require("socket.io");

const QueueManager = require("./queue/QueueManager");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const PORT = process.env.PORT || 3000;

// ==================== Middleware ====================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend
app.use(express.static(path.join(__dirname, "../public")));

// ==================== File Upload ====================

const uploadDir = path.join(__dirname, "../uploads");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage
});

// ==================== Queue Manager ====================

const queueManager = new QueueManager(io);

// ==================== Routes ====================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.get("/api/queue", (req, res) => {
    res.json(queueManager.getQueueStatus());
});

// Upload CSV
app.post("/api/upload", upload.single("file"), (req, res) => {

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No CSV file uploaded"
            });
        }

        const userId = req.body.userId || "anonymous";
        const priority = req.body.priority || "low";

        if (!["high", "low"].includes(priority)) {
            return res.status(400).json({
                success: false,
                message: "Priority must be high or low"
            });
        }

        const job = queueManager.addJob({
            userId,
            file: req.file,
            priority
        });

        res.status(201).json({
            success: true,
            message: "File added to queue",
            job
        });

    } catch (error) {

        console.error("Upload error:", error);

        res.status(500).json({
            success: false,
            message: error.message || "Failed to upload file"
        });
    }
});

// ==================== Socket.IO ====================

io.on("connection", (socket) => {

    console.log(`Client connected: ${socket.id}`);

    // Send current queue immediately
    socket.emit("queue:update", queueManager.getQueueStatus());

    socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// ==================== Start Server ====================

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});

