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
    console.log('Checking user auto-login prevention');
    console.log('Session data:', req.session);
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

module.exports = {
    isAdminLogin,
    preventAutoLogin,
    preventUserAutoLogin,
    isUserLogin
};
