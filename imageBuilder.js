
const {createCanvas, loadImage} = require('canvas');
const rValues = require('./utils/gettingRandomValues');
const fabric = require('fabric').fabric;
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
        const canvas = new fabric.StaticCanvas('canvas', {
            width: canvasSize,
            height: canvasSize,
        });

        const ctx = canvas.getContext('2d');

        checkGroupIdExist(group_id, (isValid, err) => {
            if (isValid) {
                //배경 로딩 함수
                new Promise(((resolve, reject) => {
                    getBackground(group_id, canvas, resolve);
                })).then(_ => {
                    getImage(group_id, resolve, reject, cycle, model, canvas);
                });
                //이미지 생성 함수
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

function getBackground(group_id, canvas, resolve) {
    connection.query("select filename from tb_build_item where TYPE = 'background' and group_idx = (select idx from tb_build_group where group_id = '" + group_id + "') ORDER BY RAND() LIMIT 1;", (err, result, field) => {
        let item = result[0];

        if (item === undefined) {
            setBackgroundToCanvas(('file://'+ __dirname + '/images/' + getRandomBackground()), canvas, resolve)
        } else {
            setBackgroundToCanvas(('file://'+ __dirname + '/uploads/' + item.filename), canvas, resolve)
        }
    });
}

function setBackgroundToCanvas(bgPath, canvas, resolve) {
    fabric.Image.fromURL(bgPath, (bg) => {
        bg.set({
            top: 0,
            left: 0,
            scaleX: canvas.width / bg.width,
            scaleY: canvas.height / bg.height,
        });

        canvas.setBackgroundImage(bg);
        resolve();
    });
}

function getRandomBackground() {
    let basicBackground = ['bg_1.jpg', 'bg_2.jpg', 'bg_3.jpg', 'bg_4.jpg'];
    let count = Math.floor(Math.random() * 4);

    return basicBackground[count];
}

function getImage(group_id, build_resolve, build_reject, cycle, model, canvas) {
    //group_id로 파일이름 가져오는 쿼리문
    connection.query("select filename, item_number from tb_build_item where TYPE = 'item' and group_idx = (select idx from tb_build_group where group_id = '" + group_id + "') order by item_number;", (err, result, field) => {
        //에러있으면 그냥 알려줌
        if (err) { console.log(err); }
        if (result.length < 1) {
            build_reject(build_response.no_image);
            return ;
        }

        //아이템이랑 프로미스배열 생성
        // var files = []; 다중이미지를 위해 선언되었으나 필요없어졌으니 보류
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
                fabric.Image.fromURL(('file://' + __dirname + '/uploads/' + filename), (img) => {
                    //랜덤 스케일 불러오기

                    var scale = 3;
                    var scaleCycle = 0;

                    while((img.width * scale) > (canvas.width / 1.25)) {
                        if (scaleCycle < 50) {
                            scale = getElementSize(img.width, img.height, canvas.width, canvas.height);
                            scale = scale * (Math.random() * (3 - 0.5) + 0.5);
                            scaleCycle += 1;
                        } else {
                            scale -= 0.1;
                        }
                    }

                    do {
                        //초기화
                        clearCanvas(canvas);

                        let position = rValues.getRandomPosition(img.width, img.height, canvas.width, canvas.height, scale);

                        img.set({
                            angle: rValues.getRandomDegree(),
                            left: position.x,
                            top: position.y,
                            scaleX: scale,
                            scaleY: scale,
                        });

                        canvas.add(img);
                    } while (
                        isOverParent(canvas.item(0).aCoords.tl.x, canvasSize) ||
                        isOverParent(canvas.item(0).aCoords.tl.y, canvasSize) ||
                        isOverParent(canvas.item(0).aCoords.tr.x, canvasSize) ||
                        isOverParent(canvas.item(0).aCoords.tr.y, canvasSize) ||
                        isOverParent(canvas.item(0).aCoords.bl.x, canvasSize) ||
                        isOverParent(canvas.item(0).aCoords.bl.y, canvasSize) ||
                        isOverParent(canvas.item(0).aCoords.br.x, canvasSize) ||
                        isOverParent(canvas.item(0).aCoords.br.y, canvasSize));

                    let aCoords = canvas.item(0).aCoords;
                    let leftTop = findValue(aCoords, lt);
                    let rightBottom = findValue(aCoords, rb);

                    console.log(leftTop);
                    console.log(rightBottom);

                    let stroke = new fabric.Rect({
                        left: leftTop.x,
                        top: leftTop.y,
                        width: rightBottom.x - leftTop.x,
                        height: rightBottom.y - leftTop.y,
                        strokeWidth: 2,
                        fill: '#00000000',
                        stroke: "#F00"
                    });
                    canvas.add(stroke);
                    //겹치지않는 랜덤 좌표

                    //이미지 번호 (나중에 삭제)
                    // ctx.fillText((files.length + 1) + "번째", position.x, position.y);
                    //이미지 그리기
                    // ctx.drawImage(image, position.x, position.y, image.width * scale, image.height * scale);

                    // ctx.strokeStyle="#F00";
                    // ctx.strokeRect(position.x, position.y, (image.width * scale), (image.height * scale));

                    //그린 이미지 아이템배열에 추가.
                    // files.push({x: position.x, y: position.y, width: (image.width * scale), height: (image.height * scale)});
                    //
                    // let itemPoint = canvas.item(0);

                    //프로미스 작업 완료.
                    resolve();
                });
            }));

            //프로미스 배열에 추가
            promises.push(promise)
        });
        //프로미스들이 모두 작업을 끝내면
        Promise.all(promises).then(_ => {
            console.log("work");
            // savePosition(files, randomImage, model, cycle);
            saveImage(canvas, group_id, cycle, build_resolve)
        })
    });
}

