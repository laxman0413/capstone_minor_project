const express = require("express");
const { registerUser, loginUser } = require("../controllers/authController");
const uploadMiddleware = require("../middlewares/uploadMiddleware");

const router = express();

router.post("/signup", uploadMiddleware, registerUser);
router.post("/signin", loginUser);

module.exports = router;
