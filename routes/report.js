const fs = require("fs");
const express = require("express");
const authorize = require("../middleware/authorize");
const router= express.Router();
const path = require("path");

const excel = require('exceljs');

router.get("",async (req,res,next)=>{
    var workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet("My Sheet")
    worksheet.columns = [
        {header: 'Id', key: 'id', width: 10},
        {header: 'Name', key: 'name', width: 32},
        {header: 'D.O.B.', key: 'dob', width: 15,}
    ];

    worksheet.addRow({id: 1, name: 'John Doe', dob: new Date(1970, 1, 1)});
    worksheet.addRow({id: 2, name: 'Jane Doe', dob: new Date(1965, 1, 7)});
    await workbook.xlsx.writeFile(path.join(__dirname, '../', 'export.xlsx'));

    // res.status(200).json();
    res.status(200).download(path.join(__dirname, '../', 'export.xlsx'),'testfile.xlsx',()=>{
        fs.unlink(path.join(__dirname, '../', 'export.xlsx'), (err) => {
            if (err) throw err;
            console.log('successfully deleted file');
        })
    });
});

module.exports = router;
