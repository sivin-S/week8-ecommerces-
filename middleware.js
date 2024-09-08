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
  isUserLogin
};
