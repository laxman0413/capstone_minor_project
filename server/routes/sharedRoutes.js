const router = require("express")();
const authMiddleWare = require("../middlewares/authMiddleware");
const { sharedByMe } = require("../controllers/sharedByMe");
const { sharedToMe } = require("../controllers/sharedToMe");


router.get("/by-me", authMiddleWare, sharedByMe);
router.get("/to-me", authMiddleWare, sharedToMe);

module.exports = router;
