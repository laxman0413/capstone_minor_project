const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the user
    documentType: { 
        type: String, 
        enum: ['adhaar', 'pan', 'driving_license', 'other'],
        default: 'other'
    },
    originalName: String,  // Original filename
    maskedFileName: String,     // S3 or storage URL of the masked document
    piiHash: String,            // Hash of the PII data
    uploadedAt: { type: Date, default: Date.now } // Timestamp of upload
});

module.exports = mongoose.model("Document", documentSchema);