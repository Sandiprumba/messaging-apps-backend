import multer from "multer";

const multerUpload = multer({
  limits: {
    fileSize: 1024 * 1024 * 5,
  },
});

const singleAvatar = multerUpload.single("avatar");

const attachmentsMulter = multerUpload.array("files", 5);

export { singleAvatar, attachmentsMulter };

//if i didnt write singleAvatar with the name of the specific element then it will give error
// app.post("/new", multerUpload.single("avatar"), newUser);

//now we can write this way
//app.post('/new',singleAvatar,newUser)

//multer is used to access the form data
