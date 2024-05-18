//import express module that creates express application which you can define route and handle http requests.
import express from "express";
import { login, newUser, getMyProfile, logout, searchUser, sendFriendRequest, acceptFriendRequest, getMyNotifications, getMyFriends } from "../controllers/user.js";
import { singleAvatar } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { acceptRequestValidator, loginValidator, registerValidator, sendRequestValidator, validateHandler } from "../lib/validators.js";

//this creates the instance of an express router
const app = express.Router();

//this defines a route for handling get requests to the root URL the second argument ais a call back function the takes two parameters request the object and res the object
// app.get("/", (req, res) => {
//   res.send("Hello World");
// });
//import from controller lke this
//use the middleware as well

app.post("/new", singleAvatar, registerValidator(), validateHandler, newUser);
app.post("/login", loginValidator(), validateHandler, login);

//authenticate for the specific user
app.use(isAuthenticated);
//after here user must be logged in to access the routes
app.get("/me", getMyProfile);
app.get("/logout", logout);

//search user
app.get("/search", searchUser);
//send friend request
app.put("/sendrequest", sendRequestValidator(), validateHandler, sendFriendRequest);

app.put("/acceptrequest", acceptRequestValidator(), validateHandler, acceptFriendRequest);

app.get("/notifications", getMyNotifications);

//users friends
app.get("/friends", getMyFriends);

export default app;

//actual url http://localhost:3000/user
