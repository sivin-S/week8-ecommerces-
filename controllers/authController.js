const bcrypt = require("bcrypt");
const crypto = require("crypto");
const passport = require("passport");
const User = require("../model/dbUserSchema");
const sendMail = require("../mailer");

const generateOtp = () => {
  return crypto.randomBytes(3).toString("hex");
};

exports.googleAuth = passport.authenticate("google", { scope: ["profile", "email"] });

exports.googleAuthCallback = passport.authenticate("google", { failureRedirect: "/login" }), async (req, res) => {
  req.session.email = req.user.email;
  const user = await User.find({ email: req.session.email });
  req.session.userStatus = true;
  req.session.userId = user[0]._id;
  res.redirect("/");
};

exports.login = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: req.body.email });
    if (user && (await bcrypt.compare(req.body.password, user.password))) {
      req.session.email = email;
      req.session.userStatus = true;
      req.session.userId = user._id;
      res.redirect('/');
    } else {
      req.flash('error', "Invalid email or password");
      res.redirect('/login');
    }
  } catch (err) {
    console.error("Error during login:", err);
    req.flash('error', err.message);
    res.status(500).render("login");
  }
};

exports.signup = async (req, res) => {
  try {
    const isUserExist = await User.findOne({ email: req.body.email });
    if (isUserExist) {
      return res.status(400).render("signup.ejs", { err: "User already exists" });
    } else {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const address = new Address({
        username: req.body.username,
        phone: req.body.phone,
        email: req.body.email,
        state: req.body.state,
        zip: req.body.zip,
        country: req.body.country,
        landmark: req.body.landmark,
        locality: req.body.locality
      });
      const savedAddress = await address.save();
      const user = new User({
        email: req.body.email,
        password: hashedPassword,
        username: req.body.username,
        age: req.body.age,
        gender: req.body.gender,
        addresses: [savedAddress._id]
      });
      await user.save();
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60000); // OTP expires in 10 minutes
      await User.updateOne({ email: req.body.email }, { otp: { code: otp, expiresAt } });
      await sendMail(req.body.email, "Your OTP Code", `Your OTP code is ${otp}. It will expire in 10 minutes.`);
      console.log(`Signup successful. OTP sent to ${req.body.email}`);
      res.render("otpVerification.ejs", { email: req.body.email });
    }
  } catch (err) {
    console.error("Error during signup:", err);
    res.status(307).redirect("/signup");
  }
};

exports.logout = (req, res) => {
  req.session.destroy(function (err) {
    if (!err) {
      res.clearCookie("connect.sid");
      res.redirect("/");
    } else {
      return res.status(500).send("Failed to destroy session");
    }
  });
};

exports.sendOtp = async (req, res) => {
  const email = req.body.email;
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60000); // OTP expires in 10 minutes
  try {
    await User.updateOne({ email }, { otp: { code: otp, expiresAt } });
    await sendMail(email, "Your OTP Code", `Your OTP code is ${otp}. It will expire in 10 minutes.`);
    console.log(`OTP sent to ${email}`);
    res.render("otpVerification.ejs", { email });
  } catch (error) {
    console.error(`Error sending OTP to ${email}:`, error);
    res.status(500).send("Error sending OTP");
  }
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (user && user.otp.code === otp.trim() && user.otp.expiresAt > new Date()) {
    req.session.email = email;
    req.session.userStatus = true;
    req.session.userId = user._id;
    res.render('login.ejs');
  } else {
    res.status(400).render("otpVerification.ejs", { email, err: "Invalid or expired OTP" });
  }
};

exports.resetOtp = async (req, res) => {
  const email = req.body.email;
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60000); // OTP expires in 10 minutes
  await User.updateOne({ email }, { otp: { code: otp, expiresAt } });
  await sendMail(email, "Your OTP Code", `Your OTP code is ${otp}. It will expire in 10 minutes.`);
  res.render("otpVerification.ejs", { email });
};
