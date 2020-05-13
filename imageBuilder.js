const {createCanvas, loadImage} = require('canvas');
const mysql = require('mysql');
const fs = require('fs');

const canvasSize = 416;

//----------------Mysql----------------

const connection = mysql.createConnection({
    host: '172.30.1.10',
    user: 'root',
    password: 'root',
    database: 'titan'
});

//----------------Code----------------

module.exports.build_response = {
    an_error: {
        status: 500,
        reason: 'An error founded.'
    },
    no_group: {
        status: 412,
        reason: 'no group_founded.'
    },
    no_image: {
        status: 412,
        reason: 'no image files.'
    }
};

module.exports.build_image = (group_id, cycle, model) => {
    return new Promise(((resolve, reject) => {
        //canvas 객체 생성
        const canvas = createCanvas(canvasSize, canvasSize);
        const ctx = canvas.getContext('2d');

        checkGroupIdExist(group_id, (isValid, err) => {
            if (isValid) {
                //배경 로딩 함수
                getBackground(group_id, canvas, ctx);
                //이미지 생성 함수
                getImage(group_id, resolve, reject, cycle, model, canvas, ctx);
            } else {
                if (err !== null) {
                    console.log(err);
                    reject(build_response.an_error);
                } else {
                    reject(build_response.no_group);
                }
            }
        });
    }));
};

function checkGroupIdExist(group_id, callback) {
    connection.query("select idx from tb_build_group where group_id = '" + group_id + "';", (err, result, field) => {
        if (err) { callback(false, err) }
        callback(result[0] !== undefined, null)
    });
}

function getBackground(group_id, canvas, ctx) {
    connection.query("select filename from tb_build_item where TYPE = 'background' and group_idx = (select idx from tb_build_group where group_id = '" + group_id + "') ORDER BY RAND() LIMIT 1;", (err, result, field) => {
        let item = result[0];

        if (item === undefined) {
            setBackgroundToCanvas(('./images/' + getRandomBackground()), canvasSize, ctx)
        } else {
            setBackgroundToCanvas(('./uploads/' + item.filename), canvasSize, ctx)
        }
    });
}

function setBackgroundToCanvas(bgPath, canvasSize, ctx) {
    loadImage(bgPath).then((background) => {
        ctx.drawImage(background, 0, 0, canvasSize, canvasSize);
    });
}

function getRandomBackground() {
    let basicBackground = ['bg_1.jpg', 'bg_2.jpg', 'bg_3.jpg', 'bg_4.jpg'];
    let count = Math.floor(Math.random() * 4);

    return basicBackground[count];
}

function getImage(group_id, build_resolve, build_reject, cycle, model, canvas, ctx) {
    //group_id로 파일이름 가져오는 쿼리문
    connection.query("select filename, item_number from tb_build_item where TYPE = 'item' and group_idx = (select idx from tb_build_group where group_id = '" + group_id + "') order by item_number;", (err, result, field) => {
        //에러있으면 그냥 알려줌
        if (err) { console.log(err); }
        if (result.length < 1) {
            build_reject(build_response.no_image);
            return ;
        }

        //아이템이랑 프로미스배열 생성
        var files = [];
        var imageGroup = [];
        var randomImage = [];
        var promises = [];

        var itemPosition = [];
        result.forEach((item) => {
            // item.filename
            // item.item_number
            if (itemPosition.length < 1 || !itemPosition.includes(item.item_number)) {
                itemPosition.push(item.item_number);
            }

            var itemIndex = itemPosition.indexOf(item.item_number);
            if (imageGroup[itemIndex] === undefined) {
                imageGroup[itemIndex] = []
            }

            imageGroup[itemIndex].push(item.filename);
        });

        imageGroup.forEach((itemArr) => {
            randomImage.push(itemArr[Math.floor(Math.random() * itemArr.length)])
        });

        //쿼리에서 가져온 파일이름들 foreach
        randomImage.forEach((filename) => {
            //새로운 프로미스 생성
            var promise = new Promise(((resolve, reject) => {

                //이미지 불러오기
                loadImage('./uploads/' + filename).then((image) => {
                    //랜덤 스케일 불러오기
                    let scale = getElementSize(image.width, image.height, canvas.width, canvas.height);
                    scale = scale * (Math.random() * (2 - 0.5) + 0.5);

                    //겹치지않는 랜덤 좌표
                    let position = getRandomPosition(image.width, image.height, canvas.width, canvas.height, scale, files);

                    //이미지 번호 (나중에 삭제)
                    ctx.fillText((files.length + 1) + "번째", position.x, position.y);
                    //이미지 그리기
                    ctx.drawImage(image, position.x, position.y, image.width * scale, image.height * scale);

                    //그린 이미지 아이템배열에 추가.
                    files.push({x: position.x, y: position.y, width: (image.width * scale), height: (image.height * scale)});

                    //프로미스 작업 완료.
                    resolve();
                });
            }));

            //프로미스 배열에 추가
            promises.push(promise)
        });
        //프로미스들이 모두 작업을 끝내면
        Promise.all(promises).then(_ => {
            savePosition(files, randomImage, model);
            saveImage(canvas, group_id, cycle, build_resolve)
        })
    });
}

