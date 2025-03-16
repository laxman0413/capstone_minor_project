const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const documentRoutes=require('./routes/documentRoutes.js')
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

const EncryptionRoute = require("./routes/encryption.js");
const DecryptionRoute = require("./routes/decryption.js");
const sharedDataRoute = require("./routes/sharedRoutes.js");
const senderRoute = require("./routes/senderRoutes.js");


dotenv.config();
connectDB();

const app = express();
app.use(express.json());

// Configure CORS with more options
const corsOptions = {
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200', 'http://localhost:4000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200', 'http://localhost:4000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
  },
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  transports: ['websocket', 'polling']
});

// Socket.io setup
require('./socket')(io);

app.use("/uploads", express.static("uploads"));
app.use("/api/auth", authRoutes);
app.use('/api/documents',documentRoutes)
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/encrypt',EncryptionRoute);
app.use('/decrypt',DecryptionRoute);
app.use("/sharedData", sharedDataRoute);
app.use("/sender",senderRoute);




  
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));













// const express = require('express');
// const multer = require('multer');
// const maskImagePii = require('./Imagehandlers/maskImagePII'); // Ensure this function works correctly
// const fs = require('fs').promises;
// const path = require('path');

// const app = express();
// const port = 3000;

// // Configure multer for file uploads (store files in memory)
// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

// app.post('/upload', upload.single('document'), async (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).send('No file uploaded.');
//         }

//         // Ensure directories exist
//         const uploadDir = path.join(__dirname, 'uploads');
//         const maskedUploadDir = path.join(__dirname, 'masked_uploads');
//         await fs.mkdir(uploadDir, { recursive: true });
//         await fs.mkdir(maskedUploadDir, { recursive: true });

//         // Save the original image
//         const originalFilePath = path.join(uploadDir, req.file.originalname);
//         await fs.writeFile(originalFilePath, req.file.buffer);
//         console.log(`Original file saved at: ${originalFilePath}`);

//         // Process the image for PII masking
//         const maskedFilePath = await maskImagePii(originalFilePath, maskedUploadDir);

//         if (!maskedFilePath) {
//             throw new Error('Masked image processing failed.');
//         }

//         console.log(`Masked file saved at: ${maskedFilePath}`);

//         // Send the masked image back to the client
//         res.status(201).send({
//             original: req.file.originalname,
//             masked: path.basename(maskedFilePath),
//             message: 'Masked image created successfully.'
//         });

//     } catch (error) {
//         console.error('Error processing document:', error);
//         res.status(500).send('Error processing document.');
//     }
// });



// app.listen(port, () => {
//     console.log(`Server listening at http://localhost:${port}`);
// });




