const nodemailer = require('nodemailer');
const mailgrid = require('nodemailer-sendgrid-transport');
const fs = require('fs');
const aws = require('aws-sdk');
const emailConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1'
};



const transport = nodemailer.createTransport(mailgrid(
  {
    auth: {
      api_key: process.env.SENDGRID_KEY
    }
  }
));

module.exports.sendMessages= function(to,subject,message){
  var params = {
    Destination: { /* required */
      CcAddresses: [
      ],
      ToAddresses: [
        'aaronso1200@gmail.com',
        /* more items */
      ]
    },
    Message: { /* required */
      Body: { /* required */
        Html: {
          Charset: "UTF-8",
          Data: message
        },
        Text: {
          Charset: "UTF-8",
          Data: message
        }
      },
      Subject: {
        Charset: 'UTF-8',
        Data: subject
      }
    },
    Source: 'no-reply@fin150.com', /* required */
    ReplyToAddresses: [
    ],
  };
  new aws.SES(emailConfig).sendEmail(params).promise().then( (res) =>{
    console.log(res);
    }
    // console.log('Send email successful')
  );
};


// module.exports.sendMessages= function(to,subject,message){
//   transport.sendMail({
//     to: to,
//     from: 'aaronso1200@gmail.com',
//     subject: subject,
//     html: message
//   }).then(
//     // console.log('Send email successful')
//   );
// };
