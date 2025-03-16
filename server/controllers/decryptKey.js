const EncryptedMessage = require("../models/dataReceiver");
const signupDetails = require("../models/User");
const {PythonShell} = require("python-shell")

async function decryptKey(dataId, receiverId){
    try {
        const encryptedMessage = await EncryptedMessage.findById(dataId);
        if (!encryptedMessage) {
            return { error: "Message not found for this receiver." };
        }
        const receiver = encryptedMessage.receivers.find(receiver => receiver.receiverId.toString() === receiverId);
        const encryptedKey = receiver.encryptedAesKey;
        
        const receiverDetails = await signupDetails.findById(receiverId).select('+privateKey'); 
        if (!receiverDetails) {
            return { error: "Receiver not found." };
        }

        const privateKeyBase64 = receiverDetails.getDecryptedPrivateKey();

        let options = {
            pythonPath: '/usr/bin/python3',
            scriptPath: './utils/decryption',
            args: [encryptedKey, privateKeyBase64],
            pythonOptions: ['-u'],
        };
        
        const results = await PythonShell.run('decrypt-key.py', options);

        const decryptedAesKeyBase64 = results[0];
        
        return {decryptedAesKeyBase64 : decryptedAesKeyBase64};

    } catch (error) {
        console.error("Error decrypting message:", error);
        return { error: error.message || "Internal server error" };
    }
}

module.exports = {decryptKey};