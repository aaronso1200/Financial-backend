const mongoose = require("mongoose");

const finAccountSchema = mongoose.Schema({
  description: {type: String},
  amount: {type:Number, required: true},
  recordDate: {type:Date , required:true},                                                // Date recorded
  recordType: {type:String, required: true},
  finAccountId: {type: mongoose.Schema.Types.ObjectId,ref:"finAccount", required: true}, //Related to finAccount Id
  userId: {type: mongoose.Schema.Types.ObjectId, ref:"User", required: true} , //Related to User Id
  modifiedDate: {type:Date}
});

module.exports = mongoose.model("finRecord", finAccountSchema);
