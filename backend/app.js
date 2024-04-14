const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const asyncHander = require("./utility/asyncHandler");
const User = require("./models/User");
const ApiError = require("./utility/ApiError");
const {
  RegisterOptions,
  PasswordlessClient,
} = require("@passwordlessdev/passwordless-nodejs");
const axios = require("axios");
const jwt = require("jsonwebtoken");

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGINS
      ? [...process.env.CORS_ORIGINS.split(",")]
      : null,
    credentials: true,
  })
);

app.use(cookieParser());

app.use(express.json({ limit: "10kb" }));

const _passwordlessClient = new PasswordlessClient(
  process.env.PASSWORDLESS_API_SECRET,
  {}
);

//signup Begin
app.post(
  "/api/v1/signup/begin",
  asyncHander(async (req, res) => {
    let userId;

    if (!req.body.email || !req.body.name) {
      throw new ApiError(400, "Please provide email and name");
    }

    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      if (existingUser.registrationCompleted) {
        throw new ApiError(400, "User with this email already exists");
      } else {
        userId = existingUser.id;
      }
    } else {
      userId = (
        await User.create({ email: req.body.email, name: req.body.email })
      ).id;
    }

    const registerOptions = new RegisterOptions();
    registerOptions.userId = userId;
    registerOptions.username = req.body.email;
    registerOptions.displayName = req.body.name;
    registerOptions.discoverable = true;
    registerOptions.userVerification = "required";
    registerOptions.aliases = [req.body.email];

    const token = await _passwordlessClient.createRegisterToken(
      registerOptions
    );

    res.status(200).json({
      status: "success",
      token: token.token,
      userId,
    });
  })
);

//signup Complete
app.post(
  "/api/v1/signup/complete",
  asyncHander(async (req, res) => {
    const userId = req.body.userId;

    if (!userId) {
      throw new ApiError(400, "userId is required");
    }

    if (
      (
        await axios.post(
          process.env.PASSWORDLESS_API_URL + "/credentials/list",
          { userId },
          {
            headers: {
              "Content-Type": "application/json",
              ApiSecret: process.env.PASSWORDLESS_API_SECRET,
            },
          }
        )
      ).data.values.length === 0
    ) {
      throw new ApiError(400, "Passkey Registration not completed by the user");
    }

    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(400, "User with this userId not found");
    }

    user.registrationCompleted = true;

    await user.save();

    res.status(201).json({
      status: "success",
      auth_token: signToken(userId),
    });
  })
);

//Login
app.post(
  "/api/v1/signin",
  asyncHander(async (req, res) => {
    const token = req.body.token;

    if (!token) {
      throw new ApiError(400, "Please provide token");
    }

    const verifiedUser = await _passwordlessClient.verifyToken(token);

    if (verifiedUser && verifiedUser.success) {
      if (await User.findById(verifiedUser.userId)) {
        res.status(200).json({
          status: "success",
          auth_token: signToken(verifiedUser.userId),
        });
      } else {
        throw new ApiError(401, "User with this email does not exist");
      }
    } else {
      throw new ApiError(401, "Invalid Token");
    }
  })
);

//sign and send JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: +process.env.JWT_EXPIRES_IN,
  });
};

//protect middlewere
const protect = asyncHander(async (req, _, next) => {
  // Check if token is provided
  let token;
  let decoded;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // If token is not provided then return error
  if (!token) {
    throw new ApiError(
      401,
      "You are not logged in! Please log in to get access."
    );
  }
  // Verify token
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      throw new ApiError(401, "Token invalid!");
    }

    throw err;
  }

  // Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    throw new ApiError(
      401,
      "The user belonging to this token does no longer exist."
    );
  }

  // Grant access to protected route
  req.user = currentUser;
  next();
});

//update encrypted string
app.patch(
  "/api/v1/encryptedData",
  protect,
  asyncHander(async (req, res) => {
    const user = req.user;
    const encryptedData = req.body.encryptedData;

    if (!encryptedData) {
      throw new ApiError(400, "encryptedData is required");
    }

    user.encryptedString = encryptedData;

    await user.save();

    res.status(200).json({
      status: "success",
    });
  })
);

//get encrypted string
app.get(
  "/api/v1/encryptedData",
  protect,
  asyncHander(async (req, res) => {
    const user = req.user;

    res.status(200).json({
      status: "success",
      encryptedData: user.encryptedString,
    });
  })
);

app.use("*", (req, res) => {
  res.status(404).json({
    status: "fail",
    message: "Route not found!",
  });
});

module.exports = app;
