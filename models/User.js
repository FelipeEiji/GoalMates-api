const { model, Schema } = require("mongoose");

const userSchema = new Schema({
  username: String,
  password: String,
  email: String,
  createdAt: String,
  friends: [
    {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
  ],
});

module.exports = model("User", userSchema);
