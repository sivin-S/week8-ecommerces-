const express = require("express");
const path = require("path");
const session = require("express-session");
const fileUpload = require("express-fileupload");
const passport = require('passport');
const flash = require('connect-flash');
require("dotenv").config();
require('./config/connectDb');
require('./config/passportConfig'); 

const app = express();

// Setup view engine
app.set("view engine", "ejs");


// Middleware
// app.use(express.urlencoded({ extended: true, limit: '10mb', parameterLimit: 10000 }));
app.use(express.json({ limit: '10mb' }));
app.use(flash());
// app.use(fileUpload({
//     createParentPath: true,
//     limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit per file
// }));

// Static files
app.use("/", express.static(path.join(__dirname, "/public/user")));
app.use('/uploads', express.static(path.join(__dirname, "/uploads")));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || "defaultSecretKey",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 3600000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
}));

// Flash middleware
app.use((req, res, next) => {
    res.locals.successMessage = req.flash('success');
    res.locals.errorMessage = req.flash('error');
    next();
});

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routers
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");


app.use("/", userRouter);
app.use("/admin", adminRouter);


// Set up views
app.set("views", [
    path.join(__dirname, "views/user"),
    path.join(__dirname, "views/admin"),
    // path.join(__dirname, "views/shared")
]);

// 404 error handler
app.use((req, res, next) => {
    res.status(404).render("404Page.ejs");
});

// // General error handler for dev 
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Something broke!');
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
