const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { UserInputError } = require("apollo-server");

const {
  validateRegisterInput,
  validateLoginInput,
} = require("../../util/validators");
const { SECRET_KEY } = require("../../config");
const User = require("../../models/User");
const checkAuth = require("../../util/check-auth");

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
    },
    SECRET_KEY,
    { expiresIn: "1h" }
  );
}

module.exports = {
  Query: {
    async getUsers(parent, _) {
      try {
        const users = await User.find({});
        console.log(users);
        return users;
      } catch (err) {
        throw new Error(err);
      }
    },
    async getUser(parent, { userId }) {
      try {
        const user = await User.findById(userId).populate("users").exec();
        if (user) {
          return user;
        } else {
          throw new Error("User not found");
        }
      } catch (err) {
        throw new Error(err);
      }
    },
  },
  Mutation: {
    async login(parent, { username, password }) {
      const { errors, valid } = validateLoginInput(username, password);

      if (!valid) {
        throw new UserInputError("Errors", { errors });
      }

      let user = await User.findOne({ username });

      if (!user) {
        const email = username;
        user = await User.findOne({ email });
      }

      if (!user) {
        errors.general = "User not found";
        throw new UserInputError("Wrong credentials", { errors });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        errors.general = "Wrong credentials";
        throw new UserInputError("Wrong credentials", { errors });
      }

      const token = generateToken(user);

      return {
        ...user._doc,
        id: user._id,
        token,
      };
    },
    async register(
      parent,
      { registerInput: { username, email, password, confirmPassword } },
      context,
      info
    ) {
      //TODO : Validate user data
      const { valid, errors } = validateRegisterInput(
        username,
        email,
        password,
        confirmPassword
      );
      if (!valid) {
        throw new UserInputError("Errors", { errors });
      }
      //TODO : Make sure user doesnt already exist
      const user = await User.findOne({ username });
      if (user) {
        throw new UserInputError("Username is taken", {
          errors: {
            username: "This username is taken?",
          },
        });
      }
      //TODO : hash password and create an auth token
      password = await bcrypt.hash(password, 12);

      const newUser = new User({
        email,
        username,
        password,
        createdAt: new Date().toISOString(),
      });

      const res = await newUser.save();

      const token = generateToken(res);

      return {
        ...res._doc,
        id: res._id,
        token,
      };
    },

    async addFriend(parent, { userId }, context) {
      const { id } = checkAuth(context);
      const user = await User.findById(id);
      const friend = await User.findById(userId);
      if (friend) {
        user.friends.push(friend);
      } else throw new UserInputError("Sem amigos");
      await user.save();
      return user;
    },
  },
};
