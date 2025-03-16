const crypto = require("crypto");

const generateRSAKeyPair = async () => {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair(
      "rsa",
      {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      },
      (err, publicKey, privateKey) => {
        if (err) {
          console.error("Key generation error:", err);
          reject(err);
        } else {
          resolve({ publicKey, privateKey });
        }
      }
    );
  });
};

module.exports = { generateRSAKeyPair };
