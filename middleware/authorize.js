const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Token = require("../models/token");


module.exports = (req,res,next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    // console.log('Middleware authorize receive token:',token);
    // console.log('request token ' + token);
    // console.log('session Token ' + req.session.loginToken);
    // if (token == req.session.loginToken) {
    //   console.log('Found session token');
    //   const decodedToken = jwt.verify(token, process.env.JWT_KEY);
    //   req.userData = {loginName: decodedToken.loginName, userId: decodedToken.userId};
    //   next();
    // } else {
    //   console.log('Session Token Expired');
      Token.findOne({name:'login',token: token}).then(result => {
          if (result) {
            // req.session.loginToken = result.token;
            const decodedToken = jwt.verify(token, process.env.JWT_KEY);
            req.userData = {loginName: decodedToken.loginName, userId: decodedToken.userId};
            next();
          } else {
            throw 'error'
          }
        }
      ).catch((error) => {
          console.log(error);
          res.status(401).json({message: "You've been logout (Maybe Someone login your account?)", logout: true});
        }
      );
  // }
  } catch (error)
  {
    res.status(401).json({message: "You've been logout (Maybe Someone login your account?)2"});
  }
};
