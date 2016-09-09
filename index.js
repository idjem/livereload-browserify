"use strict"
const http       = require('http');
const ws         = require('ws');
const open       = require('open');
var interceptor = require('express-interceptor');
var cheerio     = require('cheerio');
var guid        = require('mout/random/guid')

var forIn         = require('mout/object/forIn')

const WebSocketServer = ws.Server;

const express   = require("express");

module.exports = class Livereload {

  constructor(port){
    this.clients = {};
    this.reloadClient = this.reloadClient.bind(this);

    var app = express();
    var finalParagraphInterceptor = interceptor(function(req, res){
      return {
        isInterceptable: function(){
          return /text\/html/.test(res.get('Content-Type'));
        },
        intercept: function(body, send) {
          var $document = cheerio.load(body);
          $document('body').append("<script>var client = new WebSocket('ws://localhost:3000');client.onmessage = function (event) { if(event.data == 'reload')document.location.href = document.location.href; };</script>");
          send($document.html());
        }
      };
    });

    var server  = http.createServer(app);
    server.listen(port , function(){
      var nav = open('http://localhost:'+port+'/test/');
    });

    var web_sockets = new WebSocketServer({
      server: server,
      path : '/'
    });

    web_sockets.on('connection',  (client) => {
      var g = guid();
      this.clients[g] = client;
      var deleteClient = ()=>{delete this.clients[g]};
      client.on('disconnect', deleteClient);
      client.on('close',  deleteClient);
      client.on('error',  deleteClient);
    });

    app.use(finalParagraphInterceptor);
    app.use("/test/" , express.static("../dist/"));
  }

  reloadClient(){
    forIn(this.clients , function(client){
      client.send("reload");
    })
  }
}
