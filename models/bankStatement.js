const mongoose = require("mongoose");

const bankStatementSchema = mongoose.Schema({
  filePath: { type: String, required: true },
  fileName: {type:String, required: true},
  userId: {type: mongoose.Schema.Types.ObjectId, ref:"User", required: true},
  finAccountId: {type: mongoose.Schema.Types.ObjectId,ref:"finAccount", required: true}, //Related to finAccount Id
  year: {type: Number},
  month: {type: Number}
});

module.exports = mongoose.model("bankStatement", bankStatementSchema);

