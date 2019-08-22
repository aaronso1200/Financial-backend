const mongoose = require("mongoose");

const finAccountSchema = mongoose.Schema({
  name: { type: String, required: true },
  description: {type: String},
  userId: {type: mongoose.Schema.Types.ObjectId, ref:"User", required: true},
  icon: {type: String}
});

module.exports = mongoose.model("finAccount", finAccountSchema);

