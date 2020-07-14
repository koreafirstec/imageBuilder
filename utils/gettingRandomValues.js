
// iw : imageWidth
// cw : canvasWidth

//싱글 아이템
function getRandomPosition(itemWidth, itemHeight, canvasWidth, canvasHeight, scale) {
    var x, y;

    x = Math.floor(Math.random() * Math.abs((canvasWidth) - (itemWidth * scale)));
    y = Math.floor(Math.random() * Math.abs((canvasHeight) - (itemHeight * scale)));

    return {x: x, y: y}
}

//멀티 아이템
function getRandomPositions(itemWidth, itemHeight, canvasWidth, canvasHeight, scale, items) {
    var x, y;
    var check = true;
    var rollCount = 0;

    //다수아이템
    //아이템이 겹치지 않으면 check = false; 겹치면 true
    while (check && (rollCount < 300)) {
        //랜덤 xy 좌표값 아이템 스케일이랑 캔버스 크기에 맞춰서 생성
        x = Math.floor(Math.random() * (canvasWidth - (itemWidth * scale)));
        y = Math.floor(Math.random() * (canvasHeight - (itemHeight * scale)));

        var overlapped = false;
        //지금까지 그려져있는 모든 아이템 비교
        items.forEach(item => {
            if (overlapped !== true) {
                overlapped = isOverlap(x, y, itemWidth * scale, itemHeight * scale, item);
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

function getRandomDegree() {
    return ((Math.random() * 180) * Math.PI)
}

module.exports = { getRandomPosition, getRandomPositions, getRandomDegree };
