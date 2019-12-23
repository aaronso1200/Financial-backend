const express = require("express");
const router = express.Router();
const email = require("../functions/email");
const authorize = require("../middleware/authorize");
const verificationCode = require("../models/verificationCode");
const userinformation = require("../models/userInformation");
const User = require("../models/user");

router.post('/sendVerificationCode',authorize, (req,res,next) => {
  userinformation.findOne({loginData: req.userData.userId}).then(result =>{
        if (!result) {
          return res.status(418).json({
            message: 'Fail to find email'
          });
        }
        let user = result.displayName;
        let code = generateCode();
        const query ={ "id" : result.loginData },
            update={"verificationCode" : code },
            options = { upsert: true, new: true, setDefaultsOnInsert: true };
        verificationCode.findOneAndUpdate(query, update, options, function(error, result) {
          if (error) return res.status(418).json({
            message: 'Find error'
          });

          let body= `Dear ${user}, Lets verify your account so you can have full access to our website.\n This is your verification code ${code}`;
          email.sendMessages(result.email,'Please verify your account', body);
          return res.status(200).json({
            message: 'Send email successful!'
          })
              });

  })
});


router.get('/verify',authorize,(req,res,next)=> {
  verificationCode.findOne({id:req.userData.userId}).then(result => {
    //54DGac
      if (result.verificationCode === req.query.verifyCode)
      {
        const query ={ "_id" : req.userData.userId },
          update={"verified" : true },
          options = { upsert: true, new: false, setDefaultsOnInsert: true };
        console.log(query);
          User.findOneAndUpdate(query, update, options, function(error, result) {
            if (error) return res.status(418).json({
              message: 'Find error'
            });
          }).then(() =>
          {return res.status(200).json({
            message: 'Verify account successful!'
          })})
      }
      else {
        return res.status(200).json({
          message: 'Wrong code'
        })
      }
  });
});

router.get('/auth',(req,res,next) => {
  console.log(req.query.code);
});

function generateCode() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < 6; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}
module.exports = router;
