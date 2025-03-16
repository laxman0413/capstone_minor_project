const router = require("express")();

const { replaceChars } = require("../controllers/replaceChars");
const { encryptText } = require("../controllers/encryptText");
const { encryptKey } = require("../controllers/encryptKey");

const authMiddleWare = require("../middlewares/authMiddleware");

router.post("/replace-chars", replaceChars);
router.post("/encrypt-text", authMiddleWare, encryptText);



module.exports = router;
