const ApiError = require("./ApiError");

const asyncHander = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => {
      let statusCode = 500;
      let errType;
      let message = "Something Went Wrong!";
      const isOperationalError = err instanceof ApiError;

      if (isOperationalError) {
        statusCode = err.statusCode;
        message = err.message;
        errType = err.errorType;
      }

      const errorBody = {
        status: "fail",
        message: message,
      };

      if (errType) {
        errorBody.errType = errType;
      }

      if (!isOperationalError && process.env.NODE_ENV === "development") {
        errorBody.stack = err.stack;
      }

      if (!isOperationalError) {
        if (process.env.NODE_ENV === "development") {
          errorBody.stack = err.stack;
        }
      }

      res.status(statusCode).json(errorBody);
    });
  };
};

module.exports = asyncHander;
