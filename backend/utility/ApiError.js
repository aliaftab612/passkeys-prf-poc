class ApiError extends Error {
  constructor(statusCode, errMsg, errorType) {
    super(errMsg);
    this.statusCode = statusCode;
    this.errorType = errorType;
  }
}

module.exports = ApiError;
