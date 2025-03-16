const EncryptedMessages = require("../models/dataReceiver");
const { encryptText } = require("./encryptText");

exports.sharedByMe = async (req, res) => {
    let senderId = req.userId;

    try {

        const mySharedFiles = await EncryptedMessages.find({ userId: senderId},{_id : 1, encryptedText : 1, "receivers.receiverId" : 1,createdAt:1}).populate("receivers.receiverId", "name");


        if (mySharedFiles.length === 0) {
            return res.status(200).send({ success: true, message: "No data is sent by you" });
        }

        res.status(200).send({ success: true, data: mySharedFiles });

    } catch (error) {
        console.error(error);
        res.status(400).send({ error: error.message });
    }
};
