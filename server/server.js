const path = require('path');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const publicPath = path.join(__dirname,'../public');
const {generateMessage,generateLocationMessage} = require('./utils/message');
const port = process.env.PORT || 3000 ;
const bodyParser = require('body-parser');
const Pusher = require('pusher');


const {isRealString} = require('./utils/validation.js');
const {Users} = require('./utils/users.js');
var app = express();
app.use(express.static(publicPath));
// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Session middleware




var server = http.createServer(app);
var io =  socketIO(server);
var users = new Users();






var pusher = new Pusher({
  appId: '690649',
  key: '35b318457f2a86724d57',
  secret: 'c78033715aa6d831b0c1',
  cluster: 'ap2',
  encrypted: true
});

app.get('/startVideoChat', (req, res) => {
  return res.sendFile(__dirname + '/videoChat.html');
});


app.post("/pusher/auth", (req, res) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  var presenceData = {
    user_id:
      Math.random()
        .toString(36)
        .slice(2) + Date.now()
  };
  const auth = pusher.authenticate(socketId, channel, presenceData);
  res.send(auth);
});



io.on('connection',(socket) => {
  console.log('new user connected');

  // socket.emit('newEmail',{
  //   from : 'monisha@traform.com',
  //   text : 'Hey, Whats going on',
  //   createAt : 123
  // });
  //
  //
  // socket.emit('newMessage',{
  //   from : 'monisha@traform.com',
  //   text : 'Hey, Whats going on',
  //   createdAt : 1234
  // });


//listener
  socket.on('createEmail',(newEmail) => {
    console.log('createEmail',newEmail);
  });



  socket.on('join',(params,callback) => {
    if(!isRealString(params.name) || !isRealString(params.room)){
      callback('Name and Room are required field.')
    }
    socket.join(params.room);
    users.removeUser(socket.id);
    users.addUser(socket.id,params.name,params.room);


    io.to(params.room).emit('updateUserList',users.getUserList(params.room));
    socket.emit('newMessage',generateMessage('Bhanu','Welcome to the chat app. bhanu loves to hear from you.'));
    socket.broadcast.to(params.room).emit('newMessage',generateMessage('Bhanu',`${params.name} has joined.`));


    callback();
  });

  socket.on('createMessage',(message,callback) => {
    var user = users.getUser(socket.id);
    if(user && isRealString(message.text)){
      io.to(user.room).emit('newMessage',generateMessage(user.name,message.text));

    }

    callback('This is from server to acknowledge');

  });

  socket.on('createLocationMessage',(coords,callback) => {
    var user = users.getUser(socket.id);
    if(user){
      io.to(user.room).emit('newLocationMessage',generateLocationMessage(user.name,coords.latitude , coords.longitude));
    }
    callback('This is from server to acknowledge');
  });

  socket.on('disconnect', () => {
    console.log('user is disconnected');
    var user = users.removeUser(socket.id);
    if(user){
      io.to(user.room).emit('updateUserList',users.getUserList(user.room));
      io.to(user.room).emit('newMessage',generateMessage('Bhanu', `${user.name} has left conversation.`));
    }

  });

  socket.on('updateUserList',function(users){

  })

});


server.listen(port);
