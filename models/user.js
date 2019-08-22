const mongoose = require('mongoose');
const uniqueValidate = require('mongoose-unique-validator');

const userSchema = mongoose.Schema({
  loginName: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  verified: {type: Boolean, required: true}
});

userSchema.plugin(uniqueValidate);

module.exports = mongoose.model('User', userSchema);

