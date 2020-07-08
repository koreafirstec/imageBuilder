
const {createCanvas, loadImage} = require('canvas');
const rValues = require('./utils/gettingRandomValues');
const fabric = require('fabric').fabric;
const mysql = require('mysql');
const fs = require('fs');

const canvasSize = 416;

require('dotenv').config();

const canvas = new fabric.Canvas('canvas', {
    width: canvasSize,
    height: canvasSize,
});
const destination = process.env.generatedImagesDir;

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

module.exports.build_image = (group_id, cycle, model, connection) => {
    console.log("hello" + cycle + ";;");
    return new Promise((resolved, reject) => {
        //canvas 객체 생성
        new Promise((resolve, reject) => {
            getBackground(group_id, canvas, resolve, connection);
        }).then(_ => {
            getImage(group_id, resolved, reject, cycle, model, canvas, connection);
        });
    })
};

function getBackground(group_id, canvas, resolve, connection) {
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

function getImage(group_id, build_resolve, build_reject, cycle, model, canvas, connection) {
    //group_id로 파일이름 가져오는 쿼리문
    connection.query("select filename, item_number from tb_build_item where TYPE = 'item' and group_idx = (select idx from tb_build_group where group_id = '" + group_id + "') order by item_number;", (err, result, field) => {
        //에러있으면 그냥 알려줌
        if (err) { console.log(err); }
        if (result.length < 1) {
            build_reject(build_response.no_image);
            return ;
        }

        //아이템이랑 프로미스배열 생성
        var points = [];
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
            var promise = new Promise((resolve, reject) => {

                //이미지 불러오기
                fabric.Image.fromURL(('file://' + __dirname + '/uploads/' + filename), (img) => {
                    //랜덤 스케일 불러오기

                    var scale = 3;
                    var scaleCycle = 0;

                    while((img.width * scale) > (canvas.width / 1.25)) {
                        if (scaleCycle < 20) {
                            scale = getElementSize(img.width, img.height, canvas.width, canvas.height);
                            scale = scale * (Math.random() * (3 - 0.25) + 0.25);
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
                        isOverParent(canvas.item(0).aCoords.br.y , canvasSize));

                    let aCoords = canvas.item(0).aCoords;
                    let leftTop = findValue(aCoords, lt);
                    let rightBottom = findValue(aCoords, rb);

                    // 이미지 좌표 확인용
                    // let stroke = new fabric.Rect({
                    //     left: leftTop.x,
                    //     top: leftTop.y,
                    //     width: rightBottom.x - leftTop.x,
                    //     height: rightBottom.y - leftTop.y,
                    //     strokeWidth: 2,
                    //     fill: '#00000000',
                    //     stroke: "#F00"
                    // });
                    // canvas.add(stroke);
                    points.push({ltx: leftTop.x, lty: leftTop.y, rbx: rightBottom.x, rby: rightBottom.y});

                    resolve();
                });
            });

            //프로미스 배열에 추가
            promises.push(promise)
        });
        //프로미스들이 모두 작업을 끝내면
        Promise.all(promises).then(_ => {
            savePosition(points, randomImage, model, cycle, connection);
            saveImage(canvas, group_id, cycle, build_resolve)
        }).then(_ => {
            // promises.forEach(promise => {
                // promise.clear()
            // })
        });
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

function savePosition(files, images, model, cycle, connection) {
    for (var i = 0; i < files.length; i++) {
        saveData(images[i], files[i], model, cycle, connection);
    }
}

function saveData(image, file, model, cycle, connection) {
    connection.query("select * from tb_build_item where filename = '" + image +"';", (err, result, field) => {
        var data = {
            fk_model_idx: model,
            fk_shape_idx: result[0].shape_idx,
            image_name: '10',
            // image_name: result[0].item_name,
            xmin: file.ltx,
            ymin: file.lty,
            xmax: file.rbx,
            ymax: file.rby
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

    var buff = new Buffer(imageData, 'base64');
    fs.writeFileSync(destination + 10 + '_' + ( cycle + 1 ) + '.png', buff);

    resolve()
}