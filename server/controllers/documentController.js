const {DeleteObjectCommand,GetObjectCommand }=require('@aws-sdk/client-s3')
const { s3 } = require('../config/aws');
const Document = require('../models/Document');
const { logActivity } = require('../utils/activityLogger');


//geting all documents for a single user
const getUserDocuments = async (req, res) => {
    try {
        const userId = req.userId; 
        const documents = await Document.find({ userId });

        res.json({ documents });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

//to download image
const downloadDocument = async (req, res) => {
    try {
        const { fileKey } = req.params;
        const userId = req.userId; 

        // Find the document in DB
        const document = await Document.findOne({ userId, maskedFileName: fileKey });
        if (!document) {
            return res.status(404).json({ error: "File not found" });
        }

        const maskedFilename=document.maskedFileName;
        // Retrieve file from S3
        const getCommand = new GetObjectCommand({
            Bucket: process.env.AWS_MI_BUCKET_NAME,
            Key: `masked/${maskedFilename}`
        });

        const { Body } = await s3.send(getCommand);

        // Log the download activity
        await logActivity(
            userId,
            'download',
            `Downloaded document: ${document.originalName}`,
            {
                documentId: document._id,
                metadata: {
                    documentType: document.documentType,
                    originalName: document.originalName
                }
            }
        );

        // Set original file name for download
        res.attachment(document.originalName); 
        Body.pipe(res);
    } catch (err) {
        res.status(500).json({ error: "File not found" });
    }
};

//delete document
const deleteDocument = async (req, res) => {
    try {
        const { fileKey } = req.params;
        const userId = req.userId;

        // Find the document in the database
        const document = await Document.findOne({ userId, maskedFileName: fileKey });

        if (!document) {
            return res.status(404).json({ error: "File not found" });
        }

        const maskedFilename=document.maskedFileName;
        // Delete the file from S3
        const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.AWS_MI_BUCKET_NAME,
            Key: `masked/${maskedFilename}`
        });

        await s3.send(deleteCommand);

        // Log the delete activity
        await logActivity(
            userId,
            'delete',
            `Deleted document: ${document.originalName}`,
            {
                documentId: document._id,
                metadata: {
                    documentType: document.documentType,
                    originalName: document.originalName
                }
            }
        );

        // Remove document entry from MongoDB
        await Document.deleteOne({ _id: document._id });

        res.json({ message: "File deleted successfully" });

    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ error: "Error deleting file" });
    }
};




module.exports = { getUserDocuments,downloadDocument, deleteDocument };
