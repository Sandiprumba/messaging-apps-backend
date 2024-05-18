import { userSocketIDs } from "../app.js";

//find the other participant in a converstion or chat
export const getOtherMember = (members, userId) => {
  return members.find((member) => member._id.toString() !== userId.toString());
};

//socket io

export const getSockets = (users = []) => {
  const sockets = users.map((user) => userSocketIDs.get(user.toString()));
  return sockets;
};

//convert the file to base64 encoded string before uploading to cloudinary
//converting to base64 allows binary data such as images or other files to be transmitted over test based protocols such as http without corruption
export const getBase64 = (file) => `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
