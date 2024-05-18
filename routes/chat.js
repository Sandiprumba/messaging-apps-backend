import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  newGroupChat,
  getMyChats,
  getMyGroups,
  addMembers,
  removeMember,
  leaveGroup,
  sendAttachMents,
  getChatDetails,
  renameGroup,
  deleteChat,
  getMessages,
} from "../controllers/chat.js";
import { attachmentsMulter } from "../middlewares/multer.js";
import {
  addMemberValidator,
  chatIdValidator,
  newGroupChatValidator,
  removeMemberValidator,
  renameValidator,
  sendAttachMentsValidator,
  validateHandler,
} from "../lib/validators.js";

const app = express.Router();

app.use(isAuthenticated);

//create new group to chat
app.post("/new", newGroupChatValidator(), validateHandler, newGroupChat);
app.get("/my", getMyChats);
app.get("/my/groups", getMyGroups);

//add members
app.put("/addmembers", addMemberValidator(), validateHandler, addMembers);
app.put("/removemember", removeMemberValidator(), validateHandler, removeMember);

//dynamic routing
app.delete("/leave/:id", chatIdValidator(), validateHandler, leaveGroup);

//send attachment using multer and cloudinary
app.post("/message", attachmentsMulter, sendAttachMentsValidator(), validateHandler, sendAttachMents);

//get messages
app.get("/message/:id", chatIdValidator(), validateHandler, getMessages);
//get chat details, rename , delete
//doing this and below is same
// app.get('/chat/:id',A)
// app.put("/chat/:id", B);
// app.delete("/chat/:id", C);

app
  .route("/:id")
  .get(chatIdValidator(), validateHandler, getChatDetails)
  .put(renameValidator(), validateHandler, renameGroup)
  .delete(chatIdValidator(), validateHandler, deleteChat);

export default app;
