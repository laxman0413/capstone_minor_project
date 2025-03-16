const express = require("express");
const {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
  updateProfileImage,
  changePassword,
  getUsers
} = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const uploadMiddleware =require("../middlewares/uploadMiddleware");

const router = express();


// Protected Routes
router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateUserProfile);
router.delete("/profile", authMiddleware, deleteUserAccount);
router.post("/update-profile-image",authMiddleware,uploadMiddleware,updateProfileImage);
router.post("/change-password",authMiddleware,changePassword);
router.get("/getUsers",authMiddleware,getUsers);

module.exports = router;
