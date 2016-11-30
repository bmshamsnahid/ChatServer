var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var mongo = require('mongodb');
var db = require('monk')('mongodb://ShamsNahid:56316498@ds117348.mlab.com:17348/chatserver');
//var db = require('monk')('localhost/chatserver');

server.listen(process.env.PORT || 3000);
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

//all online members list
var onlineList = [];

/*
if a new user joined, then already joined it to the array
now send the new lsit to the client side
*/
function newOnlineList() {
	io.sockets.emit('onlineList', onlineList);	//sending to the client side
}
/*
here update client side by message type
for general message username is bold
for join green and for leave red
message type provide general, leave or join
after got all info, send it to the client
*/
function messageAndUser(userName, messageBody, messageType) {
	var messages = db.get('messages');
	messages.insert({
        'name': userName,
        'messageBody': messageBody,
        'messageType': messageType
    }, function(err, message){
       if(err) {
       	console.log('Error Found ' + err);
       } 
    });

    if(messageType == 'join') {
    	var messages = db.get('messages');
		messages.find({}, {}, function(err, messages) {
			var str = '';
			for(var i=0; i<messages.length; i++) {
    			var fullMessage = messages[i];
    			str += (fullMessage.name + ' ' + fullMessage.messageBody + '<br/>');
    		}
    		console.log(str);

			io.sockets.emit('newMessageFound', {
				type: messageType,	//assign type
				messageHistory: str
			});
		});
    } else {
    	io.sockets.emit('newMessageFound', {
			message: messageBody,	//assign body
			sender: userName,	//assing name
			type: messageType	//assign type
		});
    }
}

//check ig a new user connected
io.sockets.on('connection', function(socket) {

	//got a new user, have to join the onlien list and notice others
	socket.on('getAnUser', function(data, callback) {
		if(onlineList.indexOf(data) != -1) {	//a person with the same name is online now
			callback(false);
		} else {
			callback(true);	
			socket.username = data;		//got the new username
			onlineList.push(socket.username);		//store it in onlinelist array
			newOnlineList();		//in clident side update the list
			messageAndUser(socket.username, ' just joined.', 'join');	//send the messge to notice others
		}
	});

	/*	
	sending message is received from message bodx
	then i receive it here
	push to the message body section
	*/
	socket.on('sendingMessageInfo', function(data) {
		//console.log('message: ' + data);
		messageAndUser(socket.username, data, 'general');	//send to clien to add in message body
	});

	/*
	if someone leave the chat server
	we first remove the name from the online list and update the client side
	also notice the other member
	*/
	socket.on('disconnect', function(data) {
		if(!socket.username) {	//check the username 
			return;
		}
		onlineList.splice(onlineList.indexOf(socket.username), 1);	//splice the member
		newOnlineList();		//client receive the new online list
		messageAndUser(socket.username, ' just leave.', 'leave');	//notice otheer mambers
	});

});
