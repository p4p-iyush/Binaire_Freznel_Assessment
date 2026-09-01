const { parentPort, workerData } = require("worker_threads");
const fs = require("fs");
const readline = require("readline");

async function processCSV() {
    try {
        const { filePath } = workerData;

        const stats = fs.statSync(filePath);
        const fileSize = stats.size;

        let bytesRead = 0;
        let total = 0;

        const stream = fs.createReadStream(filePath);

        stream.on("data", (chunk) => {
            bytesRead += chunk.length;

            const progress = Math.min(
                Math.round((bytesRead / fileSize) * 100),
                99
            );

            parentPort.postMessage({
                type: "progress",
                progress
            });
        });

        const rl = readline.createInterface({
            input: stream,
            crlfDelay: Infinity
        });

        for await (const line of rl) {
            const values = line.split(",");

            for (const value of values) {
                const number = Number(value.trim());

                if (!Number.isNaN(number)) {
                    total += number;
                }
            }
        }

        parentPort.postMessage({
            type: "progress",
            progress: 100
        });

        parentPort.postMessage({
            type: "completed",
            result: total
        });

    } catch (error) {
        parentPort.postMessage({
            type: "error",
            error: error.message
        });
    }
}

processCSV();