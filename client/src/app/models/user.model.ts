export interface User {
  _id: string;
  name: string;
  email: string;
  publicKey?: string;
  createdAt?: Date;
}

export interface EncryptedMessage {
  id: string;
  senderId: string;
  receiverIds: string[];
  encryptedText: string;
  encryptedKeys: {
    receiverId: string;
    encryptedKey: string;
  }[];
  createdAt: Date;
}