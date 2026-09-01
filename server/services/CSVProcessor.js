class CSVProcessor {

    static validateFile(file) {
        if (!file) {
            throw new Error("No file provided");
        }

        if (!file.originalname.toLowerCase().endsWith(".csv")) {
            throw new Error("Only CSV files are allowed");
        }

        return true;
    }

    static parseNumbers(content) {
        const values = content
            .split(/[\s,]+/)
            .map(value => Number(value.trim()))
            .filter(value => !Number.isNaN(value));

        return values;
    }

    static calculateSum(content) {
        const numbers = this.parseNumbers(content);

        return numbers.reduce(
            (sum, number) => sum + number,
            0
        );
    }
}

module.exports = CSVProcessor;