const User = require("./model/dbUserSchema");

function isAdminLogin(req, res, next) {
    if (!(req.session.adminStatus && req.session.user && req.session.user.isAdmin)) {
        req.session.destroy(function (err) {
            if (!err) {
                res.clearCookie("connect.sid");
                res.redirect("/admin/login");
            }
        });
    } else {
        return next();
    }
}

function preventAutoLogin(req, res, next) {
    if (req.session && req.session.email) {
        res.redirect("/admin");
    } else {
        return next();
    }
}

function preventUserAutoLogin(req, res, next) {
    // console.log('Checking user auto-login prevention');
    // console.log('Session data:', req.session);
    if (req.session && req.session.userStatus) {
        console.log('User is already logged in, redirecting...');
        res.redirect("/");
    } else {
        console.log('User is not logged in, proceeding to login page...');
        return next();
    }
}

function isUserLogin(req, res, next) {
    if (!req.session.userStatus) {
        req.session.destroy(function (err) {
            if (!err) {
                res.clearCookie("connect.sid");
                res.redirect("/login");
            }
        });
    } else {
        return next();
    }
}


// checking the user is isblocked
async function checkUserBlocked(req, res, next) {
    try {
        const user = await User.findById(req.session.userId);
        // console.log('session:', req.session);
        // console.log('User:', req.session);
        if (user && user?.isBlocked) {
            req.session.destroy(function (err) {
                if (!err) {
                    res.clearCookie("connect.sid");
                    res.redirect("/login");
                }
            });
        } else {
            return next();
        }
    } catch (error) {
        console.error(error);
        res.redirect("/login");
    }
}




module.exports = {
    isAdminLogin,
    preventAutoLogin,
    preventUserAutoLogin,
    isUserLogin,
    checkUserBlocked
};
