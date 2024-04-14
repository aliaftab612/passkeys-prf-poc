const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

const app = require("./app");
const mongoose = require("mongoose");

mongoose
  .connect(process.env.DATABASE)
  .then(() => {
    console.log("Database Connected");
    startExpressServer();
  })
  .catch((err) => {
    console.log("Database Connection error : ", err);
    process.exit(1);
  });

const port = process.env.PORT || 3000;

const startExpressServer = () => {
  app.listen(port, () => {
    console.log("Server listening on port", port);
  });
};
