const mongoose = require('mongoose');

const verificationSchema = mongoose.Schema({
  id: {type: mongoose.Schema.Types.ObjectId, ref:"User", requried: true},
  verificationCode: {type: String, required:true}
});

module.exports = mongoose.model('Verification', verificationSchema );
