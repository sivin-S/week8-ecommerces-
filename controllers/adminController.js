const bcrypt = require("bcrypt");
const path = require("path");
const { Product, Variant } = require("../model/productSchema");
const User = require("../model/dbUserSchema");
const fs = require("fs");
const Admin = require("../model/dbAdminSchema");
const Category = require("../model/categorySchema");
const Checkout = require("../model/checkoutSchema");

// Ensure the uploads/img directory exists
const uploadDir = path.join(__dirname, "../uploads", "img");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Function to render the admin dashboard
async function dashboard(req, res) {
    try {
        const productData = await Product.find({}).populate('category');
        const user = await User.find({});
        res.setHeader('Cache-Control', 'no-store');
        res.render('adminDashboard.ejs', { productData, user });
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

// Function to render the login page
function loginPage(req, res) {
    if (req.session.adminStatus) {
        res.redirect("/admin");
    } else {
        res.setHeader('Cache-Control', 'no-store');
        res.render('adminLogin.ejs');
    }
}

// Function to render the add men's product page
async function addProductsPage(req, res) {
    try {
        const categories = await Category.find({});
        res.render('addProducts.ejs', { categories });
    } catch (err) {
        console.log(err);
        res.render('addProducts.ejs', { categories: [] });
    }
}



// Function to render the user list page
async function userList(req, res) {
    try {
        const user = await User.find({}).populate("addresses");
        console.log("userList >>>>>>>>>>>>",user);
        res.render('userList.ejs', { user });
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

// Function to toggle the user state (block/unblock)
async function toggleUserState(req, res) {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (user) {
            user.isBlocked = !user.isBlocked; // Toggle the state (true and false)
            await user.save();
            res.redirect('/admin/userList');
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
}

// Function to render the order list page
async function orderList(req, res) {
    try {
        const checkOut = await Checkout.find({})
            .populate("user")
            .populate("cart.items.0.product")
            .sort({ createdAt: -1 }); 
        console.log("checkOut >> ", checkOut);
        res.render('ordersList.ejs', { checkOut });
    } catch (err) {
        console.log(err);
        res.redirect('/orderList');
    }
}



// function to get order details fetch "ajax method"
async function getOrderDetails(req, res) {
    try {
        const orderId = req.params.id;
        const order = await Checkout.findById(orderId).populate("user").populate("cart.items.product")
        ;

        console.log("order >>>>>>>");
        console.log(order);
        
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (err) {
        console.error('Error fetching order details:', err);
        res.status(500).json({ error: 'Server error' });
    }
}





// Function to render the payment methods page
function paymentMethods(req, res) {
    // res.render('paymentMethods.ejs');
    try{
        res.render('paymentMethods.ejs');
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

// Function to render the sales report page
function salesReport(req, res) {
    // res.render('report.ejs');
    try {
        res.render('report.ejs');
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

// Function to render the coupons history page
function couponsHistory(req, res) {
    try {
        res.render('couponsHistroy.ejs');
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

// Function to render the categories page
async function categories(req, res) {
    try {
        const mensCategory = await Category.find({ gender: 'mens' });
        const womensCategory = await Category.find({ gender: 'womens' });
        res.render('category.ejs', { mensCategory, womensCategory });
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

// Function to soft delete a product (toggle deleted state)
async function softDeleteProduct(req, res) {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            product.deleted = !product.deleted; // Toggle the deleted state
            await product.save();
        }
        res.redirect('/admin');
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

// Function to soft delete a category (toggle deleted state)
async function softDeleteCategory(req, res) {
    try {
        const category = await Category.findById(req.params.id);
        if (category) {
            category.deleted = !category.deleted; // Toggle the deleted state
            await category.save();
        }
        res.redirect('/admin/categories');
    } catch (err) {
        console.log(err);
        res.redirect('/admin/categories');
    }
}

// Function to render the order status page
async function orderStatus(req, res) {
    try {
        const checkOut = await Checkout.find({})
        .populate("user")
        .populate("cart.items.0.product")
        .sort({ createdAt: -1 });
        res.render('orderStatusAdminSide.ejs', { checkOut });
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

// Function to render the transaction history page
function transactionHistory(req, res) {
    // res.render('transactionHistory.ejs');
    try{
        res.render('transactionHistory.ejs');
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

// Function to render the notifications page
function notifications(req, res) {
    // res.render('notification.ejs');
    try{
        res.render('notification.ejs');
    } catch (err) {
        console.log(err);
        res.redirect('/admin');
    }
}

// Function to render the edit product page
async function editProductPage(req, res) {
    try {
        const categories = await Category.find({});
        const productDetails = await Product.findById(req.params.id).populate('category');
        console.log("categories"+categories);
        console.log("productDetails"+productDetails);
    
        
        res.render('editProduct.ejs', { productDetails, categories,path });
    } catch (err) {
        console.error('Error fetching product details:', err);
        res.redirect('/admin');
    }
}

// Function to handle admin logout
function logout(req, res) {
    req.session.destroy(function (err) {
        if (!err) {
            res.clearCookie("connect.sid");
            res.redirect("/admin/login");
        } else {
            res.status(500).send('Failed to destroy session');
        }
    });
}

// Function to add a new category
async function addCategory(req, res) {
    try {
        const { category: categoryName, gender } = req.body;

        if (gender !== "mens" && gender !== "womens") {
            req.flash('error', "Invalid gender. Must be 'mens' or 'womens'.");
            return res.redirect('/admin/categories');
        }

        const existingCategory = await Category.findOne({ name: categoryName, gender });

        if (existingCategory) {
            req.flash('error', "Category already exists for this gender!");
            return res.redirect('/admin/categories');
        }

        const newCategory = new Category({ name: categoryName, gender, deleted: false });
        await newCategory.save();

        req.flash('success', "Category added successfully!");
        res.redirect('/admin/categories');
    } catch (error) {
        console.error('Error adding category:', error);
        req.flash('error', "An error occurred while adding the category.");
        res.redirect('/admin/categories');
    }
}

// Function to update the checkout status
async function checkOutStatus(req, res) {
    try {
        const { orderStatus, userId } = req.body;

        const checkout = await Checkout.findOne({ user: userId });
        if (!checkout) {
            // return res.status(404).send('Checkout not found');
            req.flash('error', "Checkout not found");
            return res.redirect('/admin/orderStatus');
        }


        checkout.previousOrderStatus = checkout.orderStatus;
        checkout.orderStatus = orderStatus;
        await checkout.save();

        res.redirect('/admin/orderStatus');
    } catch (err) {
        console.log(err);
       
        req.flash('error', "An error occurred while updating the order status.");
        res.redirect('/admin/orderStatus');
    }
}


// Function to edit a category
async function editCategory(req, res) {
    try {
        const { oldName, newName, gender } = req.body;

        if (gender !== "mens" && gender !== "womens") {
            req.flash('error', "Invalid gender. Must be 'mens' or 'womens'.");
            return res.redirect('/admin/categories');
        }


        const existingCategory = await Category.findOne({ 
            name: newName, 
            gender: gender,
            _id: { $ne: req.params.id } 
        });

        if (existingCategory) {
            req.flash('error', "Category with this name already exists for this gender!");
            return res.redirect('/admin/categories');
        }

        const updatedCategory = await Category.findOneAndUpdate(
            { name: oldName },
            { $set: { name: newName, gender } },
            { new: true }
        );

        if (!updatedCategory) {
            req.flash('error', "Category not found.");
            return res.redirect('/admin/categories');
        }

        req.flash('success', "Category updated successfully!");
        res.redirect('/admin/categories');
    } catch (err) {
        console.error('Error editing category:', err);
        req.flash('error', "An error occurred while editing the category.");
        res.redirect('/admin/categories');
    }
}

// Function to handle admin login
async function login(req, res) {
    try {
        const admin = await Admin.findOne({ email: req.body.email });

        if (admin && await bcrypt.compare(req.body.password, admin.password)) {
            req.session.email = admin.email;
            req.session.adminStatus = true;
            req.session.user = { isAdmin: true };
            console.log("Login successful:", req.session);
            res.redirect("/admin");
        } else {
            console.log("Invalid email or password");
            res.status(401).render('adminLogin.ejs');
        }
    } catch (err) {
        console.error("Error during admin login:", err);
        res.status(500).render('adminLogin.ejs');
    }
}

// Function to edit a product
async function editProduct(req, res) {
    try {
        const productId = req.params.id;
        const { productName, price, gender, category, descriptionOfProduct, brand } = req.body;

        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            return res.status(404).send('Product not found');
        }

        existingProduct.name = productName;
        existingProduct.description = descriptionOfProduct;
        existingProduct.price = price;
        existingProduct.category = category;
        existingProduct.gender = gender;
        existingProduct.brand = brand;

        const variants = parseVariantsFromRequestBody(req.body);

        for (let i = 0; i < variants.length; i++) {
            const variant = variants[i];
            let variantImages = [];

            if (existingProduct.variants[i] && existingProduct.variants[i].imageUrls) {
                variantImages = [...existingProduct.variants[i].imageUrls];
            }

            if (req.files) {
                for (let j = 0; j < 3; j++) {
                    const fileKey = `variants[${i}][images][${j}]`;
                    if (req.files[fileKey]) {
                        // Delete the old image if it exists
                        if (variantImages[j]) {
                            const oldImagePath = path.join(__dirname, '..', variantImages[j]);
                            fs.unlink(oldImagePath, (err) => {
                                if (err) {
                                    console.error(`Failed to delete old image: ${oldImagePath}`, err);
                                }
                            });
                        }

                        // Upload the new image
                        const file = req.files[fileKey];
                        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                        const fileName = file.name + '-' + uniqueSuffix + path.extname(file.name);
                        const filePath = path.join(__dirname, '..', 'uploads', 'img', fileName);

                        await file.mv(filePath);
                        const newImageUrl = `/uploads/img/${fileName}`;

                        variantImages[j] = newImageUrl;
                    }
                }
            }

            if (existingProduct.variants[i]) {
                existingProduct.variants[i].color = variant.color;
                existingProduct.variants[i].size = variant.size;
                existingProduct.variants[i].stock = variant.stock;
                existingProduct.variants[i].imageUrls = variantImages;
            } else {
                existingProduct.variants.push({
                    color: variant.color,
                    size: variant.size,
                    stock: variant.stock,
                    imageUrls: variantImages
                });
            }
        }

        existingProduct.variants = existingProduct.variants.slice(0, variants.length);

        await existingProduct.save();
        req.flash('success', "Product updated successfully!");
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
}




//  parse variants from the req.body
function parseVariantsFromRequestBody(body) {
    const variants = [];
    for (let key in body) {
        if (key.startsWith('variants[')) {
            const match = key.match(/variants\[(\d+)\]\[(\w+)\]/);
            if (match) {
                const index = parseInt(match[1], 10);
                const field = match[2];
                variants[index] = variants[index] || {};
                if (field === 'existingImages') {
                    variants[index].existingImages = variants[index].existingImages || [];
                    variants[index].existingImages.push(body[key]);
                } else {
                    variants[index][field] = body[key];
                }
            }
        }
    }
    return variants;
}


// Function to add  products
async function addProducts(req, res) {
    try {
        // console.log(req.body);
        
        const { productName, price, gender, category, descriptionOfProduct, brand } = req.body;

        const newProduct = new Product({
            name: productName,
            description: descriptionOfProduct,
            price,
            category,
            gender,
            deleted: false,
            brand,
            variants: []
        });

        const variants = parseVariantsFromRequestBody(req.body);

        for (let i = 0; i < variants.length; i++) {
            const variant = variants[i];
            const variantImages = [];

            if (req.files && req.files[`variants[${i}][images]`]) {
                const images = Array.isArray(req.files[`variants[${i}][images]`])
                    ? req.files[`variants[${i}][images]`]
                    : [req.files[`variants[${i}][images]`]];

                for (let file of images) {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const fileName = file.name + '-' + uniqueSuffix + path.extname(file.name);
                    const filePath = path.join(__dirname, '..', 'uploads', 'img', fileName);

                    await file.mv(filePath);
                    variantImages.push(`/uploads/img/${fileName}`);
                }
            }

            newProduct.variants.push({ color: variant.color, size: variant.size, stock: variant.stock, imageUrls: variantImages });
        }

        await newProduct.save();
        req.flash('success', "Product added successfully!");
        res.redirect('/admin/addProducts');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/addProducts');
    }
}

// Function to render the coupons creation page
function couponsCreate(req, res) {
    res.render('couponsCreate.ejs');
}

module.exports = {
    dashboard,
    loginPage,
    userList,
    toggleUserState,
    orderList,
    paymentMethods,
    salesReport,
    couponsHistory,
    categories,
    softDeleteProduct,
    softDeleteCategory,
    orderStatus,
    transactionHistory,
    notifications,
    editProductPage,
    logout,
    addCategory,
    checkOutStatus,
    editCategory,
    login,
    editProduct,
    couponsCreate,
    addProductsPage,
    addProducts,
    getOrderDetails
};
