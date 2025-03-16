const https = require("https");
const path = require("path");
const fs = require("fs");
const request = require("request");
require("dotenv").config();

const API_KEY = process.env.PDF_API_KEY;

function pdfToJpgConverter(sourceFile, pages = "", password = "") {
    return getPresignedUrl(API_KEY, sourceFile)
        .then(([uploadUrl, uploadedFileUrl]) => uploadFile(sourceFile, uploadUrl).then(() => uploadedFileUrl))
        .then(uploadedFileUrl => convertPDFToJPG(API_KEY, uploadedFileUrl, password, pages))
        .catch(console.error);
}

function getPresignedUrl(apiKey, localFile) {
    return new Promise((resolve, reject) => {
        const queryPath = `/v1/file/upload/get-presigned-url?contenttype=application/octet-stream&name=${path.basename(localFile)}`;
        const reqOptions = {
            host: "api.pdf.co",
            path: encodeURI(queryPath),
            headers: { "x-api-key": apiKey }
        };

        https.get(reqOptions, (response) => {
            let data = "";
            response.on("data", chunk => { data += chunk; });
            response.on("end", () => {
                const jsonResponse = JSON.parse(data);
                jsonResponse.error ? reject("Error getting presigned URL: " + jsonResponse.message) : resolve([jsonResponse.presignedUrl, jsonResponse.url]);
            });
        }).on("error", reject);
    });
}

function uploadFile(localFile, uploadUrl) {
    return new Promise((resolve, reject) => {
        fs.readFile(localFile, (err, data) => {
            if (err) return reject("Error reading file: " + err);
            request.put({
                url: uploadUrl,
                body: data,
                headers: { "Content-Type": "application/octet-stream" }
            }, (err) => err ? reject("File upload error: " + err) : resolve());
        });
    });
}

function convertPDFToJPG(apiKey, uploadedFileUrl, password, pages) {
    return new Promise((resolve, reject) => {
        const queryPath = `/v1/pdf/convert/to/jpg`;
        const jsonPayload = JSON.stringify({ password, pages, url: uploadedFileUrl });
        
        const reqOptions = {
            host: "api.pdf.co",
            method: "POST",
            path: queryPath,
            headers: {
                "x-api-key": apiKey,
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(jsonPayload, "utf8")
            }
        };

        const postRequest = https.request(reqOptions, (response) => {
            let data = "";
            response.on("data", chunk => { data += chunk; });
            response.on("end", () => {
                const jsonResponse = JSON.parse(data);
                if (jsonResponse.error) {
                    reject("Conversion error: " + jsonResponse.message);
                } else {
                    resolve(downloadImages(jsonResponse.urls));
                }
            });
        }).on("error", reject);

        postRequest.write(jsonPayload);
        postRequest.end();
    });
}

function downloadImages(imageUrls) {
    return new Promise((resolve, reject) => {
        const downloadedPaths = [];
        let completed = 0;
        
        imageUrls.forEach((url, index) => {
            const fileName = `./uploads/page${index + 1}.jpg`;
            const fileStream = fs.createWriteStream(fileName);
            
            https.get(url, (response) => {
                response.pipe(fileStream);
                fileStream.on("finish", () => {
                    downloadedPaths.push(fileName);
                    completed++;
                    if (completed === imageUrls.length) {
                        resolve(downloadedPaths);
                    }
                });
            }).on("error", (err) => {
                reject("Download error: " + err);
            });
        });
    });
}

module.exports = pdfToJpgConverter;
