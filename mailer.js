const nodemailer = require('nodemailer');
const Mailgen = require('mailgen');
require("dotenv").config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    }
});

transporter.verify(function (error, success) {
    if (error) {
        console.error('SMTP connection error:', error);
    } else {
        console.log('SMTP connection successful');
    }
});

const mailGenerator = new Mailgen({
    theme: 'default',
    product: {
        name: 'Your Company',
        link: 'localhost:8080'
    }
});

const sendMail = (email, subject, text) => {
    console.log(`Otp generated to ${email} Otp => ${text}`);
    
    const emailBody = mailGenerator.generate({
        body: {
            name: email,
            intro: text,
            outro: 'Need help, or have questions? Just reply to this email, we\'d love to help.'
        }
    });

    const message = {
        from: process.env.EMAIL,
        to: email,
        subject: subject,
        html: emailBody
    };

    return transporter.sendMail(message, (error, info) => {
        if (error) {
            console.error(`Error sending email to ${email}:`, error);
        } else {
            console.log(`Email sent to ${email}:`, info.response);
        }
    });
};

module.exports = sendMail;
