const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const { generateRSAKeyPair } = require("../utils/generateRSAKeyPair");
const {s3} =require('../config/aws');
const {PutObjectCommand }=require('@aws-sdk/client-s3')
const fs=require('fs')

// @desc Register User

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    //check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });


    //generating Public and Private Key
    const { publicKey, privateKey } = await generateRSAKeyPair();

    //hashing password
    const hashedPassword = await bcrypt.hash(password, 10);

    //image upload to aws
    let profileImage = '';
    if (req.file) {
      const filePath = req.file.path;
      const fileStream = fs.createReadStream(filePath);
      const fileName = `profile-images/${Date.now()}-${req.file.originalname}`;
      const bucketName = process.env.AWS_BUCKET_NAME;
      
      // Upload to S3
      const uploadParams = {
        Bucket: bucketName,
        Key: fileName,
        Body: fileStream,
        ContentType: req.file.mimetype,
        ACL: 'public-read',
      };
      await s3.send(new PutObjectCommand(uploadParams));
      profileImage = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

      // Remove local file after upload
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting local file:', err);
      });
    }

    //saving user to mongoDB
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      profileImage,
      publicKey,
      privateKey,
    });

    res.status(201).json({
      message: "User Registered Successfully",
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// @desc Login User
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    //finding User
    const user = await User.findOne({ email }).select("_id name email profileImage phone password");

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    //checking password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(400).json({ message: "Invalid credentials" });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
