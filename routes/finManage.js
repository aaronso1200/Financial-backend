const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const path = require("path");
const FinAccount = require("../models/finAccount");
const FinRecord = require("../models/finRecord");
const authorize = require("../middleware/authorize");
const BankStatement = require("../models/bankStatement");

const router= express.Router();
const fs = require("fs");
const os = require("os");
const aws = require("aws-sdk");

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})

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

const DateJS= require("../functions/date");

const finAccountSession = FinAccount;
const finRecordSession = FinRecord;

router.post("/downloadfile",authorize,(req,res,next)=> {
  console.log(req.body);
  BankStatement.findOne({userId:req.userData.userId,month:req.body.month,year:req.body.year,finAccountId:req.body.finAccountId}).then((data) => {
    console.log(data);
    if (!data) {
      res.status(200).json({message: "File not found!",file:null,fileName:null});
      return false
    }
    console.log(data);
    var link = data.filePath+ data.fileName;
    const params = {
      Bucket: 'fin150-data',
      Key: link
    };
    // res.attachment('abc.pdf');
    // s3.getObject(params).createReadStream().pipe(res);
   s3.getObject(params,(err,file) => {
     if (err) return err;
      res.status(200).json({message:"Get file successful",file:file.Body,fileName:data.fileName})
    });
  });

});


router.post("/updateRecordByPdf",authorize,multer().single("bankStatement"),async (req,res,next)=> {
// console.log(req.file);
   var  filePath =  'bankStatement/'+req.userData.userId + '/' + req.body.finAccountId + '/';
   var fileName = 'bank_statement-' +Date.now() + '-' + req.body.year +'-' +req.body.month +'.pdf';
  const params = {
    Bucket: 'fin150-data', // pass your bucket name
    Key: filePath + fileName,
    ContentType: req.file.mimeType,
    ACL: 'private',
    Body: req.file.buffer
  };
  s3.upload(params, function(s3Err, data) {
    if (s3Err) {
      console.log('fail');
       res.status(400).json({message:'Upload BankStatement Fail'});
       throw s3Err;}
    console.log(`File uploaded successfully at ${data.Location}`);
    const bankStatement = new BankStatement({
    filePath: filePath,
    fileName: fileName,
    finAccountId: req.body.finAccountId,
    userId: req.userData.userId,
    month: req.body.month,
    year: req.body.year
   });
    bankStatement.save().then(bankStatement=> {
      console.log('save bankstatement successful');
      res.status(201).json({message:'Save BankStatement Successful'})
    }).catch( (ex) => {
      console.log(ex);
        res.status(400).json({message: 'Save BankStatement Fail'})});
  })

});

router.post("/create",authorize,(req,res,next)=> {
  // console.log(req.body);
  // console.log(req.userData);
  // console.log(req.body);
  const finAccount = new FinAccount({
     name: req.body.name,
     description: req.body.description,
     userId:  req.userData.userId,
    icon: req.body.icon,
    });
  finAccount.save().then( result => {
      res.status(201).json({
        message: "Create successful!",
        accounts: {
          _id: result._id,
          name: req.body.name,
          description: req.body.description
        }
      })
    }
  );
}

);

 router.post("/delete",authorize, (req,res,next)=> {
   deleteFinAccount(req.userData.userId,req.body.id).then( () => {
     res.status(201).json({
       message: "Delete Successful!"
     });
   })
 });


