const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const Post = require("./models/post");
const mongoose = require("mongoose");

const postsRoutes = require("./routes/posts");
const userRoutes = require("./routes/user");
const findRoutes = require("./routes/find");
const emailRoutes = require("./routes/email");
const finManageRoutes = require("./routes/finManage");
const reportRoutes = require("./routes/report");

const app = express();
const db = mongoose.connection;
// Connect mongodb PW: G7oWOevsyvAsbhfM
const logtime = new Date();
const conn =mongoose
  .connect(
      process.env.MONGO_ATLAS_PW,
    { useNewUrlParser: true, ssl: true}
  )
  .then(() => {
    console.log("Connected to database!" + logtime);
  })
  .catch(() => {
    console.log("Fail to connect database!");
  });

// NOT IMPLEMENTED: DB TRIGGER CODE
// db.on('error', console.error.bind(console, 'Connection Error:'));
//
// db.once('open', () => {
//   const finRecordCollection = db.collection('finrecords');
//   const changestream = finRecordCollection.watch();
//   changestream.on('change', (change)=> {
//     console.log(change);
//   })
// });

// Missing headers will cause CORS (Cross-Origin Resource Sharing) error
// because the front-end server and back-end server is seperated
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS"
  );
  next();
});

//To support Http POST
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(
  bodyParser.urlencoded({
    // to support URL-encoded bodies
    extended: false // extended:false indicate cannot post nested object like {Item:{Name: hi}}
  })
);

app.use("/images", express.static(path.join("images")));

app.use("/posts", postsRoutes);
app.use("/user", userRoutes);
app.use("/find", findRoutes);
app.use("/email", emailRoutes);
app.use("/finManage", finManageRoutes);
app.use("/report", reportRoutes);
// export the file to other files, automactcally express
// all the components under app
module.exports = app;
