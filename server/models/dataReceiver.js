const mongoose = require("mongoose");
const recieverSchema = new mongoose.Schema({
    receiverId : {type :  mongoose.Schema.Types.ObjectId, ref : "User", required : true},
    encryptedAesKey : {type : String, required : true}
})

const dataSchema = new mongoose.Schema({
    userId : {type :  mongoose.Schema.Types.ObjectId, ref : "User", required : true},
    indices : {type : [[Number]], required : true},
    encryptedText : {type : String, required : true},
    receivers : {type : [recieverSchema], required : true},
    createdAt : {type : Date, default : Date.now}
});


const dataModel = new mongoose.model("Data", dataSchema);

module.exports = dataModel;