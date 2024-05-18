import mongoose, { Schema, model } from "mongoose";
import { hash } from "bcrypt";

const schema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    //select false means password wouldnt be visible
    password: {
      type: String,
      required: true,
      select: false,
    },
    bio: {
      type: String,
      required: true,
    },
    //in this case avatar contains both the public id and url of the users avatar
    avatar: {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
  },
  //this will automatically create created at and all
  {
    timestamps: true,
  }
);

//hash password using pre method to hash the pasword from bcrypt
// we use isModified method to check whether a particular field
schema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await hash(this.password, 10);
});

export const User = mongoose.models.User || model("User", schema);
