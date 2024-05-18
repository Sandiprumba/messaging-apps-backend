//middleware for error handling

//used in app.js end
const errorMiddleWare = (err, req, res, next) => {
  err.message ||= "Internal server Error";
  err.statusCode ||= 500;

  //code error
  if (err.code === 11000) {
    const error = Object.keys(err.keyPattern).join(",");
    err.message = `Duplicate field - ${error}`;
    err.statusCode = 400;
  }

  //manipulate the error
  if (err.name === "CastError") {
    const errorPath = err.path;
    err.message = `Invalid Format of Path ${errorPath}`;
    err.statusCode = 400;
  }
  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};

//when i call trycatch function in other function and pass data passedFunc will receive the data
const TryCatch = (passedFunc) => async (req, res, next) => {
  try {
    await passedFunc(req, res, next);
  } catch (error) {
    next(error);
  }
};

export { errorMiddleWare, TryCatch };
