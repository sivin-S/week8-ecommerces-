// userRouter.js
const express = require("express");
const router = express.Router();
const passport = require("passport");
const mongoose = require("mongoose");

const {
    isUserLogin,
    preventAutoLogin,
    preventUserAutoLogin,
    checkUserBlocked
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
router.get("/cart", isUserLogin,checkUserBlocked, cartController.getCart);
router.get("/removeProductFromCart/:productId", isUserLogin,checkUserBlocked , cartController.removeProductFromCart);
router.get("/emailOtpVerification", (req, res) => res.render("emailVerification.ejs"));
router.get("/wishlist", checkUserBlocked, isUserLogin, userController.getWishlist);
router.get("/wishlist/add/:productId", checkUserBlocked, isUserLogin, userController.addToWishlist);
router.get("/wallet", isUserLogin, checkUserBlocked,  (req, res) => res.render("wallet.ejs"));
router.get("/orderhistory", isUserLogin, checkUserBlocked, userController.getOrderHistory);
router.get("/orderhistory/details/:id", isUserLogin, checkUserBlocked, userController.getOrderOneHistory);
router.get("/cancelOrder/:id", isUserLogin, checkUserBlocked, userController.getOrderCancel);
router.get("/shop", productController.getShop);
// router.get('/getVariantDetails/:variantId', productController.getVariantDetails);
router.get("/filterVariant", productController.filterVariant);

router.get("/checkOut", isUserLogin, checkUserBlocked, userController.getCheckout);
router.get("/contact", isUserLogin, checkUserBlocked, (req, res) => res.render("contact.ejs"));
router.get("/profile", isUserLogin, checkUserBlocked, userController.getProfile);
router.get("/login", preventUserAutoLogin, checkUserBlocked, userController.loginUserPage);
router.get("/signup", (req, res) => res.render("signup.ejs"));
router.get("/logout", authController.logout);

router.post("/resetPassword", checkUserBlocked, isUserLogin, userController.resetPassword);
router.post("/checkout", isUserLogin, checkUserBlocked, userController.checkout);
router.post("/addToCart", isUserLogin, checkUserBlocked, cartController.addToCart);
router.post("/addToCartFromWishlist", isUserLogin, checkUserBlocked,userController.addToCartFromWishlist);
router.post("/editAddress", isUserLogin, checkUserBlocked, userController.editAddress);
router.post("/deleteAddress", isUserLogin, checkUserBlocked, userController.deleteAddress);
router.post("/updateProfile", isUserLogin, checkUserBlocked, userController.updateProfile);
router.post("/request-otp", authController.sendOtp);
router.post("/wishlist/productRemove", isUserLogin, userController.removeFromWishlist);
router.post("/sendOtp", authController.sendOtp);
router.post("/verifyOtp", authController.verifyOtp);
router.post("/resetOtp", authController.resetOtp);
router.post("/login", authController.login);

router.post("/updateQuantity", isUserLogin, checkUserBlocked, cartController.updateQuantity);



router.post("/addAddress", isUserLogin, checkUserBlocked, userController.addAddress);
router.post("/checkOutStatus", isUserLogin, checkUserBlocked, userController.updateCheckoutStatus);
router.post("/signup", authController.signup);

module.exports = router;
