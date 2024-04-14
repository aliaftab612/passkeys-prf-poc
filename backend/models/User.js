const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      unique: [true, "Duplicate username not allowed!"],
      required: [true, "Email is required!"],
      validate: {
        validator: (value) => validator.isEmail(value),
        message: "Invalid email!",
      },
    },
    registrationCompleted: {
      type: Boolean,
      default: false,
    },
    encryptedString: String,
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
