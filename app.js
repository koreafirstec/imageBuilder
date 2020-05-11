const express = require('express');
const builder = require('./imageBuilder');

const app = express();
const port = process.env.PORT || 3000;

const multer = require('multer');
const fs = require('fs');
const mysql = require('mysql');
const bodyParser = require('body-parser');

require('dotenv').config();

//----------------Multer----------------

const destination ='uploads/';
const filename = (req, file, cb) => cb(null, Date.now() + "_" + file.originalname);

const allowedImagesExts = ['jpg', 'png', 'gif', 'jpeg'];
const fileFilter =  (req, file, cb) => cb(null, allowedImagesExts.includes(file.originalname.split('.').pop()));

const storage = multer.diskStorage({ destination, filename });
const upload = multer({ storage, fileFilter });

//----------------Mysql----------------

const connection = mysql.createConnection({
    host: process.env.host,
    user: process.env.userID,
    password: process.env.passWord,
    database: process.env.dataBase
});

//----------------Func----------------

function build_uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

//----------------Code----------------

app.use(express.static(__dirname));
app.use(express.static(__dirname + '/resource'));

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

//옛날 화면 (쓰레기)
app.get('/', (req, res) => {
    fs.readFile('resource/index.html', (err, data) => {
        res.writeHead(200, {'Content-Type':'text/html'});
        res.end(data);
    });
});

//새로운 화면
app.get('/v2', (req, res) => {
    fs.readFile('resource/index_v2.html', (err, data) => {
        res.writeHead(200, {'Content-Type':'text/html'});
        res.end(data);
    });
});

//키값 생성 후 디비에 입력한 뒤 키값 반환.
app.get('/init', (req, res) => {
    const group_id = build_uuid();

    connection.query("insert into tb_build_group(group_id) values ('"+ group_id +"')", (err, result, field) => {
        if (err) {
            console.log(err);
        }
        console.log(result);
    });
    res.status(200).send(JSON.parse('{ "key" : "' + group_id + '"}'));
});

//파일 업로드,
app.post('/upload', upload.array('img'), (req, res) => {
    var id = req.body.group_id;
    var type = req.body.type; //item, background
    var files = req.files;

    connection.connect();
    files.forEach(file => {
        connection.query("insert into tb_build_item(group_idx, filename, TYPE) values((select idx from tb_build_group where group_id = '" + id + "'), '" + file.filename + "', '" + type + "');", (err, result, field) => {
            if (err) {
                console.log(err);
            }
            console.log(result);
        });
    });
    connection.end();
    res.send("done");
});

//이미지 생성 시작!
app.post("/build", (req, res) => {
    var id = req.body.group_id;
    // var rotateAble = req.body.rotate_able;
    // var rotateAngle = req.body.rotate_angle;

    builder.build_image(id, req, res);
});



app.listen(port, () => {
    console.log(`app is Listening at ${port}`);
});