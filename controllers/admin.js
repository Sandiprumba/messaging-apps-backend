import jwt from "jsonwebtoken";
import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { ErrorHandler } from "../utils/utility.js";
import { cookieOptions } from "../utils/features.js";
import { adminSecretKey } from "../app.js";

//only logged in admin can see the dashboard data
const adminLogin = TryCatch(async (req, res, next) => {
  const { secretKey } = req.body;

  const isMatched = secretKey === adminSecretKey;

  if (!isMatched) return next(new ErrorHandler("Invalid Admin Key", 401));

  const token = jwt.sign(secretKey, adminSecretKey);
  //set the cookie time for 15 minutes
  return res
    .status(200)
    .cookie("chat-app-admin-token", token, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 15,
    })
    .json({
      success: true,
      message: "Authenticated successfully, Welcome RANMATI",
    });
});

//logout admin
const adminLogout = TryCatch(async (req, res, next) => {
  return res
    .status(200)
    .cookie("chat-app-admin-token", "", {
      ...cookieOptions,
      maxAge: 0,
    })
    .json({
      success: true,
      message: "Logged Out Successfully",
    });
});

//get admin data
const getAdminData = TryCatch(async (req, res, next) => {
  return res.status(200).json({
    admin: true,
  });
});

//retrieve all users from the database and for each user..
const allUsers = TryCatch(async (req, res) => {
  //retrieve all the users from db without any filtering conditions
  const users = await User.find({});

  //transform the user
  const transformUser = await Promise.all(
    users.map(async ({ name, username, avatar, _id }) => {
      //mongo method to count the documents in the collection
      //group count fetch the group chat
      const [groups, friends] = await Promise.all([
        Chat.countDocuments({
          groupChat: true,
          members: _id,
        }),
        //individual chat of the user
        Chat.countDocuments({ groupChat: false, members: _id }),
      ]);
      return {
        name,
        username,
        avatar: avatar.url,
        _id,
        groups,
        friends,
      };
    })
  );

  return res.status(200).json({
    status: "success",
    users: transformUser,
  });
});

//fetch all the chats of the user admin..with whom chatted with
const allChats = TryCatch(async (req, res) => {
  const chats = await Chat.find({}).populate("members", "name avatar").populate("creator", "name avatar");

  const transformedChat = await Promise.all(
    chats.map(async ({ members, _id, groupChat, name, creator }) => {
      const totalMessages = await Message.countDocuments({ chat: _id });
      return {
        _id,
        groupChat,
        name,
        avatar: members.slice(0, 3).map((member) => member.avatar.url),
        members: members.map(({ _id, name, avatar }) => ({
          _id,
          name,
          avatar: avatar.url,
        })),
        creator: {
          name: creator?.name || "none",
          avatar: creator?.avatar.url || "",
        },
        totalMembers: members.length,
        totalMessages,
      };
    })
  );

  return res.status(200).json({
    status: "success",
    chats: transformedChat,
  });
});

//retrieve all the messages from database name avatar chat and groupchat
const allMessages = TryCatch(async (req, res) => {
  const messages = await Message.find({}).populate("sender", "name avatar").populate("chat", "groupChat");

  const transformedMessages = messages.map(({ content, attachments, _id, sender, createdAt, chat }) => {
    const transformedMessage = {
      _id,
      attachments,
      content,
      createdAt,
      chat: chat._id,
      groupChat: chat.groupChat,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar.url,
      },
    };
    return transformedMessage;
  });
  return res.status(200).json({
    success: true,
    messages: transformedMessages,
  });
});

const getDashboardStats = TryCatch(async (req, res) => {
  const [groupsCount, usersCount, messagesCount, totalChatsCount] = await Promise.all([
    Chat.countDocuments({ groupChat: true }),
    User.countDocuments(),
    Message.countDocuments(),
    Chat.countDocuments(),
  ]);

  //last seven days messages
  //create a new day object representing current date and time
  const today = new Date();
  //create a new Date object representing the date and time 7 days ago from the current date
  const last7Days = new Date();
  //calculate 7 days ago by substracting 7 from the day og the month of the last7days date object
  //   this holds the last 7 days date
  //getDate holds current date and - 7 will - 7 days and the value is set to setDate
  last7Days.setDate(last7Days.getDate() - 7);

  //find method is used to find the documents in the Message collection
  //mongo query operator for greater than or equal to
  //mongo query operator for less than or equal to
  //.select specifies that only createdAt field should be returned for the matched messages
  const last7daysMessages = await Message.find({
    createdAt: {
      $gte: last7Days,
      $lte: today,
    },
  }).select("createdAt");

  //create an array named messages with a length of 7 and fill each element with value 0
  //this represents the last 7 days or 7 days with 0 representing today and 6 representing 6 days ago
  const messages = new Array(7).fill(0);
  //calculate the number of milisecond in a day
  const dayInMiliSeconds = 1000 * 60 * 60 * 24;

  //iterates over each message in the last&days messages
  last7daysMessages.forEach((message) => {
    //this calculates an approximate index for the message based on the difference between the current date and the messages creation date divided by the number of mili sec in a dat .. THIS GIVES THE NUMBER OF DAYS AGO THE MESSAGE WAS CREATED ...
    const indexApprox = (today.getTime() - message.createdAt.getTime()) / dayInMiliSeconds;
    //this rounds down the approximnate index to get the actual index in the message array
    const index = Math.floor(indexApprox);
    //this increments the element in the messages array corresponding to the calculated index. the formula 6 -index is used to reverse the order of elements in the array as the array is initialized to represent the last 7 days
    //  expression 6- is used to reverse the order of the indexing in the message array so that the count for each day aligns with the corresponding index in the array ...
    messages[6 - index]++;
  });

  const stats = {
    groupsCount,
    usersCount,
    messagesCount,
    totalChatsCount,
    messagesChart: messages,
  };
  return res.status(200).json({
    success: true,
    stats,
  });
});
export { allUsers, allChats, allMessages, getDashboardStats, adminLogin, adminLogout, getAdminData };
