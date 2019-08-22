const mongoose = require("mongoose");

const tokenSchema = mongoose.Schema({
  name: {type: String},
  token: { type: String, required: true },
  userId: {type: mongoose.Schema.Types.ObjectId, ref:"User", required: true,unique: true},
  date: {type: Date, default: Date.now}
});

module.exports = mongoose.model("Token", tokenSchema);
