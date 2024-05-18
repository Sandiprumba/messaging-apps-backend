import { compare } from "bcrypt";
import { User } from "../models/user.js";
import { cookieOptions, emitEvent, sendToken, uploadFilesToCloudinary } from "../utils/features.js";
import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { Chat } from "../models/chat.js";
import { Request } from "../models/request.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";

//create a new user and save it to database and save token in cookie
const newUser = TryCatch(async (req, res, next) => {
  const { name, username, password, bio } = req.body; //accept data from the body
  const file = req.file;

  if (!file) return next(new ErrorHandler("Please Upload Avatar"));

  //cloudinary upload
  const result = await uploadFilesToCloudinary([file]);

  const avatar = {
    public_id: result[0].public_id,
    url: result[0].url,
  };
  const user = await User.create({ name, username, password, avatar, bio });
  sendToken(res, user, 200, "User created");
  // res.status(201).json({ message: "User created successfully" });)
});

//login user and save token in cookie
const login = TryCatch(async (req, res, next) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).select("+password");
  // return res.status(400).json({ message: "Invalidusername" });
  if (!user) return next(new ErrorHandler("Invalid Username or Password", 404)); // by using middle ware
  const isMatch = await compare(password, user.password);
  if (!isMatch) return next(new ErrorHandler("Invalid Username or Password", 404));
  sendToken(res, user, 200, `welcome back ${user.name}`);
});

//get my profile find user by id user must logged in
const getMyProfile = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user).select("-password");

  if (!user) return next(new ErrorHandler("User not found", 404));
  res.status(200).json({
    success: true,
    user,
  });
});

//logout user by clearing the cookies named chat app from the response
const logout = TryCatch(async (req, res) => {
  return res
    .status(200)
    .cookie("chat-app", "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: "Logged out successfully",
    });
});

//search user chat
const searchUser = TryCatch(async (req, res) => {
  //query by name
  const { name = "" } = req.query;
  //finding all my chats
  const myChats = await Chat.find({ groupChat: false, members: req.user });
  //extracting all users from my chats that i have chatted with
  const allUsersFromMyChats = myChats.flatMap((chat) => chat.members);
  //not in operator in mongo db;
  //finding all user except me and my friends
  const allUsersExceptMeAndFriends = await User.find({
    //nin value is not equal to any of the values in array
    _id: { $nin: allUsersFromMyChats },
    //make the search case insensitive regex specifies the regular expression pattern
    name: { $regex: name, $options: "i" },
  });

  const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({ _id, name, avatar: avatar.url }));

  return res.status(200).json({
    success: true,
    users,
  });
});

//send friend request
const sendFriendRequest = TryCatch(async (req, res, next) => {
  const { userId } = req.body;
  //check whether got request or not
  const request = await Request.findOne({
    //in mongo $or is used to match documents where either of the specified condition is true;
    $or: [
      { sender: req.user, receiver: userId },
      { sender: userId, receiver: req.user },
    ],
  });

  if (request) return next(new ErrorHandler("Request already sent", 400));
  //else create request
  await Request.create({
    sender: req.user,
    receiver: userId, //can use receiver id as well
  });

  emitEvent(req, NEW_REQUEST, [userId]);
  return res
    .status(200)
    .cookie("chat-app", "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: "Friend request sent",
    });
});

const acceptFriendRequest = TryCatch(async (req, res, next) => {
  const { requestId, accept } = req.body;

  const request = await Request.findById(requestId).populate("sender", "name").populate("receiver", "name");

  console.log(request);
  if (!request) return next(new ErrorHandler("Request not found", 404));

  if (request.receiver._id.toString() !== req.user.toString()) return next(new ErrorHandler("You are not authorized to accept this request", 404));

  if (!accept) {
    await request.deleteOne();
    return res.status(200).json({
      success: true,
      message: "Friend Request Rejected",
    });
  }

  const members = [request.sender._id, request.receiver._id];

  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name} - ${request.receiver.name}`,
    }),
    request.deleteOne(),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: " Friend Request Accepted",
    senderId: request.sender._id,
  });
});

const getMyNotifications = TryCatch(async (req, res) => {
  const requests = await Request.find({ receiver: req.user }).populate("sender", "name avatar");

  const allRequests = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));
  return res.status(200).json({
    success: true,
    allRequests,
  });
});

//get the chat friend or friend with chat id and all the friends of the users
const getMyFriends = TryCatch(async (req, res) => {
  const chatId = req.query.chatId;
  // find chats where the current user is a member and the chat is not a group chat
  const chats = await Chat.find({
    members: req.user,
    groupChat: false,
  }).populate("members", "name avatar");

  console.log("chats", chats);

  const friends = chats.map(({ members }) => {
    console.log("members", members);
    const otherUser = getOtherMember(members, req.user);
    console.log("other users", otherUser);

    return {
      _id: otherUser._id,
      name: otherUser.name,
      avatar: otherUser.avatar.url,
    };
  });
  console.log("friends", friends);

  if (chatId) {
    const chat = await Chat.findById(chatId);
    console.log("chatid", chatId);

    const availableFriends = friends.filter((friend) => !chat.members.includes(friend._id));
    return res.status(200).json({
      success: true,
      friends: availableFriends,
    });
  } else {
    return res.status(200).json({
      success: true,
      friends,
    });
  }
});

export { login, newUser, getMyProfile, logout, searchUser, sendFriendRequest, acceptFriendRequest, getMyNotifications, getMyFriends };
