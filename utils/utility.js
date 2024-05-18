class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

export { ErrorHandler };

//this error handler to use inside the controller to handle the errror
