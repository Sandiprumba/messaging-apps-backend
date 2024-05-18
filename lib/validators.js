import { body, param, validationResult } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

//error to check validator
const validateHandler = (req, res, next) => {
  const errors = validationResult(req);
  const errorMessages = errors
    .array()
    .map((error) => error.msg)
    .join(",");
  console.log(errorMessages);

  if (errors.isEmpty()) return next();
  else next(new ErrorHandler(errorMessages, 404));
};

//validator to validate the credentials of the user when register
const registerValidator = () => [
  body("name", "please enter name").notEmpty(),
  body("username", "please enter username").notEmpty(),
  body("password", "please enter password").notEmpty(),
  body("bio", "please enter bio").notEmpty(),
];

//validation for the credentials when user log in
const loginValidator = () => [body("username", "please enter username").notEmpty(), body("password", "please enter password").notEmpty()];

//when creating group chat it validates the criteria
const newGroupChatValidator = () => [
  body("name", "please enter name").notEmpty(),
  body("members", "please enter members").notEmpty().withMessage("Please Enter Members").isArray({ min: 2, max: 100 }).withMessage("Members must be 2-100"),
];

//validate when adding members in the group
const addMemberValidator = () => [
  body("chatId", "please enter Chat Id").notEmpty(),
  body("members").notEmpty().withMessage("Please Enter Members").isArray({ min: 1, max: 97 }).withMessage("Members must be 1 - 97"),
];

//remove member validator
const removeMemberValidator = () => [
  body("chatId", "please enter Chat Id").notEmpty().withMessage("Chat ID is required"),
  body("userId", "please enter User Id").notEmpty().withMessage("userId is required"),
];
//attachments validator
const sendAttachMentsValidator = () => [body("chatId", "Please Ender Chat ID").notEmpty()];
//leave group validator
// const leaveGroupValidator = () => [param("id", "Please Enter Chat Id").notEmpty()];

//get message validator
// const getMessagesValidator = () => [param("id", "Please Enter Chat Id").notEmpty()];

const chatIdValidator = () => [param("id", "Please Enter Chat ID").notEmpty()];

//rename validator
const renameValidator = () => [param("id", "Please Enter Chat ID").notEmpty(), body("name", "Please Enter new name").notEmpty()];

//send friend request validator
const sendRequestValidator = () => [body("userId", "please Enter User ID").notEmpty()];

const acceptRequestValidator = () => [
  body("requestId", "Please enter request ID").notEmpty(),
  body("accept").notEmpty().withMessage("Please add accept").isBoolean().withMessage("Accept must be boolean"),
];

const adminLodingValidator = () => [body("secretKey", "Please Enter Secret Key").notEmpty()];

export {
  registerValidator,
  validateHandler,
  loginValidator,
  newGroupChatValidator,
  addMemberValidator,
  removeMemberValidator,
  sendAttachMentsValidator,
  chatIdValidator,
  renameValidator,
  sendRequestValidator,
  acceptRequestValidator,
  adminLodingValidator,
};
