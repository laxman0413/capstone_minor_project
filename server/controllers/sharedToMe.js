const EncryptedMessages = require("../models/dataReceiver");
const { encryptText } = require("./encryptText");

exports.sharedToMe = async (req, res) => {
    const userId = req.userId;

    try {
        const sharedFiles = await EncryptedMessages.find({
            "receivers.receiverId": userId, // User is in the receivers list
            userId: { $ne: userId } // Exclude messages where the sender is the same as the requesting user
        }, { _id: 1, userId: 1, encryptedText: 1, createdAt: 1 })
        .populate("userId", "name");

        if (sharedFiles.length === 0) {
            return res.status(200).json({ success: true, message: "No files shared with you." });
        }

        res.status(200).json({ success: true, sharedFiles });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while fetching shared files." });
    }
};

