## ImageBuilder

API 사용법
----
API 사용순서

    1.초기 설정 및 호출 그룹코드 발급        > /init
    2.객체 이미지 및 배경이미지 업로드        > /upload
    3.학습데이터 생성                     > /build
  
***
init
----
  초기 

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
