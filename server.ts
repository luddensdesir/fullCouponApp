import {config} from "./localconfig";
import express from "express";
import path from "path";
// const app from "express")();
import colors from "colors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import stackTrace from "stack-trace";
import * as jwtHelper from "./backend/utils/jwtHelper";
import UserData from "./backend/dataAccess/users";
import ListData from "./backend/dataAccess/lists";
import * as utils from "./backend/utils/misc";
import {createServer} from 'http';
import WebSocket, {WebSocketServer} from 'ws';
const server = createServer();
const wss = new WebSocketServer({ port: 8081 });

require("@babel/register")({extensions: [".js", ".ts"]});

const app = express();

const port = 8080;
const curEnv = config.curEnv;
const dev = (curEnv === "development");
const dbConn = require("./backend/dataAccess/dbConnection");
let ejs = require("ejs");
require("pretty-error").start();


dbConn.connection(config.dbCreds);

app.use(cookieParser(config.cookieSecret, { httpOnly: true })); 
app.use(morgan("dev"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

ejs.delimiter = "?";
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "dist")));

app.use(function(req, res, next) {
  if(dev){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  } 
  
  // res.header("Content-Type", "text/html");
  next();
}); 

app.use(function(req, res, next) {
  const encodedToken = req.body.token ||
    req.query.token ||
    req.headers["x-access-token"] ||
    req.cookies.token;

  // !utils.n(encodedToken)? req.userToken = jwtHelper.verifyLoginToken(encodedToken):null;
 
  next();
});

app.get("/", (req,res) => {

  if(!utils.n(req.userToken)){
    UserData.getUserByUsername(req.userToken, (getUserError, resUser)=>{
      ListData.getListbyUserId(resUser.memberID, (getListError, resList)=>{

        let actuallyEmpty = false;

        if(resList.list.length === 0){
          actuallyEmpty = true;
        }

        res.render(path.resolve(__dirname, "dist", "index.ejs"), {
          lastUsedList: JSON.stringify(resList.list),
          userListActuallyEmpty: actuallyEmpty
        });

      });
    });
  } else {
    utils.l("encodedToken is null");
    res.render(path.resolve(__dirname, "dist", "index.ejs"), {
      lastUsedList: JSON.stringify([]),
      userListActuallyEmpty: false
    });
  }
});


app.use(require("./backend/list/listRoutes"));
app.use(require("./backend/users/userRoutes"));

app.get("/login/", function (req, res) {
  res.header("Content-Type", "text/html");
  res.sendFile(path.resolve(__dirname, "dist", "index.html"));
});

app.get("/register/", function (req, res) {
  res.header("Content-Type", "text/html");
  res.sendFile(path.resolve(__dirname, "dist", "index.html"));
});

app.listen(port, () => {
  console.log(colors.yellow(`Listening to app on server port ${port} in ${curEnv} mode`));
});


wss.on("connection", function connection(ws) {
  
  ws.binaryType = "arraybuffer";

  ws.on("message", function message(data) {
    console.log(data.toString());

    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send("test");
      }
    });
  });

  ws.send("connection initialized");
});



export {};