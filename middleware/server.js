'use strict';

/**
 * Load Twilio configuration from .env config file
 */
require('dotenv').load();

const http = require('http');
const express = require('express');
const ngrok = require('ngrok');
const flex = require('./flex-custom-webchat');

// Create Express webapp and connect socket.io
var app = express();
var server = http.createServer(app);
var io = require('socket.io')(server);

// Static pages goes in ./public folder
app.use(express.static('public'));

var bodyParser = require('body-parser');
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

app.post('/new-message', async (request, response) => {
  const { From, WaId, Body } = request.body;

  console.log('post /new message', JSON.stringify(request.body, null, 2));
  // console.log('Twilio new message webhook fired');
  if (request.body.Source === 'SDK') {
    await flex.sendWhatsappMessage('whatsapp:+14155238886', Body, 'whatsapp:+4917672899431');
    io.emit('chat message', request.body.Body);
  }
  response.sendStatus(200);
});

app.post('/channel-update', function (request, response) {
  console.log('Twilio channel update webhook fired');
  let status = JSON.parse(request.body.Attributes).status;
  console.log('Channel Status: ' + status);
  flex.resetChannel(status);
  response.sendStatus(200);
});

// {
//   SmsMessageSid: 'SMc68bae49611e717d9302841a39a75b85',
//   NumMedia: '0',
//   ProfileName: 'Bruno',
//   SmsSid: 'SMc68bae49611e717d9302841a39a75b85',
//   WaId: '4917672899431',
//   SmsStatus: 'received',
//   Body: '1 2 3',
//   To: 'whatsapp:+14155238886',
//   NumSegments: '1',
//   MessageSid: 'SMc68bae49611e717d9302841a39a75b85',
//   AccountSid: 'AC60c3a3ca028d6b62bf2651db58105ad9',
//   From: 'whatsapp:+4917672899431',
//   ApiVersion: '2010-04-01'
// }
app.post('/whatsapp-to-flex', function (request, response) {
  console.log('post /whatsapp-to-flex', request.body);
  const { From, WaId, Body } = request.body;
  flex.sendMessageToFlex(Body, From);
  response.end();
});

io.on('connection', function (socket) {
  console.log('User connected');
  socket.on('chat message', function (msg) {
    console.log('msg', msg);
    flex.sendMessageToFlex(msg, 'test123');
    io.emit('chat message', msg);
  });
});

// Create http server and run it.
var port = process.env.PORT || 3000;
server.listen(port, function () {
  console.log('Express server running on *:' + port);
  // Enable ngrok
  ngrok
    .connect({
      addr: port,
      subdomain: process.env.NGROK_SUBDOMAIN,
    })
    .then((url) => {
      console.log(`ngrok forwarding: ${url} -> http://localhost:${port}`);
      process.env.WEBHOOK_BASE_URL = url;
    })
    .catch((e) => {
      console.log('ngrok error: ', e);
    });
});
