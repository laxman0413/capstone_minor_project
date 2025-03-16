// https://detect.roboflow.com/testprojectp/5

// https://universe.roboflow.com/priyam-jqjjb/pan-detect/dataset/3

// https://universe.roboflow.com/pk-btgjw/pan-extraction/model/1

// https://universe.roboflow.com/homevilleai/pandetection

// https://universe.roboflow.com/pan-cards/pan-cards-doird


const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * Process an PAN card image and detect PII regions
 * @param {string} imagePath - Path to the image file
 * @returns {Array} Array of PII locations
 */

async function PANHandler(imagePath) {
    return new Promise((resolve, reject) => {
        try {
            const scriptPath = path.resolve(__dirname, "detect_pii.py");
            const absoluteImagePath = path.resolve(imagePath);
            const outputPath = path.resolve(__dirname, "output.json");

            console.log(`Detecting PII in: ${absoluteImagePath}`);
            console.log(`Using script: ${scriptPath}`);

            // Run Python script synchronously
            const result = spawnSync("python3", [scriptPath, absoluteImagePath], { encoding: "utf-8" });

            console.log("Python script executed successfully");

            // Handle errors
            if (result.error) {
                console.error("Execution error:", result.error.message);
                return reject(new Error(`Python script execution failed: ${result.error.message}`));
            }
            if (result.stderr) {
                console.error("Python script stderr:", result.stderr);
            }

            // Ensure output.json exists before reading
            if (!fs.existsSync(outputPath)) {
                return reject(new Error("output.json was not generated"));
            }

            // Read and parse output.json
            const data = fs.readFileSync(outputPath, "utf8");
            const jsonData = JSON.parse(data);

            resolve(jsonData.masked_pii);
        } catch (err) {
            console.error("Error:", err);
            reject(new Error("Unexpected error in adhaarHandler"));
        }
    });
}

module.exports=PANHandler;