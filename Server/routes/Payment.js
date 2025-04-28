const express = require("express");
const router = express.Router();

// required handler and middlewares
const { 
    capturePayment, 
    verifyPayment,
    sendPaymentSuccessEmail } = require("../controllers/Payments");
const { auth, isInstructor, isStudent, isAdmin } = require("../middlewares/authN&authZ");

// Routes for payment and verification
router.post("/capturePayment", auth, isStudent, capturePayment);
router.post("/verifyPayment",auth, isStudent, verifyPayment);
router.post("/sendPaymentSuccessEmail", auth, isStudent, sendPaymentSuccessEmail);

module.exports = router;