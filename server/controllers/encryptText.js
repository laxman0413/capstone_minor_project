const detectPii = require("./detectPii")
const user = require("../models/User");
const mongoose = require("mongoose");
const crypto = require("crypto");
const {encrypt_text} = require("../utils/encryption/encrypt-text");
const {encryptKey} = require("./encryptKey");
const { logActivity } = require('../utils/activityLogger');

exports.encryptText = async (req, res) => {
    let id = req.userId;
    let {receiverIds, text} = req.body;
    receiverIds.push(id);

    try {
        const response = await detectPii(text);
        const receivers = await user.find({ '_id': { $in:receiverIds}},'publicKey');

        if (!receivers) {
            return res.status(404).json({ error: 'One or more receivers not found' });
        }

        const entityEntries = Object.entries(response);
        entityEntries.sort((a, b) => a[1].start_index - b[1].start_index);

        let key = crypto.randomBytes(32);
        let hexKey = key.toString('hex');

        let modifiedText = text;
        let indexShift = 0;
        let newIndicesArray = [];

        for (let [entityName, entityData] of entityEntries) {
            let { start_index, end_index } = entityData;

            start_index += indexShift;
            end_index += indexShift;

            let plain_text = entityName;
            let cipher_text = encrypt_text(plain_text, hexKey);

            newIndicesArray.push([start_index, start_index + cipher_text.length]);

            modifiedText = modifiedText.slice(0, start_index) + cipher_text + modifiedText.slice(end_index);

            indexShift += cipher_text.length - plain_text.length;
        }
        let encKey = await encryptKey(hexKey, modifiedText, newIndicesArray, id, receiverIds);

        // Log the encryption activity
        await logActivity(
            id,
            'encrypt',
            `Encrypted text shared with ${receiverIds.length - 1} users`,
            {
                textId: encKey.encryptedMessage._id,
                metadata: {
                    receiverCount: receiverIds.length - 1,
                    textLength: text.length,
                    entitiesEncrypted: entityEntries.length
                }
            }
        );
        
        res.status(200).json({ encryptedText: modifiedText, newIndex: newIndicesArray, encryptedMessageId : encKey.encryptedMessage._id});
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while processing your request' });
    }
}