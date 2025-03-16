const router = require("express")();
const authMiddleware = require("../middlewares/authMiddleware");
const {senderDeletion} = require("../controllers/senderDeletion");

router.post("/deleteEntry", authMiddleware, senderDeletion);
module.exports = router;