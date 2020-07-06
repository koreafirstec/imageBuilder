const express = require('express');
const builder = require('./imageBuilder');

const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');

const multer = require('multer');
const fs = require('fs');
const mysql = require('mysql');
const bodyParser = require('body-parser');

require('dotenv').config();

//----------------Multer----------------

//Only English
const uploadDir = process.env.uploadedImagesDir;
const filename = (req, file, cb) => cb(null, Date.now() + "_" + file.originalname);

const allowedImagesExts = ['jpg', 'png', 'gif', 'jpeg'];
const fileFilter =  (req, file, cb) => cb(null, allowedImagesExts.includes(file.originalname.split('.').pop()));

const storage = multer.diskStorage({uploadDir, filename});
const upload = multer({ storage, fileFilter });

//----------------Mysql----------------

const connection = mysql.createConnection({
    host: process.env.host,
    user: process.env.userID,
    password: process.env.passWord,
    database: process.env.dataBase,
    port: process.env.dbPort,
    connectionTimeout: 360000
});

//----------------Func----------------

function build_uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function buildGroup(id, nowCycle, cycle, model) {
    if (nowCycle < cycle) {
        builder.build_image(id, nowCycle, model, connection)
            .then(() => {
                buildGroup(id, nowCycle + 1, cycle, model)
            });
    }
}
// 1.이미지 확인, 2. 이미지 제거, 388.db값 제거
async function deleteGroup(group_id, callback) {

    try {
        const filenames = await getFilenames(group_id);

        console.log(filenames);

        for(var i in filenames) {
            console.log("nowFile : " + filenames[i]);
            await deleteFile(filenames[i]);
        }
        callback(true);
    } catch (e) {
        console.log(e);
        callback(false);
    }
}

async function getFilenames(group_id) {
    try {
        const items = await new Promise((resolve, reject) => {
            connection.query("select filename from tb_build_item where group_idx = (select idx from tb_build_group where group_id = '" + group_id + "');", (err, result, fields) => {
                if (err) {
                    reject(err);
                }

                var array = [];
                result.forEach(item => {
                    array.push(item.filename)
                });

                resolve(array);
            });
        });
        await connection.commit();

        return items;
    } catch (e) {
        throw Error("no items");
    }
}

async function deleteFile(filename) {
    await connection.beginTransaction();
    try {
        await connection.query("delete from tb_build_item where filename = '" + filename + "';");
        await connection.commit();

        fs.unlink(uploadDir + filename, (err) => {
            if (err) throw new Error('file delete failed : ' + err)
        });
    } catch (e) {
        console.log(e);
        connection.rollback();
    }
}

function checkGroupIdExist(group_id, callback) {
    console.log(group_id);
    connection.query("select idx from tb_build_group where group_id = '" + group_id + "';", (err, result, field) => {
        if (err) { callback(false, err) }

        console.log(result[0]);
        callback(result[0] !== undefined, null)
    });
}


app.listen(port, () => {
    console.log(`app is Listening at ${port}`);
});

//----------------Code----------------

app.use(express.static(__dirname));
app.use(express.static(__dirname + '/resource'));

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(cors());

//옛날 화면
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
    var num = req.body.item_number;

    var shape_idx = req.body.shape_idx;
    var item_name = req.body.item_name;

    var type = req.body.type; //item, background
    var files = req.files;

    if (!files) {
        res.status(412).send("no file detected");
        return;
    }

    connection.query("select idx from tb_build_group where group_id = '" + id + "';", (err, result, field) => {
        if (result.length > 0) {
            files.forEach(file => {
                connection.query("insert into tb_build_item(group_idx, shape_idx, item_name, item_number, filename, TYPE) values((select idx from tb_build_group where group_id = '" + id + "'), '"+ shape_idx +"', '"+ item_name +"', '"+ num +"', '" + file.filename + "', '" + type + "');", (err, result, field) => {
                    if (err) { console.log(err) }
                    console.log(result);
                });
            });
            res.status(200).send("done");
        } else {
            console.log("else");
            res.status(412).send("id doesn't exist");
        }
    });
});

//이미지 생성 시작!
app.post("/build", (req, res) => {
    var id = req.body.group_id;
    // var rotateAble = req.body.rotate_able;
    // var rotateAngle = req.body.rotate_angle;
    var cycle = req.body.cycle;
    var model = req.body.model_id;

    var promises = [];
    checkGroupIdExist(id, (isValid, err) => {
        if (isValid) {
            buildGroup(id, 0, cycle, model);
        } else {
            if (err !== null) {
                console.log(err);
            } else {
                console.log("unknown error");
            }
            res.status(500).send('error founded');
        }
    });

    res.status(200).send('done');
});

app.delete("/delete", (req, res) => {
   var id = req.body.group_id;

   checkGroupIdExist(id, (isValid, err) => {
      if (isValid) {
          deleteGroup(id, (done, err) => {
              if (done) {
                  res.status(200).send("deleted");
              } else {
                  res.status(500).send('error founded : ' + err);
              }
          });
      } else {
          res.status(500).send('error founded : ' + err);
      }
   });
});