const { Product } = require("../model/productSchema");
const Category = require("../model/categorySchema");
const mongoose = require('mongoose');


exports.getProducts = async (req, res) => {
  try {
  
    const nonDeletedCategories = await Category.find({ deleted: false });
    const nonDeletedCategoryIds = nonDeletedCategories.map(cat => cat._id);


    const products = await Product.find({ category: { $in: nonDeletedCategoryIds } })
      .populate('category');

    res.setHeader("Cache-Control", "no-store");
    res.render("index.ejs", { products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.redirect("/");
  }
};

exports.getProductDetails = async (req, res) => {
  const productId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(404).render('404Page.ejs',{message:"No Product Was Found"});
}
  try {
   

   

    const allProducts = await Product.find({}).populate("category");
    
    
    const product = await Product.findById(req.params.id).populate("category");
    // console.log("product ==>"+ product);
    if (!product) {
      return res.status(404).render("404Page.ejs",{message:"No Product Was Found"});
    }
    // console.log("product ==>"+ product);
    // console.log("all product ==>"+ allProducts);
    
    res.render("productDetails.ejs", { product, allProducts });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.redirect("/");
  }
};




// filtering variants

exports.filterVariant = async (req, res) => {
  // console.log('Query Parameters:', req.query); // Log the query parameters

  try {
      const { productId, variantColor, size } = req.query;

      const product = await Product.findById(productId);

      if (!product) {
          return res.status(404).json({ message: 'Product not found' });
      }

      let filteredVariants = product.variants;

      if (variantColor) {
          filteredVariants = filteredVariants.filter(v => v.color === variantColor);
      }

      if (size) {
          filteredVariants = filteredVariants.filter(v => v.size === size);
      }

      if (filteredVariants.length === 0) {
          return res.json({ message: 'No variants found for the selected criteria' });
      }

      res.json({ 
          variants: filteredVariants.map(v => ({
              ...v.toObject(),
              price: product.price,
              name: product.name,
              description: product.description
          }))
      });

  } catch (error) {
      console.error("Error filtering variants:", error);
      res.status(500).json({ message: 'An error occurred while filtering variants' });
  }
};











exports.getShop = async (req, res) => {
  try {
    const { category, gender, color, size, brand, minPrice, maxPrice, sort, page = 1, limit = 12, search } = req.query;
    let query = {};

   
     const nonDeletedCategories = await Category.find({ deleted: false });
     const nonDeletedCategoryIds = nonDeletedCategories.map(cat => cat._id);

     query.category = { $in: nonDeletedCategoryIds };

    if (category) {
      const categories = category.split(',').map(cat => cat.trim());
      const categoryDocs = await Category.find({ 'name': { $in: categories }, 'deleted': false });
      
      if (categoryDocs.length > 0) {
       
        query.category = { $in: categoryDocs.map(doc => doc._id) };
      } else {
        query.category = null;
      }
    }
    if (gender) query['gender'] = gender;
    if (color) query['variants.color'] = color;
    if (size) query['variants.size'] = size;
    if (brand) query.brand = brand;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }
    if (search) {
      query['$or'] = [
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    let sortOption = {};
    if (sort === 'priceAsc') sortOption.price = 1;
    else if (sort === 'priceDesc') sortOption.price = -1;
    else if (sort === 'nameAsc') sortOption.name = 1;
    else if (sort === 'nameDesc') sortOption.name = -1;
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);
    // querying products
    const products = await Product.find(query)
      .populate("category")
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit);
    const uniqueCategories = await Category.distinct('name');
    const uniqueColors = await Product.distinct('variants.color');
    const uniqueSizes = await Product.distinct('variants.size');
    const uniqueBrands = await Product.distinct('brand');
    const priceRange = await Product.aggregate([
      { $group: { _id: null, minPrice: { $min: "$price" }, maxPrice: { $max: "$price" } } }
    ]);
    // console.log(products);
    
    res.render("shop", {
      products,
      uniqueCategories,
      uniqueColor: uniqueColors,
      uniqueSize: uniqueSizes,
      uniqueBrand: uniqueBrands,
      priceRange: priceRange[0],
      currentPage: parseInt(page),
      totalPages,
      query: req.query
    });
  } catch (error) {
    console.error(error);
    res.redirect('/shop');
  }
};
