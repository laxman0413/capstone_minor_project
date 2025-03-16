const { s3 } = require('../config/aws');
const fs = require('fs');
const maskImagePII = require('../utils/Imagehandlers/processDocument');
const pdfToJpgConverter = require('../utils/PdfHandlers/pdftojpg');
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const Document = require('../models/Document');
const { logActivity } = require('../utils/activityLogger');

const uploadDocument = async (req, res) => {
    try {
        // Validate request
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024;
        if (req.file.size > maxSize) {
            fs.unlinkSync(req.file.path);
            return res.status(413).json({ message: "File size too large. Maximum size is 10MB" });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            fs.unlinkSync(req.file.path);
            return res.status(415).json({ message: "Invalid file type. Only JPEG, PNG and PDF files are allowed" });
        }

        const { documentType, isSave } = req.body;

        if (!documentType) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "Document type is required" });
        }

        const filePath = req.file.path;
        let processedFilePath = filePath;

        try {
            // Convert PDF to JPG if needed
            if (req.file.mimetype === 'application/pdf') {
                const imagePath = await pdfToJpgConverter(filePath);
                if (!imagePath || !imagePath[0]) {
                    throw new Error('PDF conversion failed');
                }
                processedFilePath = imagePath[0];
            }

            // Mask PII Data
            console.log(processedFilePath);
            const {maskedFilePath,piiHash} = await maskImagePII(processedFilePath, 'masked_uploads/', documentType);
            console.log(maskedFilePath);
            
            if (maskedFilePath === processedFilePath) {
                fs.unlinkSync(processedFilePath);
                return res.status(200).json({ 
                    message: "No PII data found in the document",
                    isNoPII: true 
                });
            }

            if (isSave === "true" || isSave === true) {
                // Upload masked file to S3
                const filename = req.file.filename;
                const fileStream = fs.createReadStream(maskedFilePath);
                const uploadParams = {
                    Bucket: process.env.AWS_MI_BUCKET_NAME,
                    Key: `masked/${req.file.filename}`,
                    Body: fileStream,
                    ContentType: req.file.mimetype
                };

                const command = new PutObjectCommand(uploadParams);
                const result = await s3.send(command);

                // Save document info in database
                const newDocument = new Document({
                    userId: req.userId,
                    documentType,
                    originalName: req.file.originalname,
                    maskedFileName: req.file.filename,
                    piiHash
                });
                await newDocument.save();

                // Log the upload activity
                await logActivity(
                    req.userId,
                    'upload',
                    `Uploaded and masked ${documentType} document: ${req.file.originalname}`,
                    {
                        documentId: newDocument._id,
                        metadata: {
                            documentType,
                            originalName: req.file.originalname,
                            fileSize: req.file.size
                        }
                    }
                );

                // Cleanup files
                cleanup([filePath, processedFilePath, maskedFilePath]);

                return res.json({ 
                    message: "File uploaded & masked successfully",
                    fileUrl: filename 
                });
            } else {
                // Return masked file directly
                const fileBuffer = fs.readFileSync(maskedFilePath);
                const contentType = req.file.mimetype.startsWith('image') ? 
                    req.file.mimetype : 'image/jpeg';

                res.setHeader('Content-Type', contentType);
                res.setHeader('Content-Disposition', `inline; filename="${req.file.filename}"`);
                res.send(fileBuffer);

                // Cleanup files after response
                process.nextTick(() => cleanup([filePath, processedFilePath, maskedFilePath]));
            }
        } catch (processingError) {
            cleanup([filePath, processedFilePath]);
            throw processingError;
        }

    } catch (err) {
        console.error("Error in uploadDocument:", err);
        res.status(500).json({ 
            error: "Failed to process document",
            message: err.message 
        });
    }
};

const publicUploadDocument=async (req, res) => {
    try {
        // Validate request
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024;
        if (req.file.size > maxSize) {
            fs.unlinkSync(req.file.path);
            return res.status(413).json({ message: "File size too large. Maximum size is 10MB" });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            fs.unlinkSync(req.file.path);
            return res.status(415).json({ message: "Invalid file type. Only JPEG, PNG and PDF files are allowed" });
        }

        const { documentType } = req.body;

        if (!documentType) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "Document type is required" });
        }

        const filePath = req.file.path;
        let processedFilePath = filePath;

        try {
            // Convert PDF to JPG if needed
            if (req.file.mimetype === 'application/pdf') {
                const imagePath = await pdfToJpgConverter(filePath);
                if (!imagePath || !imagePath[0]) {
                    throw new Error('PDF conversion failed');
                }
                processedFilePath = imagePath[0];
            }

            // Mask PII Data
            const maskedFilePath = await maskImagePII(processedFilePath, 'masked_uploads/', documentType);
            
            if (maskedFilePath === processedFilePath) {
                fs.unlinkSync(processedFilePath);
                return res.status(200).json({ 
                    message: "No PII data found in the document",
                    isNoPII: true 
                });
            }
            // Return masked file directly
            const fileBuffer = fs.readFileSync(maskedFilePath);
            const contentType = req.file.mimetype.startsWith('image') ? 
                req.file.mimetype : 'image/jpeg';

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `inline; filename="${req.file.filename}"`);
            res.send(fileBuffer);

            // Cleanup files after response
            process.nextTick(() => cleanup([filePath, processedFilePath, maskedFilePath]));
        } catch (processingError) {
            cleanup([filePath, processedFilePath]);
            throw processingError;
        }

    } catch (err) {
        console.error("Error in uploadDocument:", err);
        res.status(500).json({ 
            error: "Failed to process document",
            message: err.message 
        });
    }
};

function cleanup(files) {
    files.forEach(file => {
        if (file && fs.existsSync(file)) {
            try {
                fs.unlinkSync(file);
            } catch (err) {
                console.error(`Error cleaning up file ${file}:`, err);
            }
        }
    });
}

module.exports = { uploadDocument,publicUploadDocument };