function getElementSize(imageWidth, imageHeight, width, height) {
    x = (width / imageWidth) * 0.8;
    y = (height / imageHeight) * 0.8;

    return (x * y);
}
// iw : imageWidth
// cw : canvasWidth

function getRandomPosition(iw, ih, cw, ch, scale, items) {
    var check = true;
    var x, y;
    var rollCount = 0;

    //아이템이 겹치지 않으면 check = false; 겹치면 true
    while(check && (rollCount < 300)) {
         //랜덤 xy 좌표값 아이템 스케일이랑 캔버스 크기에 맞춰서 생성
         x = Math.floor(Math.random() * (cw - (iw * scale)));
         y = Math.floor(Math.random() * (ch - (ih * scale)));

        var overlapped = false;
        //지금까지 그려져있는 모든 아이템 비교
        items.forEach(item => {
            if (overlapped !== true) {
                overlapped = isOverlap(x, y, iw * scale, ih * scale, item);
            }
        });

        //겹침에따라 바뀜
        check = overlapped;
        rollCount++;
    }
    //겹치지 않는 좌표값일경우 반환
    return {x: x, y: y}
}

// 겹침 판단!
function isOverlap(x,y,w,h, item) {
    var checkX = false,checkY = false;

    if (x + w < item.x || item.x + item.width < x) {checkX = true;}
    if (y > item.y + item.height || item.y > y + h) {checkY = true;}
    return !(checkX || checkY);
}

const destination ='savedImages/';

function savePosition(files, images, model) {
    for (var i = 0; i < files.length; i++) {
        saveData(images[i], files[i], model);
    }
}

function saveData(image, file, model) {
    connection.query("select * from tb_build_item where filename = '" + image +"';", (err, result, field) => {
        var data = {
            fk_model_idx: model,
            fk_shape_idx: result[0].shape_idx,
            image_name: result[0].item_name,
            xmin: file.x,
            ymin: file.y,
            xmax: file.x + file.width,
            ymax: file.y + file.height
        };
        connection.query('insert into tb_annotation(fk_model_idx, fk_shape_idx, image_name, xmin, ymin, xmax, ymax)' +
            'values('+ data.fk_model_idx +',' + data.fk_shape_idx +',"'+ data.image_name +'",'+ data.xmin +','+ data.ymin +','+ data.xmax +','+ data.ymax +');',(err, result, field) => {
            if (err) { console.log(err) }
            console.log(result);
        });
    });
}

function saveImage(canvas, group_id, cycle, resolve) {
    var imageData = canvas.toDataURL('image/jpeg').replace('data:image/jpeg;base64', '');

    var buff = new Buffer(imageData, 'base64');
    fs.writeFileSync(destination + group_id + '_' + cycle + '.jpeg', buff);
    resolve()
}