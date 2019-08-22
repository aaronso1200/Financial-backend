const express = require("express");
const multer = require("multer");
const router = express.Router();
const User = require("../models/user");
const UserInformation = require("../models/userInformation");

router.get('/user',(req,res,next)=>{
  // console.log(req.query.username);
  User.findOne({ loginName: req.query.username }).then(user =>{
    // console.log(user);
      if (!user) {
        res.status(200).json({
          found: 'false'
        })
      } else{
      res.status(200).json({
        found: 'true'
      })
    }
    }
  )
});

router.get('/displayName',(req,res,next)=>{
  // console.log(req.query.displayname);
  UserInformation.findOne({ displayName: req.query.displayname }).then(user =>{
    // console.log(user);
      if (!user) {
        res.status(200).json({
          found: 'false'
        })
      } else{
      res.status(200).json({
        found: 'true'
      })
    }
    }
  )
});

module.exports = router;

