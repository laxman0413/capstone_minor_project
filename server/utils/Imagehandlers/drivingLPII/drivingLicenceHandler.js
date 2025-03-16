// https://universe.roboflow.com/chinmoy/driving-license-project

// https://universe.roboflow.com/kevinmarcelino/redharvest

// https://universe.roboflow.com/class-4n5va/driving_license-08fcm


const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const axios=require('axios')
/**
 * Process a Driving License image and detect PII regions
 * @param {string} imagePath - Path to the image file
 * @returns {Array} Array of PII locations
 */
async function DrivingLicenseHandler(imagePath) {
    // try {
    //     // Read image file as base64
    //     const image = fs.readFileSync(imagePath, {
    //         encoding: "base64"
    //     });
        
    //     // Call Roboflow API for object detection
    //     const response = await axios({
    //         method: "POST",
    //         url: "https://detect.roboflow.com/driving-license-project-myeri/1",
    //         params: {
    //             api_key: process.env.ROBOFLOW_API_KEY
    //         },
    //         data: image,
    //         headers: {
    //             "Content-Type": "application/x-www-form-urlencoded"
    //         }
    //     });

    //     // Initialize PII locations array
    //     const piiLocations = [];
    //     // Check if predictions exist
    //     if (response.data.predictions && response.data.predictions.length > 0) {
    //         // Process each prediction
    //         response.data.predictions.forEach(element => {
    //             if(element.class!=='name'){
    //             // Calculate the bounding box coordinates
    //             const left = element.x - (element.width / 2);
    //             const top = element.y - (element.height / 2);
                
    //             // Add to PII locations with specific label based on class
    //             piiLocations.push({
    //                 pattern: element.class, // Use the class name from the API
    //                 text: 'DL', // Get a human-readable label
    //                 confidence: element.confidence,
    //                 location: {
    //                     Left: left,
    //                     Top: top,
    //                     Width: element.width,
    //                     Height: element.height
    //                 }
    //             });
    //         }
    //         });
            
    //         return piiLocations;
    //     } else {
    //         console.log("No DL card elements detected");
    //         return [];
    //     }
    //     } catch (error) {
    //     console.error("Error processing Driving License:", error.message);
    //     return [];
    // }
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

module.exports = DrivingLicenseHandler;