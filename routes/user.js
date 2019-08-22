const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/user");
const UserInformation = require("../models/userInformation");
const authorize = require("../middleware/authorize");
const Token = require("../models/token");

const userSession = User;
const userInfoSection= UserInformation;
const Email = require("../functions/email");

router.post("/signup", (req, res, next) => {
  bcrypt.hash(req.body.password, 10).then( (hash) => {
    const user = new User({
      loginName: req.body.loginName,
      password: hash,
      verified: false
    });
    const userInformation = new UserInformation({
      displayName: req.body.displayName,
      email: req.body.email,
      loginData: user._id
    });
    writeUserInfo(user,userInformation).then(result => {
      return res.status(201).json({
        message: "User created!",
        result: result
      })
    }).catch(err => {
      // console.log(err);
      return res.status(401).json({
        message:"Create login name and password fail"
      })
    });
  });
});

async function writeUserInfo(user,userInformation) {
  const session = await userSession.startSession();
  session.startTransaction();
  try {
    const opts = { session };
    await user.save(opts);
    await userInformation.save(opts);

    await session.commitTransaction();
    session.endSession();
    return true;
  } catch (error) {
    // If an error occurred, abort the whole transaction and
    // undo any changes that might have happened
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

router.post("/DisplayName",authorize, (req, res, next) => {
  // console.log(req);
  displayName = UserInformation.findOne({loginName: req.body.loginName}).then( user => {
    if (!user) {
      return res.status(401).json({
        message: "Fail to find display Name"
    });
    }
    return user;
  });
});

router.post("/login", (req, res, next) => {
  // let foundUser;
  // let displayName;
// console.log(req.body);
   FindloginData(req.body.loginName)
    .then(foundUser => {
      if (!foundUser) {
        return res.status(401).json({
          message: "Fail to login"
        });
      }
      // use populate https://mongoosejs.com/docs/populate.html
      // Get IP
      // var ip = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
      // req.connection.remoteAddress ||
      // req.socket.remoteAddress ||
      // req.connection.socket.remoteAddress
      // console.log(ip);


      bcrypt.compare(req.body.password,foundUser.password).then(result =>
            {
              if (!result){
                return res.status(401).json({
                  message: "Wrong password"
              });
             }
              console.log('founduser' + foundUser.loginName);
              const jwtToken = jwt.sign({
              loginName: foundUser.loginName, userId: foundUser.id, time: Date.now(),},
               process.env.JWT_KEY,
              { expiresIn: "48h"}
              );

              const token = new Token({
                name:'login',
                token: jwtToken,
                userId: foundUser.id,
                date: Date.now()
              });

            Token.findOneAndUpdate({name:'login',userId: foundUser.id},{token:jwtToken,userId:foundUser.id,date:Date.now()},{upsert: true}).then(() =>{
              res.status(200).json({
                token: jwtToken,
                expiresIn: 48*3600,
                displayName: foundUser.displayName,
                verified: foundUser.verified
              })
            });

          })
          .catch(err => {
            // console.log(err);
            return res.status(401).json({
              message: "Fail to login"
            });
          });
          });
});

async function FindloginData(loginName) {
  const A = await   User.findOne({ loginName: loginName });
  if (A !== null) {
    const B = await UserInformation.findOne({loginData: A._id});
    // console.log('A' + A);
    // console.log('B:'+ B);
    return await {
      loginName: loginName,
      id: A._id,
      password: A.password,
      displayName: B.displayName,
      verified: A.verified
    }
  }
  return await false
}

router.post("/logout",(req,res,next)=> {
  Token.deleteOne({name:'login',userId: req.body.userId}).then( (result) => {
    if (result.n > 0) {
      res.status(200).json({message:'Logout successful'});
    } else {
      res.status(200).json({message:'Logout - no token in db'});
    }
  })
});

// router.post("/checkToken",(req,res,next)=> {
//   Token.findOne({token:req.body.token}).then( (result) => {
//     if (result) {
//       res.status(200).json({foundtoken: 'true'});
//     } else {
//       res.status(200).json({foundtoken: 'false'});
//     }
//   })
// });

async function FindGeneralData(userId) {
  // console.log(userId);
  const A = await   User.findOne({ _id: mongoose.Types.ObjectId(userId) });
  // console.log(A);
  const B= await UserInformation.findOne({loginData: mongoose.Types.ObjectId(userId)});
  if (A !== null && B !== null)
  {
    return await {
      userId: A._id,
      displayName: B.displayName,
      loginName: A.loginName,
      verified: A.verified,
      email: B.email,
    }
  }
  return false
}
router.post("/profile",authorize,(req,res,next) => {
  FindGeneralData(req.userData.userId).then(foundUser => {
    if (!foundUser) {
      res.status(400).json({
        message: "Fail to found user profile."
      })
    } else {
      // console.log('profile found User' +foundUser.displayName);
      res.status(200).json(
        {
          userId: foundUser.userId,
          displayName: foundUser.displayName,
          verified: foundUser.verified,
          email: foundUser.email,
          loginName: foundUser.loginName
        })
    }
  });
});

router.put("/changePassword",authorize,(req,res,next)=> {
  let userId = req.userData.userId;

  bcrypt.hash(req.body.newPassword, 10).then(newPassword => {
    User.findOne({ _id: mongoose.Types.ObjectId(userId) }).then((foundUser) => {
      bcrypt.compare(req.body.oldPassword,foundUser.password).then(result => {
          if (!result) {
            return res.status(401).json({
              message: "Wrong password"
            });
          }
        User.updateOne({_id:mongoose.Types.ObjectId(userId)}, { $set: { "password" : newPassword } }).then(result =>{   //req.params is the post id in url
          if (result.n>0) {
            res.status(200).json({message: "Update successful!"});
          } else {
            res.status(401).json({message: "Fail to find User Data"})
          }
        });
      })
    })
  });

});

router.post('/forgotpassword',(req,res,next)=> {
  let email = req.body.email;
  console.log(email);
  UserInformation.findOne({email:email}).then(foundUser => {
    let token = generateEmailCode();
    Token.findOneAndUpdate({name:'email',userId: foundUser.id},{name:'email',token:token,userId:foundUser.id,date:Date.now()},{upsert: true}).then(result => {
      let body= `Dear aaron, Click the link below to change your password.\n http://localhost:1595/forgotpassword?=${token}`;
      Email.sendMessages(result.email,'Forgot password', body);
      res.status(200).json({message: "Email Sent"});
    });

  })
});

function generateEmailCode() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < 20; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

module.exports = router;


// router.post("/signup", (req, res, next) => {

//   bcrypt.hash(req.body.password, 10).then(hash => {
//     console.log(req.body);
//     const user = new User({
//       loginName: req.body.loginName,
//       password: hash
//     });
//     const userInformation = new UserInformation({
//       loginName: req.body.loginName,
//       displayName: req.body.displayName,
//       email: req.body.email
//     });
//     user
//       .save()
//       .then(result => {
//       }
//       )
//       .catch(err => {
//         console.log(err);
//       });
//     userInformation.save()
//       .then(result=> {
//         res.status(201).json({
//           message:"User created!",
//           result: result
//         })
//       })
//       .catch(err =>{
//         console.log(err);
//       })
//   });
// });
// https://stackoverflow.com/questions/51228059/mongo-db-4-0-transactions-with-mongoose-nodejs-express
