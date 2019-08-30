
const mongoose = require("mongoose");
const express = require("express");
const multer = require("multer");
const path = require("path");

const Post = require("../models/post");
const authorize = require("../middleware/authorize");
const router= express.Router();
const fs = require("fs");
const aws = require("aws-sdk");
const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})

const MIME_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif'
};

const url = process.env.URL;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isValid = MIME_TYPE_MAP[file.mimetype];
    let error = new Error("Invalid mime type");
    if (isValid) {
      error = null;
    }
    cb(error,path.join(__dirname,"../images/"));
  },
  filename: (req,file,cb)=>{
    const name = file.originalname.toLowerCase().split(' ').join('-');
    const ext= MIME_TYPE_MAP[file.mimetype];
    cb(null, name + '-' + Date.now() + '.' +ext)
  }
});


// multer({storage: storage}).single("image")
// ,multer({storage: storage, limits: {fileSize: 1024*1024*100}}).single("image")
router.post("", authorize,multer({storage: storage, limits: {fileSize: 1024*1024*100}}).single("image"), (req,res,next)=> {
  fs.readFile(path.join(__dirname,"../images/") + req.file.filename, (err, data) => {
    if (err) throw err;
    const params = {
      Bucket: 'www.fin150.com', // pass your bucket name
      Key: 'images/'+req.file.filename, // file will be saved as testBucket/contacts.csv
      ContentType: req.file.mimeType,
      ACL: 'public-read',
      Body: data
    };
    s3.upload(params, function(s3Err, data) {
      if (s3Err) throw s3Err
      console.log(`File uploaded successfully at ${data.Location}`)
      const post = new Post({
        title: req.body.title,
        content: req.body.content,
        imagePath: process.env.IMAGE_URL + "/images/" + req.file.filename,
        creator: req.userData.userId
      });
      post.save().
      then(async createdPost => {
        await fs.unlink("./images/" + req.file.filename, (err) => {
          if (err) throw err;
          console.log('successfully deleted ' + req.file.filename);
        });
        res.status(201).json({
          message: 'Post added successfully',
          post: {
            id: createdPost._id,
            title: createdPost.title,
            content: createdPost.content,
            imagePath: createdPost.imagePath
          }
        });
        // console.log('Save post successful');
      })
        .catch(() => {
          res.status(400).json({message: 'Save post fail'})
          // console.log('Fail to save post.')
        });
    });
  });


  });

router.put("/:id", authorize, multer({storage: storage}).single("image"),(req,res,next) => {
  let imagePath = req.body.imagePath;
  if (req.file) {
    // const url = req.protocol + '://' + req.get("host");
    imagePath = process.env.IMAGE_URL + "/images/" + req.file.filename
  }
  const post= new Post({
    _id: req.body.id,
    title: req.body.title,
    content: req.body.content,
    imagePath: imagePath
  });
  Post.updateOne({_id: req.params.id, creator: req.userData.userId}, post).then(result =>{   //req.params is the post id in url
    if (result.n>0) {
    res.status(200).json({message: "Update successful!"});
    } else {
      res.status(401).json({message: "Not authorized!"})
    }
  })
});

router.get('',(req,res,next)=>{
  const pageSize = parseInt(req.query.pageSize);
  const currentPage = parseInt(req.query.page);
  // console.log('count' + count);
  // const postQuery = Post.find();
  let fetchedPosts;
  // if (pageSize && currentPage) {
  //   postQuery.skip(pageSize*(currentPage-1)).limit(pageSize);
  //   }
  Post.aggregate([
    {
      '$lookup': {
        'from': 'userinformations',
        'localField': 'creator',
        'foreignField': 'loginData',
        'as': 'Userinformation'
      }
    },
    {$unwind:'$Userinformation'},
    {   '$project': {
        '_id': '$_id',
        'title': '$title',
        'content' :'$content',
        'imagePath' :'$imagePath',
        'creator_id': '$creator',
        'creator': '$Userinformation.displayName'
      },
    },
    {"$skip": pageSize*(currentPage-1)},
    {"$limit": pageSize}
  ]).then(documents => {
      fetchedPosts = documents
    return Post.countDocuments();
  })
    .then(count => {
      res.status(200).json({
        message: 'Posts fetch successfully',
        posts: fetchedPosts,
        maxPosts: count
      });
    });

  // postQuery
  //   .then((documents) => {
  //     fetchedPosts = documents;
  //       return Post.countDocuments();
  //   })
  // .then(count => {
  //   res.status(200).json({
  //     message: 'Posts fetch successfully',
  //     posts: fetchedPosts,
  //     maxPosts: count
  //     });
  //   });
});

router.get("/:id", (req,res,next) => {

  Post.findById(req.params.id).then(post =>{
    if (post) {
      res.status(200).json(post);
    } else {
      res.status(404).json({message: 'Post not found!'});
    }
  })

});


router.delete('/:id',authorize,(req,res,next)=>{
  Post.deleteOne({_id: req.params.id, creator: req.userData.userId}).then(result => {

    if (result.n>0) {
      res.status(200).json({message: "Post delete successful!"});
      } else {
        res.status(401).json({message: "Not authorized!"})
      }
  })
  }
);


router.post("/random",(req,res,next)=> {
  // fs.readFile("C:\\Users\\user\\Desktop\\project\\backend\\images\\uhuhuh-1548572171165.png", function (err, data) { });
  // const url = req.protocol + '://' + req.get("host");
  const post = new Post({
    title: 'test' + Math.random(),
    content: 'test',
    imagePath: "/images/" +'test.jpg'
  });
  post.save().
  then(createdPost => {
    res.status(201).json({
      message: 'Auto generate successfully',
      post: {
        id:createdPost._id,
        title: createdPost.title,
        content: createdPost.content,
        imagePath:  "/images/" + createdPost.imagePath
      }
    });
  })
});



module.exports = router;
