import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { v2 as cloudinary } from "cloudinary";
import { getBase64, getSockets } from "../lib/helper.js";

const cookieOptions = { maxAge: 15 * 24 * 60 * 60 * 1000, sameSite: "none", httpOnly: true, secure: true };

//connect mongo db with the db name called lets chat
const connectDB = (uri) => {
  mongoose
    .connect(uri, { dbName: "LetsChat" })
    .then((data) => console.log(`connected to DB: ${data.connection.host}`))
    .catch((err) => {
      throw err;
    });
};

//token setup and expiration or maximum age for associated feature
const sendToken = (res, user, code, message) => {
  console.log(process.env.JWT_SECRET);
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  console.log(token);
  return res.status(code).cookie("chat-app", token, cookieOptions).json({
    success: true,
    user,
    message,
  });
};

//socket event emitter
//we get io from
const emitEvent = (req, event, users, data) => {
  //accessing io value from app.js
  let io = req.app.get("io");
  const usersSocket = getSockets(users);
  io.to(usersSocket).emit(event, data);
};

//CLOUDINARY FOR UPLOADING MEDIA FILES
// base64 is a binary to text encoding scheme that represents binary data such as image audio or other binary files
const uploadFilesToCloudinary = async (files = []) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        getBase64(file),
        {
          resource_type: "auto",
          public_id: uuid(),
        },

        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
    });
  });
  try {
    const results = await Promise.all(uploadPromises);
    const formattedResults = results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));
    return formattedResults;
  } catch (err) {
    throw new Error("Error uploading files to cloudinary", err);
  }
};

const deleteFilesFromCloudinary = async (public_ids) => {};

export { connectDB, sendToken, cookieOptions, emitEvent, deleteFilesFromCloudinary, uploadFilesToCloudinary };
