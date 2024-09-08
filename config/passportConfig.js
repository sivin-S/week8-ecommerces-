const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../model/dbUserSchema');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:8080/auth/google/callback"
},
async (accessToken, refreshToken, profile, cb) => {
    try {
        let user = await User.findOne({
            $or: [
                { googleId: profile.id },
                { email: profile.emails[0].value }
            ]
        });

        if (!user) {
            user = new User({
                googleId: profile.id,
                username: profile.displayName,
                email: profile.emails[0].value
            });
            await user.save();
        } else if (!user.googleId) {
            user.googleId = profile.id;
            user.username = profile.displayName;
            await user.save();
        }

        return cb(null, user);
    } catch (err) {
        console.log("passport err >>>> ", err);
        return cb(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});
