var http = require("http"); // http모듈 request, response 처리
var fs = require("fs"); // file stream 모듈 파일 읽기, 쓰기
var url = require("url"); // url 파싱
var qs = require('querystring'); // 사용자 전송 데이터 받기
var template = require('./lib/template.js'); // template
var path = require('path'); // 입력정보 보안
var sanitizeHtml = require('sanitize-html'); // 출력정보 보안


var app = http.createServer(function(request, response){ // http 모듈의 메소드 create server. 파라미터로 request listener; request와 response에 대한 함수 받음. 이 함수가 request, reseponse 객체 만듦
  var __url = request.url;
  var queryData = url.parse(__url, true).query;
  var pathname = url.parse(__url, true).pathname;

  if (pathname === '/'){
    if (queryData.id === undefined){
      var title = "welcome";
      var description = " ";

      fs.readdir("./data", function(err,filelist){ // data폴더안 파일 목 읽어 filelist라는 변수에 배열로 입력후 이후 내용 실행
        var list = template.List(filelist);
        var html = template.Html(title, list, description,``); // html을 함수를 활용하여 작성

        response.writeHead(200);
        response.end(html);
      }); // 여기까지 fs.readdir
    } // 여기까지 쿼리데이터가 undefined인 경우
    else if (queryData.id === "map.html"){
        fs.readFile(`data/${queryData.id}`, "utf-8", function(err,map){
          response.writeHead(200);  // response로 200,
          response.end(map); // response로 template 변수에 담긴 내용 보냄

        }); // 여기까지 fs.readfile

    }
    
    else{
        fs.readdir("./data", function(err,filelist){
          var filteredId = path.parse(queryData.id).base;
          fs.readFile(`data/${filteredId}`, "utf-8", function(err,description){ // 쿼리스트링에 따른 파일 읽기로 본문구성. data폴더에 쿼리스트링에 대응되는 본문 파일 넣어두는 것으로 자동적으로 html페이지 생성됨
            var title = queryData.id;
            var sanitizedTitle = sanitizeHtml(title);
            var sanitizedDescription = sanitizeHtml(description, {
              allowedTags:['h1','a','p','ul','li']
            });
            var list = template.List(filelist);
            var html = template.Html(sanitizedTitle, list, 
            `<h2>${sanitizedTitle}</h2>${sanitizedDescription}`,
            `<a href="/create">create</a> 
            <a href="/update?id=${sanitizedTitle}">update</a>
            <form action="delete_process" method="post"> 
              <input type="hidden" name="id" value="${sanitizedTitle}">
              <input type="submit" value="delete">
            </form>
            ` // delete버튼 폼으로 구현
            );

            response.writeHead(200);  // response로 200,
            response.end(html); // response로 html 변수에 담긴 내용 보냄

          }); // 여기까지 fs.readfile
        }); // 여기까지가 fs.readdir
    } //여기까지가 query.id가 undefined 아닌 경우
  } //여기까지가 path name이 루트디렉토리인 경우

  else if (pathname === "/create"){ // 글 생성 링크
    fs.readdir('./data', function(error, filelist){
      var title = 'WEB - create';
      var list = template.List(filelist);
      var html = template.Html(title, list, `
        <form action="http://localhost:8000/create_process" method="post">
          <p><input type="text" name="title" placeholder="title"></p>
          <p>
            <textarea name="description" placeholder="description"></textarea>
          </p>
          <p>
            <input type="submit">
          </p>
        </form>
      `);
      response.writeHead(200);
      response.end(html);
    });
  }
  else if(pathname === '/create_process'){ // 글 생성 데이터 받고 리다이렉션
    var body = '';
    request.on('data', function(data){
        body = body + data;
    });
    request.on('end', function(){
        var post = qs.parse(body);
        var title = post.title;
        var description = post.description;
        fs.writeFile(`data/${title}`, description, 'utf8', function(err){
          response.writeHead(302, {Location: `/?id=${title}`});
          response.end();
        });
    });
    
  }
  else if(pathname === '/update'){ // 글 수정 링크
    fs.readdir('./data', function(error, filelist){
      var filteredId = path.parse(queryData.id).base;
      fs.readFile(`data/${filteredId}`, 'utf8', function(err, description){
        var title = queryData.id;
        var list = template.List(filelist);
        var html = template.Html(title, list,
          `
          <form action="/update_process" method="post">
            <input type="hidden" name="id" value="${title}">
            <p><input type="text" name="title" placeholder="title" value="${title}"></p>
            <p>
              <textarea name="description" placeholder="description">${description}</textarea>
            </p>
            <p>
              <input type="submit">
            </p>
          </form>
          `, // 기존 내용은 감춰진 상태로 보존
          `<a href="/create">create</a> <a href="/update?id=${title}">update</a>`
        );
        response.writeHead(200);
        response.end(html);
      });
    });
  }  

  else if(pathname === '/update_process'){ // 글 수정 정보 받아 파일 수정
    var body = '';
    request.on('data', function(data){
        body = body + data;
    });
    request.on('end', function(){
        var post = qs.parse(body);
        var id = post.id;
        var title = post.title;
        var description = post.description;
        fs.rename(`data/${id}`, `data/${title}`, function(error){
          fs.writeFile(`data/${title}`, description, 'utf8', function(err){
            response.writeHead(302, {Location: `/?id=${title}`});
            response.end();
          })
        });
    });
  }
  else if(pathname === '/delete_process'){
    var body = '';
    request.on('data', function(data){
        body = body + data;
    });
    request.on('end', function(){
        var post = qs.parse(body);
        var id = post.id;
        var filteredId = path.parse(id).base;
        fs.unlink(`data/${filteredId}`, function(error){
          response.writeHead(302, {Location: `/`});
          response.end();
        })
    });
  }
  else { // path name이 루트디렉토리, create, create_process 아닌 경우
    response.writeHead(404);  // response로 404,
    response.end('not found'); // response로 not found 메시지 보냄
  }
}); //여기까지 createServer

app.listen(8000); // 만든 서버 포트 번호 설정
