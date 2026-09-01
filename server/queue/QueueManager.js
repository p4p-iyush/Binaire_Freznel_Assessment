
const { Worker } = require("worker_threads");
const path = require("path");

class QueueManager {

    constructor(io) {
        this.io = io;

        // Waiting jobs
        this.queue = [];

        // Currently processing jobs
        this.processingJobs = new Map();

        // Completed jobs
        this.completedJobs = new Map();

        // Maximum number of workers running at once
        this.maxWorkers = 2;

        this.activeWorkers = 0;

        // Used to generate unique process IDs
        this.processCounter = 1;
    }

    // ==========================================
    // Add new job to queue
    // ==========================================

    addJob({ userId, file, priority }) {

        const job = {
            processId: `P-${Date.now()}-${this.processCounter++}`,

            userId,

            fileName: file.originalname,

            filePath: file.path,

            priority: priority.toLowerCase(),

            status: "File added to queue",

            progress: 0,

            result: null,

            createdAt: new Date()
        };

        this.queue.push(job);

        // High priority jobs come first
        this.sortQueue();

        this.emitQueueUpdate();

        // Start processing if worker is available
        this.processNext();

        return job;
    }

    // ==========================================
    // Sort queue by priority
    // ==========================================

    sortQueue() {

        this.queue.sort((a, b) => {

            if (a.priority === b.priority) {
                // FIFO for same priority
                return a.createdAt - b.createdAt;
            }

            return a.priority === "high" ? -1 : 1;
        });
    }

    // ==========================================
    // Start next available jobs
    // ==========================================

    processNext() {

        while (
            this.activeWorkers < this.maxWorkers &&
            this.queue.length > 0
        ) {

            const job = this.queue.shift();

            this.startJob(job);
        }

        this.emitQueueUpdate();
    }

    // ==========================================
    // Start processing one job
    // ==========================================

    startJob(job) {

        this.activeWorkers++;

        this.processingJobs.set(job.processId, job);

        job.status = "Processing...";
        job.progress = 0;

        this.emitJobUpdate(job);

        const workerPath = path.join(
            __dirname,
            "../workers/csvWorker.js"
        );

        const worker = new Worker(workerPath, {
            workerData: {
                filePath: job.filePath,
                processId: job.processId
            }
        });

        // ======================================
        // Worker progress
        // ======================================

        worker.on("message", (message) => {

            if (message.type === "progress") {

                job.progress = message.progress;

                this.emitJobUpdate(job);
            }

            // ==================================
            // Worker completed
            // ==================================

            if (message.type === "completed") {

                job.status = "Completed";
                job.progress = 100;
                job.result = message.result;

                this.processingJobs.delete(job.processId);

                this.completedJobs.set(
                    job.processId,
                    job
                );

                this.activeWorkers--;

                this.emitJobUpdate(job);

                // Process next waiting job
                this.processNext();
            }
        });

        // ======================================
        // Worker error
        // ======================================

        worker.on("error", (error) => {

            console.error(
                `Worker error for ${job.processId}:`,
                error
            );

            job.status = "Failed";
            job.error = error.message;

            this.processingJobs.delete(job.processId);

            this.activeWorkers--;

            this.emitJobUpdate(job);

            // Important:
            // Continue queue even if one job fails.
            this.processNext();
        });

        // ======================================
        // Worker exit
        // ======================================

        worker.on("exit", (code) => {

            if (code !== 0) {
                console.error(
                    `Worker stopped with exit code ${code}`
                );
            }
        });
    }

    // ==========================================
    // Get complete queue status
    // ==========================================

    getQueueStatus() {

        const waitingJobs = this.queue.map(
            (job, index) => ({
                ...job,
                queuePosition: index + 1,
                status: "Waiting for processing"
            })
        );

        const processingJobs = Array.from(
            this.processingJobs.values()
        );

        const completedJobs = Array.from(
            this.completedJobs.values()
        );

        return {
            waiting: waitingJobs,
            processing: processingJobs,
            completed: completedJobs,

            totalWaiting: waitingJobs.length,

            activeWorkers: this.activeWorkers,

            maxWorkers: this.maxWorkers
        };
    }

    // ==========================================
    // Send complete queue to all clients
    // ==========================================

    emitQueueUpdate() {

        this.io.emit(
            "queue:update",
            this.getQueueStatus()
        );
    }

    // ==========================================
    // Send individual job update
    // ==========================================

    emitJobUpdate(job) {

        this.io.emit(
            "job:update",
            job
        );

        this.emitQueueUpdate();
    }
}

module.exports = QueueManager;