async function deleteFinAccount(userId,finAccountId) {
  const session = await finAccountSession.startSession();
  session.startTransaction();
  try {
    const opts = { session };
    await FinAccount.deleteMany({userId: userId, _id: finAccountId},opts);
    await FinRecord.deleteMany({finAccountId:finAccountId,userId:userId},opts);
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

router.post("/list",authorize,(req,res,next)=> {
  FinAccount.find({userId:req.userData.userId,}).select('_id name description icon').then( (accounts) => {
    res.status(200).json({
      message: 'Fetch successfully' ,
      accounts: accounts
    })
    }

  );
});

router.put("/edit",authorize,(req,res,next)=> {
const finAccount = new FinAccount({
    _id: req.body.id,
    name: req.body.name,
    description: req.body.description,
    userId: req.userData.userId
  }
);
  FinAccount.updateOne({_id:req.body.id, userId:req.userData.userId},finAccount).then(result=> {
    // console.log(result);
    if (result.n> 0) {
      res.status(200).json({message: 'Update was successful!'})
    }
    else res.status(401).json({
      message: 'Update fail'
    })
      }
  )
});

router.post("/record/create",authorize,(req,res,next) => {
  // console.log(req.body);
  let amount = req.body.amount;
  let recordType = req.body.recordType;
  if (req.body.finAccountTo) {
     if (amount< 0) {amount= amount-amount-amount}
    const finRecordFrom = new FinRecord({
      description: req.body.description,
      amount: amount*-1,
      recordDate: req.body.recordDate,                                                // Date recorded
      recordType: "expenditure",
      finAccountId: req.body.finAccountFrom, //Related to finAccount Id
      userId: req.userData.userId,  //Related to User
      modifiedDate: Date.now()
    });

    const finRecordTo = new FinRecord({
      description: req.body.description,
      amount: amount,
      recordDate: req.body.recordDate,                                                // Date recorded
      recordType: "deposit",
      finAccountId: req.body.finAccountTo, //Related to finAccount Id
      userId: req.userData.userId,  //Related to User
      modifiedDate: Date.now()
    });
    createTransfer(finRecordFrom,finRecordTo).then(
      res.status(201).json({
      message: 'Save Fin record successful'}
      )).catch(
        res.status(201)
    );


  } else {
    if ((recordType === "expenditure" && amount > 0) || (recordType === "deposit" && amount < 0)) {
      amount = amount - amount - amount;
    }
    const finRecord = new FinRecord({
      description: req.body.description,
      amount: amount,
      recordDate: req.body.recordDate,                                                // Date recorded
      recordType: req.body.recordType.toLowerCase(),
      finAccountId: req.body.finAccountFrom, //Related to finAccount Id
      userId: req.userData.userId,  //Related to User
      modifiedDate: Date.now(),
      tags: []
    });
    finRecord.save().then(
      res.status(201).json({
        message: 'Save Fin record successful'
      })
    )
  }
});

async function createTransfer(finRecordFrom,finRecordTo) {
  const session = await finRecordSession.startSession();
  session.startTransaction();
  try {
    const opts = { session };
    await finRecordFrom.save(opts);
    await finRecordTo.save(opts);
    await session.commitTransaction();
    session.endSession();
    return true;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}


router.post("/record/delete",authorize,(req,res,next) => {
  FinRecord.deleteOne({_id: req.body.id}).then((result) => {
    if (result.n >0) {
      res.status(201).json({
        message: "Delete Successful!"
      })} else {
      res.status(400).json({
        message: "Delete finRecord fail"
      })
    }})
});

router.post("/record/edit",authorize,(req,res,next) => {

  let amount = req.body.amount;
  let recordType = req.body.recordType;
  if ((recordType ==="expenditure" && amount>0) || (recordType ==="deposit" && amount <0)) {
    amount = amount - amount - amount;
  }


  const finRecord = FinRecord({
    _id: req.body.id,
    description: req.body.description,
    amount: amount,
    recordDate: req.body.recordDate,                                                // Date recorded
    recordType: req.body.recordType.toLowerCase(),
    finAccountId: req.body.finAccountId, //Related to finAccount Id
    userId: req.userData.userId,  //Related to User
    modifiedDate: Date.now()
  });
  console.log(req.body.id);
  FinRecord.updateOne({_id:req.body.id, userId: req.userData.userId},finRecord).then(result => {
    // console.log(result);
    if (result.n> 0) {
      res.status(200).json({message: 'Update was successful!'})
    }
    else res.status(401).json({
      message: 'Update fail'
    });
  });
});




router.post("/record/listByDate",authorize,(req,res,next) => {
  let fromDate = new Date(req.body.date);
  // console.log(fromDate);
  let toDate = new Date(fromDate.getTime()+1000*60*60*24);
  // console.log('From Date: ' +fromDate);
  // console.log('To Date: '+ toDate);
  FinRecord.aggregate([{$match:{userId:mongoose.Types.ObjectId(req.userData.userId),recordDate:{'$gte' : fromDate,"$lt": toDate }}},
    {$lookup: {
        "from": "finaccounts",
        "localField": "finAccountId",
        "foreignField": "_id",
        "as": "FinAccount"
      }},
    {"$unwind": "$FinAccount"},
    {   '$project': {
        'id': '$_id',
        'amount': '$amount',
        'description': "$description",
        'finAccount': "$FinAccount.name",
        'finAccountId': "$FinAccount._id",
        'icon': "$FinAccount.icon",
        'recordType': "$recordType",
        'recordDate': '$recordDate',
      },

    },
  ]).then(result =>{
    // console.log('Record/listByDate: ' + result);
    return res.status(200).json({
      records: result
    });
    }
  ).catch(() =>{
    return res.status(401).json({
      message: 'Find record unexpected error'
    })}
  )
});

//FinRecord.find({recordDate:{'$gte' : fromDate,"$lt": toDate },userId: req.userData.userId}).select('-userId -recordDate').populate({path: 'finAccountId', select: 'name icon'})

// Icon Update
router.post("/finAccount/updateIcon",authorize,(req,res,next) => {
  let icon = req.body.icon;
  let finAccountId = req.body.finAccountId;
  const finAccount = {icon: icon};

  FinAccount.updateOne({_id:finAccountId,userId:req.userData.userId},
    {
      $set: {
        icon: icon
      }
    }).then(result => {
    res.status(200).json({
      message: 'Update icon account successful'
    })
    }
  );
})
;

// {$match: {userId:mongoose.Types.ObjectId(req.userData.userId)}},

router.post("/record/Monthlysum",authorize,(req,res,next) => {
  let date = new Date();
  let upperDate = new Date(date.getFullYear(),date.getMonth()+1,0);
  let lowerDate = new Date(date.getFullYear(), date.getMonth(), 1).addMonths(-6);
  // console.log(lowerDate);
  // console.log(upperDate);

  FinRecord.aggregate([
    {$match:{userId:mongoose.Types.ObjectId(req.userData.userId),recordDate: {"$gte": lowerDate, "$lt": upperDate}}
    },  {
      '$group': {
        '_id': {
          'finAccountId': '$finAccountId',
          'month': {
            '$month': {
              'date': '$recordDate',
              'timezone': '+0800'
            }
          },
          'year': {
            '$year': {
              'date': '$recordDate',
              'timezone': '+0800'
            }
          }
        },
        'amount': {
          '$sum': '$amount'
        }
      }
    }, {
      '$lookup': {
        'from': 'finaccounts',
        'localField': '_id.finAccountId',
        'foreignField': '_id',
        'as': 'FinAccount'
      }
    }, {
      '$unwind': {
        'path': '$FinAccount'
      }
    }, {
      '$project': {
        '_id': '$_id.finAccountId',
        'amount': '$amount',
        'accountName': '$FinAccount.name',
        'month': '$_id.month',
        'year': '$_id.year'
      }
    }, {
      '$sort': {
        '_id': 1,
        'year': 1,
        'month': 1
      }
    }, {
      '$group': {
        '_id': {
          'id': '$_id',
          'accountName': '$accountName'
        },
        'year': {
          '$push': '$year'
        },
        'month': {
          '$push': '$month'
        },
        'amount': {
          '$push': '$amount'
        }
      }
    }, {
      '$sort': {
        '_id': 1
      }
    }

  ]).then(result => {
    // console.log(result);
    res.status(200).json({
      message: 'Get records of past twelve months successfully' ,
      records: result
    })
  }).catch(error => {
    res.status(204).json({
      message: 'Unexpected error to get records of past tweleve months'
    })
  });

});

router.post("/record/accumulateRecord",authorize,(req,res,next) => {
  let date = new Date();
  // passMonths control the accumulate data that will be get
  const passMonths = 8;
  let upperDate = new Date(date.getFullYear(),date.getMonth()+1,0);
  let lowerDate = new Date(date.getFullYear(), date.getMonth(), 1).addMonths(-passMonths);
  // console.log(lowerDate);
  // console.log(upperDate);

  // This aggregate only get the record sum of each month
  FinRecord.aggregate([
    {$match:{userId:mongoose.Types.ObjectId(req.userData.userId),recordDate: {"$gte": lowerDate, "$lt": upperDate}}
    },  {
      '$group': {
        '_id': {
          'finAccountId': '$finAccountId',
          'month': {
            '$month': {
              'date': '$recordDate',
              'timezone': '+0800'
            }
          },
          'year': {
            '$year': {
              'date': '$recordDate',
              'timezone': '+0800'
            }
          }
        },
        'amount': {
          '$sum': '$amount'
        }
      }
    }, {
      '$lookup': {
        'from': 'finaccounts',
        'localField': '_id.finAccountId',
        'foreignField': '_id',
        'as': 'FinAccount'
      }
    }, {
      '$unwind': {
        'path': '$FinAccount'
      }
    }, {
      '$project': {
        '_id': '$_id.finAccountId',
        'amount': '$amount',
        'accountName': '$FinAccount.name',
        'month': '$_id.month',
        'year': '$_id.year'
      }
    }, {
      '$sort': {
        '_id': 1,
        'year': 1,
        'month': 1
      }
    }, {
      '$group': {
        '_id': {
          'id': '$_id',
          'accountName': '$accountName'
        },
        'year': {
          '$push': '$year'
        },
        'month': {
          '$push': '$month'
        },
        'amount': {
          '$push': '$amount'
        }
      }
    }, {
      '$sort': {
        '_id': 1
      }
    }

  ]).then(accountMonthResult => {
    // Get the accumulate sum before the request Date to enhance performance
    FinRecord.aggregate([ {$match:{userId:mongoose.Types.ObjectId(req.userData.userId),recordDate: {"$lt": lowerDate}}},
      {  '$group': {
          '_id': '$finAccountId'
          ,
          'amount': {
            '$sum': '$amount'
          }
        }}]).then(accumulateSum => {

      // console.log(accountMonthResult); console.log(accumulateSum);
      for (let i = 0; i < accountMonthResult.length; i++) {
        let dateArray = [];
        let tempAmount = 0;
        let tempId = accountMonthResult[i]._id.id;
        // console.log(accumulateSum.find(result => result._id.toString() === tempId.toString()));

        // Accumulate sum of the record
        if (accumulateSum.find(result => result._id.toString() === tempId.toString())) {
          let index = accumulateSum.findIndex(result => result._id.toString() === tempId.toString());
          tempAmount = accumulateSum[index].amount;
          // console.log('tempAmount' + tempAmount);
        }

        for (let j = 0; j < accountMonthResult[i].year.length; j++) {
          dateArray.push( accountMonthResult[i].year[j] + '/' + ('0'+accountMonthResult[i].month[j]).slice(-2))
        }

        // console.log(dateArray);

        // Add record for months that are not found in db
        for (let j = 0; j <= passMonths; j++) {
          // Get from oldest date because the sum will acummulate from the past not the future
          let getDate = new Date(date.getFullYear(), date.getMonth(), 1).addMonths(-passMonths + j);
          let year = getDate.getFullYear();
          let month = getDate.getMonth() + 1;
          let dateTemp = year + '/' + ('0'+month).slice(-2);
          // console.log(dateTemp);
          if (dateArray.find(result => result === dateTemp)) {
            let index = dateArray.findIndex(result => result === dateTemp);
            tempAmount += accountMonthResult[i].amount[index];
            accountMonthResult[i].amount[index] = tempAmount;
          } else {
            accountMonthResult[i].year.push(year);
            accountMonthResult[i].month.push(month);
            accountMonthResult[i].amount.push(tempAmount);
            dateArray.push(dateTemp);
          }
        }

        // console.log(dateArray);


        //Sort the Data By Date so front end can receive data by date ascending
        let Record = accountMonthResult[i];
        Record.yearMonth = dateArray;
        let abc = Record.yearMonth.map(array1 => {
            let n = Record.yearMonth.indexOf(array1);
            return [Record.yearMonth[n],Record.year[n],Record.month[n],Record.amount[n]]
          }
        ).sort()
          .forEach((value,index)=> {
          accountMonthResult[i].year[index] = value[1];
          accountMonthResult[i].month[index] = value[2];
          accountMonthResult[i].amount[index] = value[3];
        });
        // console.log('sort');
        // console.log(abc);
      }



      // console.log('sorted');
      // console.log(accountMonthResult);
      res.status(200).json({
        message: 'Get records of past twelve months successfully' ,
        records: accountMonthResult
      })
    }).catch(error => {
      res.status(204).json({
        message: 'Unexpected error to get records of past tweleve months'
      })
    });

    });



});


router.post("/record/AllAccountsum",authorize,(req,res,next) => {
  // console.log(req.userData.userId);
  FinRecord.aggregate([{$match: {userId:mongoose.Types.ObjectId(req.userData.userId)}},
    {$group : {
      _id :"$finAccountId",
        value: {$sum: "$amount"}
      }
    },
    {$lookup : {
      "from": "finaccounts",
        "localField": "_id",
        "foreignField": "_id",
        "as": "FinAccount"
      }},
    {"$unwind": "$FinAccount"},
    {$project : {
      _id: "$_id",
       value: "$value",
        accountName: "$FinAccount.name"
      }}
    ]).then(result =>{

    res.status(200).json({
      message: 'Get sum of accounts successful' ,
      accounts: result
    })
  }).catch(error => {
    res.status(204).json({
      message: 'Unexpected error in finding finAccount sum'
    })
  });
});

router.post("/record/recentRecord",authorize,(req,res,next)=> {
  FinRecord.aggregate([{$match: {userId:mongoose.Types.ObjectId(req.userData.userId)}},
    {$lookup: {
        "from": "finaccounts",
        "localField": "finAccountId",
        "foreignField": "_id",
        "as": "FinAccount"
      }},
    {"$unwind": "$FinAccount"},
    {$sort :
        {"modifiedDate": -1},
    },
    {$limit: 10},
    {   '$project': {
        'id': '$_id',
        'amount': '$amount',
        'description': "$description",
        'finAccount': "$FinAccount.name",
        'finAccountId': "$FinAccount._id",
        'icon': "$FinAccount.icon",
        'recordType': "$recordType",
        'recordDate': '$recordDate'
      }}
  ]).then(result => {
    res.status(200).json({
      message: 'Get recent records successful',
      accounts: result
    })
  }).catch(error =>{
    res.status(204).json({
      message: 'Unexpected error in getting recent records'
    })
  })
});
router.post("/record/getRecordByAccount",authorize,(req,res,next) => {
  // console.log(req.body.account);
  // console.log(req.userData.userId);
  const pageSize = parseInt(req.body.pageSize);
  const currentPage = parseInt(req.body.page);
  FinRecord.aggregate([{$match:{userId:mongoose.Types.ObjectId(req.userData.userId),finAccountId: mongoose.Types.ObjectId(req.body.account)}},
    {$lookup: {
        "from": "finaccounts",
        "localField": "finAccountId",
        "foreignField": "_id",
        "as": "FinAccount"
      }},
    {"$unwind": "$FinAccount"},
    {   '$project': {
        'id': '$_id',
        'amount': '$amount',
        'description': "$description",
        'finAccount': "$FinAccount.name",
        'finAccountId': "$FinAccount._id",
        'icon': "$FinAccount.icon",
        'recordType': "$recordType",
        'recordDate': '$recordDate',
      },

    },
    {"$sort": {"recordDate": -1}},
    {"$skip": pageSize*(currentPage-1)},
    {"$limit": pageSize}
  ]).then(result => {
    // console.log(result);
    if (result.length === 0) {
      res.status(200).json({message:'No Record In this account', records: result,counts: 0});
      return
    }
 FinRecord.aggregate([{$match:{userId:mongoose.Types.ObjectId(req.userData.userId),finAccountId: mongoose.Types.ObjectId(req.body.account)}},
   {'$count':'counts'}]
 ).then(counts => {

   res.status(200).json({message: 'Get Record By account success!', records:result, counts:counts[0]})
 })
  })
});



module.exports = router;

// {$group:{recordType:"expenditure"}}


//$group : {
//       _id :"$finAccountId",
//         deposit: {$sum: "$amount"}
//       }
