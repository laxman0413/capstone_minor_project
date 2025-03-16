const express = require("express");
const { getUserDocuments, downloadDocument, deleteDocument } = require("../controllers/documentController");
const authMiddleware = require("../middlewares/authMiddleware"); // Ensure the user is authenticated
const uploadMiddleware = require("../middlewares/uploadMiddleware");
const { uploadDocument, publicUploadDocument } = require("../controllers/uploadController");

const router = express();

router.post('/upload', authMiddleware, uploadMiddleware, uploadDocument);
router.get("/user-docs", authMiddleware, getUserDocuments);
router.get("/download/:fileKey",authMiddleware,downloadDocument);
router.delete("/delete/:fileKey", authMiddleware, deleteDocument);
router.post('/public-upload',uploadMiddleware,publicUploadDocument)

module.exports = router;
