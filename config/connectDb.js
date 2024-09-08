const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URL,{
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(function(){
    console.log("Connected to MongoDB");
}).catch(function(err){
    console.error("Error connecting to MongoDB",err)
})