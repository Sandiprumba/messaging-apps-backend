import express from "express";
import { connectDB } from "./utils/features.js";
import dotenv from "dotenv";
import { errorMiddleWare } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { createServer } from "http";
import { v4 as uuid } from "uuid";
import { getSockets } from "./lib/helper.js";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import { CHAT_JOINED, CHAT_LEAVED, NEW_MESSAGE, NEW_MESSAGE_ALERT, ONLINE_USERS, START_TYPING, STOP_TYPING } from "./constants/events.js";
import { Message } from "./models/message.js";
import { corsOptions } from "./constants/config.js";
import { socketAuthenticator } from "./middlewares/auth.js";

import userRoute from "./routes/user.js";
import chatRoute from "./routes/chat.js";
import adminRoute from "./routes/admin.js";

//THIS IS BACKEND HAHA WROTE IT CAUSE I AM HAVING ISSUE WITH GIT HUB
// import { createGroupMessages, createMessagesInAChat, createSingleChats } from "./seeders/chat.js";

dotenv.config({
  path: "./.env",
});
//connect mongo db
const mongoURI = process.env.MONGO_URI;
const port = process.env.PORT || 3000;
const adminSecretKey = process.env.ADMIN_SECRET_KEY || "helloadminkey";
//socket io
//Map is a built in data structure that allows you to store key value pairs where both the keys and values can be of any type
//it initializes an empty map to store user id for real time communications
//TO MAP USER IDS TO THEIR CORRESPONDING SOCKET IDS .. TO RETRIEVE THE SOCKET ID ASSOCIATED WITH A SPECIFIC USER
const userSocketIDs = new Map();
//TO KEEP TRACK OF WHICH USERS ARE CURRENTLY ONLINE /.. WEHN A USER CONNECTS TO THE APPLICATION
const onlineUsers = new Set();
connectDB(mongoURI);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// createSingleChats(10);
// createGroupMessages(10);
// createMessagesInAChat("66019d2e4aeb2484fc3739a1", 50);

const app = express();
//create server from http
const server = createServer(app);
//server socket set up
const io = new Server(server, { cors: corsOptions });

//save the value of io
app.set("io", io);

//middleware

app.use(express.json()); //to access json data
// app.use(express.urlencoded()); //to access form data ..
app.use(cookieParser());
app.use(cors(corsOptions));

//http://localhost:3000/user
app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", adminRoute);

app.get("/", (req, res) => {
  res.send("Hello World");
});

//middleware for socket user authentications
//access token using cookie parser connect from frontend
io.use((socket, next) => {
  cookieParser()(socket.request, socket.request.res, async (err) => {
    await socketAuthenticator(err, socket, next);
  });
});

//an event listener when user connects tor disconnect
//"room1"
io.on("connection", (socket) => {
  const user = socket.user;

  //SET IS USED TO ADD OR UPDATE A KEY VALUE PAIR IN A MAP OBJECT IN JAVASCRIPT ..HERE SNIPPET USERSOCKETIDS IS WHERE I AM STORING SOCKET IDS KEYED BY USER IDS ..
  userSocketIDs.set(user._id.toString(), socket.id);

  //user currently active

  //create events
  //receive data from the clients
  //members holds the id o fal the user
  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    //message for real time... create message
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };

    //message for db...save message in db
    const messageForDB = {
      content: message,
      sender: user._id,
      chat: chatId,
    };

    //decide whom to send the message
    const membersSocket = getSockets(members);
    //event emit
    io.to(membersSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });
    io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });
    try {
      await Message.create(messageForDB);
    } catch (error) {
      throw new Error(error);
    }
  });

  //socket listener for typing messages
  //evnt emitted from frontend and listened in backend
  socket.on(START_TYPING, ({ members, chatId }) => {
    //to know who is typing
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(START_TYPING, { chatId });
  });

  //stop typing event backend
  socket.on(STOP_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(STOP_TYPING, { chatId });
  });

  //add events to display users status
  socket.on(CHAT_JOINED, ({ userId, members }) => {
    onlineUsers.add(userId.toString());

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });
  socket.on(CHAT_LEAVED, ({ userId, members }) => {
    onlineUsers.delete(userId.toString());

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on("disconnect", () => {
    userSocketIDs.delete(user._id.toString());
    onlineUsers.delete(user.id.toString());
    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
  });
});

app.use(errorMiddleWare);

server.listen(port, () => {
  console.log(`Server is running on port ${port} `);
});

export { adminSecretKey, userSocketIDs };

//this is all written inside controller
// const scsd =
//   ("/",
//   (req, res) => {
//     res.send("Hello World");
//   });
// this is written inside the routes
// app.get("/", scsd);
