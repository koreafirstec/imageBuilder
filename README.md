## ImageBuilder

API 사용법
----
API 사용순서

    1.초기 설정 및 호출 그룹코드 발급      > /init
    2.객체 이미지 및 배경이미지 업로드     > /upload
    3.학습데이터 생성                     > /build
  
***
init
----
  초기작업 

* **URL**

  /init

* **Method:**

  `GET`
  
* **URL Params**

  None

* **Data Params**

  None

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** `{ "key": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }`
 
<!-- 
  * **Error Response:**

  * **Code:** 404 NOT FOUND <br />
    **Content:** `{ error : "User doesn't exist" }`

  OR

  * **Code:** 401 UNAUTHORIZED <br />
    **Content:** `{ error : "You are unauthorized to make this request." }`
-->
* **Sample Call:**

  ```javascript
    $.ajax({
      url: "/init",
      dataType: "json",
      type : "GET",
      success : function(result) {
        console.log(result);
      }
    });
  ```

***
upload
----
  데이터 생성을위한 기초이미지 업로드 

* **URL**

  /upload

* **Method:**

  `POST`
  
* **URL Params**

  None

* **Data Params**

      group_id: [Key],
      item_number: [number],
      shape_idx: [number],
      item_name: [string],
      type: [image, background],
      img: [imageFiles] // png 권장

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** `done`


* **Error Response:**

  * **Code:** 412 <br />
    **Content:** `no file detected`

  OR

  * **Code:** 412 <br />
    **Content:** `id dosen't exist`

* **Sample Call:**

* **Html:**
  ```html
    
    <form method="POST" enctype="multipart/form-data" id="fileUploadForm">
        <input type="text" name="group_id"/>
        <input type="text" name="item_number"/>    
        <input type="text" name="type"/>        
        <input type="file" name="group_id"/>    
        <input type="file" name="group_id"/>   
        ...
        <input type="submit" value="Submit" id="SubmitBtn">
    </form>

  ```

* **JS:**
  ```javascript
    
    var form = $('#fileUploadForm')[0];
    var data = new FormData(form);
    
    $.ajax({
      url: "/upload",
      type : "POST",
      enctype: 'multipart/form-data',
      data: data,
      success : function(result) {
        console.log(result);
      }
    });
    
  ```

***
build
----
  초기 

* **URL**

  /build

* **Method:**

  `POST`
  
* **URL Params**

  None

* **Data Params**

      group_id: [Key],
      cycle: [number],
      model_id: [number]

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** `done`
    
* **Error Response:**

  * **Code:** 500 <br />
    **Content:** `an error founded`

  OR

  * **Code:** 412 <br />
    **Content:** `no group founded`
    
* **Sample Call:**

  ```javascript
    $.ajax({
      url: "/build",
      type : "POST",
      data : {
        group_id: [Key]
      },
      success : function(result) {
        console.log(result);
      }
    });
  ```

***
