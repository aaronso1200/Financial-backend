const mongoose = require('mongoose');
const uniqueValidate = require('mongoose-unique-validator');

const userInformationSchema = mongoose.Schema({
  loginData: {type: mongoose.Schema.Types.ObjectId, ref:"User", requried: true},
  displayName: {type: String, requried:true, unique: true},
  email: {type: String, required: true, unique: true}});

userInformationSchema.plugin(uniqueValidate);

module.exports = mongoose.model('UserInformation', userInformationSchema);
