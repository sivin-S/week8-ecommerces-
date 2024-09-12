// userRouter.js
const express = require("express");
const router = express.Router();
const passport = require("passport");
const mongoose = require("mongoose");

const {
    isUserLogin,
    preventAutoLogin,
    preventUserAutoLogin,
} = require("../middleware");

const userController = require("../controllers/userController");
const cartController = require("../controllers/cartController");
const productController = require("../controllers/productController");
const authController = require("../controllers/authController");

router.use(express.urlencoded({ extended: true }));

// Google auth start
router.get("/auth/google", authController.googleAuth);
router.get("/auth/google/callback", authController.googleAuthCallback);

// Google auth end
router.get("/", productController.getProducts);
router.get("/productDetails/:id", productController.getProductDetails);
router.get("/cart", isUserLogin, cartController.getCart);
router.get("/removeProductFromCart/:productId", isUserLogin, cartController.removeProductFromCart);
router.get("/emailOtpVerification", (req, res) => res.render("emailVerification.ejs"));
router.get("/wishlist", isUserLogin, userController.getWishlist);
router.get("/wishlist/add/:productId", isUserLogin, userController.addToWishlist);
router.get("/wallet", isUserLogin, (req, res) => res.render("wallet.ejs"));
router.get("/orderhistory", isUserLogin, userController.getOrderHistory);
router.get("/orderhistory/details/:id", isUserLogin, userController.getOrderOneHistory);
router.get("/cancelOrder/:id", isUserLogin, userController.getOrderCancel);
router.get("/shop", productController.getShop);
router.get("/checkOut", isUserLogin, userController.getCheckout);
router.get("/contact", isUserLogin, (req, res) => res.render("contact.ejs"));
router.get("/profile", isUserLogin, userController.getProfile);
router.get("/login", preventUserAutoLogin, userController.loginUserPage);
router.get("/signup", (req, res) => res.render("signup.ejs"));
router.get("/logout", authController.logout);

router.post("/resetPassword", isUserLogin, userController.resetPassword);
router.post("/checkout", isUserLogin, userController.checkout);
router.post("/addToCart", isUserLogin, cartController.addToCart);
router.post("/addToCartFromWishlist", isUserLogin, userController.addToCartFromWishlist);
router.post("/editAddress", isUserLogin, userController.editAddress);
router.post("/request-otp", authController.sendOtp);
router.post("/wishlist/productRemove", isUserLogin, userController.removeFromWishlist);
router.post("/sendOtp", authController.sendOtp);
router.post("/verifyOtp", authController.verifyOtp);
router.post("/resetOtp", authController.resetOtp);
router.post("/login", authController.login);
router.post("/updateCart", cartController.updateCart);
router.post("/addAddress", isUserLogin, userController.addAddress);
router.post("/checkOutStatus", isUserLogin, userController.updateCheckoutStatus);
router.post("/signup", authController.signup);

module.exports = router;
