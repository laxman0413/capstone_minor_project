const User = require("../models/User");
const fs = require("fs");
const bcrypt=require('bcryptjs')
const { s3 } = require("../config/aws");
const { PutObjectCommand,DeleteObjectCommand } = require("@aws-sdk/client-s3");

//  Get User Profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("_id name phone email profileImage"); // Exclude password and Keys
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//  Update User Profile (excluding image)
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { name, phone },
      { new: true, runValidators: true }
    ).select("_id name phone email profileImage");

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update Profile Image
exports.updateProfileImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });

    const filePath = req.file.path;
    const fileStream = fs.createReadStream(filePath);
    const fileName = `profile-images/${Date.now()}-${req.file.originalname}`;
    const bucketName = process.env.AWS_BUCKET_NAME;

    // Fetch existing user to get the old profile image URL
    const user = await User.findById(req.userId).select("profileImage");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Extract old image key from S3 URL
    if (user.profileImage) {
      const oldImageKey = user.profileImage.split(".amazonaws.com/")[1];
      if (oldImageKey) {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: oldImageKey,
          })
        );
      }
    }

    // Upload new image to S3
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: fileStream,
        ContentType: req.file.mimetype,
        ACL: "public-read",
      })
    );

    const profileImageUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // Update user profile image URL in database
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { profileImage: profileImageUrl },
      { new: true }
    ).select("-password");

    // Remove local file after upload
    fs.unlink(filePath, (err) => {
      if (err) console.error("Error deleting local file:", err);
    });

    res.json({
      message: "Profile image updated successfully",
      profileImage: profileImageUrl,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


//  Delete User Account
exports.deleteUserAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.userId);
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword; // Ensure proper hashing
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//user list by ID
exports.getUsers=async(req, res) => {
  try {

    const users = await User.find({ _id: { $ne: req.userId } })
    .select('id name email profileImage')
    .limit(10); 

    if (!users) {
        return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(users);
} catch (error) {
    res.status(500).json({ error: "Server Error" });
}
}