const lt = 0;
const rb = 1;
function findValue(aCoord, type) {
    var x,y;
    switch (type) {
        case lt:
            x = getMinValue([aCoord.tl.x, aCoord.tr.x, aCoord.bl.x, aCoord.br.x]);
            y = getMinValue([aCoord.tl.y, aCoord.tr.y, aCoord.bl.y, aCoord.br.y]);
            break;
        case rb:
            x = getMaxValue([aCoord.tl.x, aCoord.tr.x, aCoord.bl.x, aCoord.br.x]);
            y = getMaxValue([aCoord.tl.y, aCoord.tr.y, aCoord.bl.y, aCoord.br.y]);
            break;
    }
    return {x: x, y: y}
}

function getMinValue(value) {
    return Math.min.apply(null, value)
}
function getMaxValue(value) {
    return Math.max.apply(null, value)
}

function clearCanvas(canvas) {
    var i = canvas._objects.length;
    while(i >= 0) {
        canvas.remove(canvas.item(i));
        i--
    }
}

function isOverParent(value, parentSize) {
    return !(value > 0 && value < parentSize);
}

function getElementSize(imageWidth, imageHeight, width, height) {
    x = (width / imageWidth) * 0.8;
    y = (height / imageHeight) * 0.8;

    return (x * y);
}

const destination ='savedImages/';

function savePosition(files, images, model, cycle) {
    for (var i = 0; i < files.length; i++) {
        saveData(images[i], files[i], model, cycle);
    }
}

function saveData(image, file, model, cycle) {
    connection.query("select * from tb_build_item where filename = '" + image +"';", (err, result, field) => {
        var data = {
            fk_model_idx: model,
            fk_shape_idx: result[0].shape_idx,
            image_name: 8,
            // image_name: result[0].item_name,
            xmin: file.x,
            ymin: file.y,
            xmax: file.x + file.width,
            ymax: file.y + file.height
        };
        connection.query('insert into tb_annotation(fk_model_idx, fk_shape_idx, image_name, xmin, ymin, xmax, ymax)' +
            'values('+ data.fk_model_idx +',' + data.fk_shape_idx +',"'+ data.image_name +'_'+ ( cycle + 1 ) +'",'+ data.xmin +','+ data.ymin +','+ data.xmax +','+ data.ymax +');',(err, result, field) => {
            if (err) { console.log(err) }
            console.log(result);
        }) ;
    });
}


function saveImage(canvas, group_id, cycle, resolve) {
    const imageData = canvas.toDataURL({
        width: canvas.width,
        height: canvas.height,
        left: 0,
        top: 0,
        format: 'png',
    }).replace('data:image/png;base64', '');

    // var imageData = canvas.('image/jpeg').replace('data:image/jpeg;base64', '');

    var buff = new Buffer(imageData, 'base64');
    fs.writeFileSync(destination  + 'test_' + ( cycle + 1 ) + '.png', buff);
    resolve()
}