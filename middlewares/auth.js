import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import { TryCatch } from "./error.js";
import { adminSecretKey } from "../app.js";
import { CHAT_TOKEN } from "../constants/config.js";
import { User } from "../models/user.js";

const isAuthenticated = TryCatch((req, res, next) => {
  // console.log("cookie:", req.cookies["chat-app"]);

  const token = req.cookies[CHAT_TOKEN];

  if (!token) return next(new ErrorHandler("Please login to access this route", 401));

  const decodedData = jwt.verify(token, process.env.JWT_SECRET);

  req.user = decodedData._id;
  // console.log(decodedData);

  next();
});

const adminOnly = (req, res, next) => {
  const token = req.cookies["chat-app-admin-token"];

  if (!token) return next(new ErrorHandler("Only Admin can access this route", 401));

  const secretKey = jwt.verify(token, process.env.ADMIN_SECRET_KEY);

  const isMatched = secretKey === adminSecretKey;
  if (!isMatched) return next(new ErrorHandler("Only Admin can access this route", 401));
  next();
};

//middleware..authentication for socket connections by verifying jwt token stored un cookies and attaching authenticated user information to the socket object for further processing...
const socketAuthenticator = async (err, socket, next) => {
  try {
    if (err) return next(err);

    const authToken = socket.request.cookies[CHAT_TOKEN];

    if (!authToken) return next(new ErrorHandler("Please login to access this route", 401));
    const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);

    const user = await User.findById(decodedData._id);

    if (!user) return next(new ErrorHandler("Please login to access this route", 401));
    socket.user = user;
    return next();
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Please login to acces this route", 401));
  }
};

export { isAuthenticated, adminOnly, socketAuthenticator };

// const token = await req.cookies["chat-app"];

// if (!token) return next(new ErrorHandler("please login to access this route", 401));
// const decodedData = jwt.verify(token, process.env.JWT_SECRET);

// console.log(decodedData);
