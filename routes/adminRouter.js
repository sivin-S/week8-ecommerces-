// adminRouter.js
const express = require("express");
const router = express.Router();
const fileUpload = require("express-fileupload");

const {
    isAdminLogin,
    preventAutoLogin
} = require("../middleware");

const adminController = require("../controllers/adminController");

router.use(express.urlencoded({ extended: true }));
router.use(fileUpload({
    createParentPath: true,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit per file
    },
}));

router.get('/', isAdminLogin, adminController.dashboard);
router.get('/login', preventAutoLogin, adminController.loginPage);
router.get('/products', isAdminLogin, adminController.products);
router.get('/addProducts', isAdminLogin, adminController.addProductsPage);
router.get('/userList', isAdminLogin, adminController.userList);
router.get('/getCoupons', isAdminLogin, adminController.getCoupons);
router.get('/refreshCouponList', isAdminLogin, adminController.refreshCouponList);
// router.get('/toggleUserState/:id', isAdminLogin, adminController.toggleUserState);
router.get('/orderList', isAdminLogin, adminController.orderList);
router.get('/paymentMethods', isAdminLogin, adminController.paymentMethods);
// router.get('/salesReport', isAdminLogin, adminController.salesReport);
router.get('/couponsHistory', isAdminLogin, adminController.couponsHistory);
router.get('/categories', isAdminLogin, adminController.categories);
router.get('/softDeleteCategory/:id', isAdminLogin, adminController.softDeleteCategory);
router.get('/orders', isAdminLogin, adminController.orders);
router.get('/transactionHistory', isAdminLogin, adminController.transactionHistory);
router.get('/notifications', isAdminLogin, adminController.notifications);
router.get('/editProduct/:id', isAdminLogin, adminController.editProductPage);
router.get('/logout', adminController.logout);
router.get('/orderDetails/:id', isAdminLogin, adminController.getOrderDetails);
router.get('/productOffers', isAdminLogin, adminController.productOffers);
router.get('/categoryOffers', isAdminLogin, adminController.categoryOffers);
router.get('/salesReport', isAdminLogin, adminController.getSalesReport);
router.get('/chartData', isAdminLogin, adminController.getChartData);


router.post('/toggleUserState/:id', isAdminLogin, adminController.toggleUserState);
router.post('/softDeleteProduct/:id', isAdminLogin, adminController.softDeleteProduct);
router.post('/category/add', isAdminLogin, adminController.addCategory);
router.post('/checkOutStatus', isAdminLogin, adminController.checkOutStatus);
router.post('/editCategory', isAdminLogin, adminController.editCategory);
router.post('/login', adminController.login);
router.post('/editProduct/:id', adminController.editProduct);
router.post('/addProducts', adminController.addProducts);
router.post('/couponsCreate', isAdminLogin, adminController.couponsCreate);
router.post('/removeCoupon/:id', isAdminLogin, adminController.removeCoupon);
router.post('/removeProductImage/:productId', isAdminLogin, adminController.removeProductImage);
router.post('/addProductOffer', isAdminLogin, adminController.addProductOffer);
router.post('/updateProductOfferStatus/:productId', isAdminLogin, adminController.updateProductOfferStatus);
router.post('/removeProductOffer/:offerId', isAdminLogin, adminController.removeProductOffer);
router.post('/addCategoryOffer', isAdminLogin, adminController.addCategoryOffer);
router.post('/removeCategoryOffer/:offerId', isAdminLogin, adminController.removeCategoryOffer);
router.post('/filterSalesReport', isAdminLogin, adminController.filterSalesReport);


router.delete('/deleteTransaction/:id',isAdminLogin,adminController.deleteTransaction);



module.exports = router;
