const options = Object({
    rotateAble: false,
    sizeChangeAble: false,
});

const itemArray = Object({
    items: []
});

/*
const item = Object({
    annoName: '',
    images: []
});
*/

const backgrounds = Object({
   images: []
});

/////////////////
function getParentNode(element) {
    return element.parentNode;
}

function getElementIndex(element) {
    return [].indexOf.call(element.parentNode.children, element);
}

/////////////

function init() {
    setDropZone();
    initList();
    initButton();
}

function initButton() {
    let startButton = document.getElementById('start_button');

    startButton.addEventListener("click", buildImages)
}

function buildImages() {
    initImages()
}

function initImages() {
    divideByGroup().forEach(imageGroup => {
       uploadImages(imageGroup)
    });
}

function divideByGroup() {
//    return imageGroups[][]
    var imageGroups = [];
    for (var i = 0; i < itemArray.items.length; i++) {
        imageGroups.push(itemArray.items[i].images);
    }

    console.log(imageGroups);
    return imageGroups;
}

function uploadImages(imageGroup) {
//    imageGroup[]
    console.log(imageGroup)
}

function setDropZone() {
    let dropZone = document.getElementById('drop_zone');
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach( (eventName) => {
        dropZone.addEventListener(eventName, preventDefaults, false)
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight설정
    ['dragenter', 'dragover'].forEach((eventName) => {
        dropZone.addEventListener((eventName), highlight, false);
    });
    ['dragleave', 'drop'].forEach((eventName) => {
        dropZone.addEventListener((eventName), unhighlighted, false);
    });

    function highlight(e) {
        dropZone.classList.add('highlight');
    }
    function unhighlighted(e) {
        dropZone.classList.remove('highlight');
    }

    //DropEvent 설정
    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
    //    DropEvent Handling
        let dt = e.dataTransfer;
        let files = dt.files;

        fileHandler(files)
    }
}
function fileHandler(files) {
    ([...files]).forEach((file) => {
        var reader = new FileReader();

        reader.onload = function() {
            toggleModal();
            if (itemArray.items[clickedItemNumber] === undefined) {

                //Add Item
                itemArray.items[clickedItemNumber] = new Object({
                    annoName: 'test' + clickedItemNumber,
                    images: [reader.result,]
                });

                // Add List
                addList();
            } else {
                itemArray.items[clickedItemNumber].images.push(reader.result);
                console.log(itemArray.items[clickedItemNumber]);
            }

            var ul = document.getElementById('list_parent');
            var li = document.createElement("li");
            var img = document.createElement("img");

            img.setAttribute("class", "img");

            li.setAttribute("id", "element_"+ clickedItemNumber +"_" + ul.children.length);
            li.setAttribute("class", "list_item");
            li.appendChild(img);

            ul.children.item(clickedItemNumber)
                .appendChild(li);

            li.firstChild.src = reader.result;
        };
        reader.readAsDataURL(file);
    })
}

function initList() {
    addList()
}

var clickedItemNumber = null;
function addList() {
    const list_parent = document.getElementById('list_parent');

    var ol = document.createElement("ol");
    ol.setAttribute("class", "list_group");

    var itemNumber = itemArray.items.length;
    var li = document.createElement("li");
    li.setAttribute("id", "item" + itemNumber + "_add");
    li.setAttribute("class", "list_item");
    li.appendChild(document.createTextNode("+"));

    ol.appendChild(li);
    list_parent.appendChild(ol);

    li.addEventListener("click", function(event) {
        clickedItemNumber = getElementIndex(li.parentElement);
        console.log(getElementIndex(li.parentElement));

        toggleModal()
    }, false)
}

init();