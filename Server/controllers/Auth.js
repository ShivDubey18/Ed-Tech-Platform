const bcrypt = require("bcrypt")
const User = require("../models/User")
const OTP = require("../models/OTP")
const jwt = require("jsonwebtoken")
const otpGenerator = require("otp-generator")
const mailSender = require("../utils/mailSender")
const { passwordUpdated } = require("../mail/templates/passwordUpdate")
const Profile = require("../models/Profile")
require("dotenv").config()

// Signup Controller for Registering USers

exports.signup = async (req, res) => {
  try {
    // Destructure fields from the request body
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      accountType,
      contactNumber,
      otp,
    } = req.body
    // Check if All Details are there or not
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !confirmPassword ||
      !otp
    ) {
      return res.status(403).send({
        success: false,
        message: "All Fields are required",
      })
    }
    // Check if password and confirm password match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Password and Confirm Password do not match. Please try again.",
      })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists. Please sign in to continue.",
      })
    }

    // Find the most recent OTP for the email
    const response = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1)
    console.log(response)
    if (response.length === 0) {
      // OTP not found for the email
      return res.status(400).json({
        success: false,
        message: "The OTP is not valid",
      })
    } else if (otp !== response[0].otp) {
      // Invalid OTP
      return res.status(400).json({
        success: false,
        message: "The OTP is not valid",
      })
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create the user
    let approved = ""
    approved === "Instructor" ? (approved = false) : (approved = true)

    // Create the Additional Profile For User
    const profileDetails = await Profile.create({
      gender: null,
      dateOfBirth: null,
      about: null,
      contactNumber: null,
    })
    const user = await User.create({
      firstName,
      lastName,
      email,
      contactNumber,
      password: hashedPassword,
      accountType: accountType,
      approved: approved,
      additionalDetails: profileDetails._id,
      image: "",
    })

    return res.status(200).json({
      success: true,
      user,
      message: "User registered successfully",
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "User cannot be registered. Please try again.",
    })
  }
}

// Login controller for authenticating users
exports.login = async (req, res) => {
  try {
    // Get email and password from request body
    const { email, password } = req.body

    // Check if email or password is missing
    if (!email || !password) {
      // Return 400 Bad Request status code with error message
      return res.status(400).json({
        success: false,
        message: `Please Fill up All the Required Fields`,
      })
    }

    // Find user with provided email
    const user = await User.findOne({ email }).populate("additionalDetails")

    // If user not found with provided email
    if (!user) {
      // Return 401 Unauthorized status code with error message
      return res.status(401).json({
        success: false,
        message: `User is not Registered with Us Please SignUp to Continue`,
      })
    }

    // Generate JWT token and Compare Password
    if (await bcrypt.compare(password, user.password)) {
        const payload={
            email:user.email,
            id:user._id,
        }
        const token= jwt.sign(payload,process.env.JWT_SECRET,{expiresIn:"24h"});
      // const token = jwt.sign(
      //   { email: user.email, id: user._id, role: user.role },
      //   process.env.JWT_SECRET,
      //   {
      //     expiresIn: "24h",
      //   }
      // )

      // Save token to user document in database
      user.token = token
      user.password = undefined
      // Set cookie for token and return success response
      const options = {
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        httpOnly: true,
      }
      res.cookie("token", token, options).status(200).json({
        success: true,
        token,
        user,
        message: `User Login Success`,
      })
    } else {
      return res.status(401).json({
        success: false,
        message: `Password is incorrect`,
      })
    }
  } catch (error) {
    console.error(error)
    // Return 500 Internal Server Error status code with error message
    return res.status(500).json({
      success: false,
      message: `Login Failure Please Try Again`,
    })
  }
}
// Send OTP For Email Verification
exports.sendotp = async (req, res) => {
  try {
    const { email } = req.body

    // Check if user is already present
    // Find user with provided email
    const checkUserPresent = await User.findOne({ email })
    // to be used in case of signup

    // If user found with provided email
    if (checkUserPresent) {
      // Return 401 Unauthorized status code with error message
      return res.status(401).json({
        success: false,
        message: `User is Already Registered`,
      })
    }

    var otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    })
    const result = await OTP.findOne({ otp: otp })
    console.log("Result is Generate OTP Func")
    console.log("OTP", otp)
    console.log("Result", result)
    while (result) {
      otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
      })
    }
    const otpPayload = { email, otp }
    const otpBody = await OTP.create(otpPayload)
    console.log("OTP Body", otpBody)
    res.status(200).json({
      success: true,
      message: `OTP Sent Successfully`,
      otp,
    })
  } catch (error) {
    console.log(error.message)
    return res.status(500).json({ success: false, error: error.message })
  }
}

// Controller for Changing Password
exports.changePassword = async (req, res) => {
  try {
    // Get user data from req.user
    const userDetails = await User.findById(req.user.id)

    // Get old password, new password, and confirm new password from req.body
    const { oldPassword, newPassword } = req.body

    // Validate old password
    const isPasswordMatch = await bcrypt.compare(
      oldPassword,
      userDetails.password
    )
    if (!isPasswordMatch) {
      // If old password does not match, return a 401 (Unauthorized) error
      return res
        .status(401)
        .json({ success: false, message: "The password is incorrect" })
    }

    // Update password
    const encryptedPassword = await bcrypt.hash(newPassword, 10)
    const updatedUserDetails = await User.findByIdAndUpdate(
      req.user.id,
      { password: encryptedPassword },
      { new: true }
    )

    // Send notification email
    try {
      const emailResponse = await mailSender(
        updatedUserDetails.email,
        "Password for your account has been updated",
        passwordUpdated(
          updatedUserDetails.email,
          `Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
        )
      )
      console.log("Email sent successfully:", emailResponse.response)
    } catch (error) {
      // If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
      console.error("Error occurred while sending email:", error)
      return res.status(500).json({
        success: false,
        message: "Error occurred while sending email",
        error: error.message,
      })
    }

    // Return success response
    return res
      .status(200)
      .json({ success: true, message: "Password updated successfully" })
  } catch (error) {
    // If there's an error updating the password, log the error and return a 500 (Internal Server Error) error
    console.error("Error occurred while updating password:", error)
    return res.status(500).json({
      success: false,
      message: "Error occurred while updating password",
      error: error.message,
    })
  }
}








// const bcrypt=require('bcrypt');
// const User = require('../models/User');
// const jwt=require('jsonwebtoken');
// const OTP = require('../models/Otp');
// const otpGenerator=require('otp-generator');
// const Profile = require('../models/Profile');
// const mailSender = require('../utils/mailSender');
// require("dotenv").config();


// exports.sendOtp = async(req,res)=>{
//     try{
//         //fetch email
//         const {email}=req.body;
//         //checking that user already exist or not
//         const existingUser= await User.findOne({email});
//         if(existingUser){
//             return res.status(401).json({
//                 success:false,
//                 message:"User already registered!"
//             });
//         }

//         //generating OTP
//         var otp= otpGenerator.generate(6,{
//             upperCaseAlphabets:false,
//             lowerCaseAlphabets:false,
//             specialChars:false
//         });

//         //checking otp is unique or not & regenerating if not.
//         let result= await OTP.findOne({otp:otp});
//         while(result){
//             otp= otpGenerator.generate(6,{
//                 upperCaseAlphabets:false,
//                 lowerCaseAlphabets:false,
//                 specialChars:false
//             });
//             result= await OTP.findOne({otp:otp});
//         }

//         //creating entry in DB
//         const otpPayload={email,otp};
//         const otpBody= await OTP.create(otpPayload);
//         console.log(otpBody);
        
//         //sending success response
//         res.status(200).json({
//             success:true,
//             otpBody,
//             otpPayload,
//             message:"Otp sent successfully!"
//         });
//     }
//     catch(error){
//         console.log("Error while sending OTP :",error);
//         return res.status(500).json({
//             success:false,
//             message:`${error.message}`
//         });
//     }
// }

// exports.signUp = async(req,res)=>{
//     try{
//         //fetching data from req body
//         const {
//               firstName,
//               lastName,
//               email,
//               password,
//               confirmPassword,
//               accountType,
//             //   contactNumber,
//               otp
//             }=req.body;
        
//         //validating all data
//         if(!firstName || !lastName || !email || !password ||!confirmPassword || !otp){
//             return res.status(403).json({
//                 success:false,
//                 message:"All fields are required!."
//             });
//         }
        
//         //checking password and confirm password
//         if(password!==confirmPassword){
//             return res.status(400).json({
//                 success:false,
//                 message:"password and Confirm password doesn't match! Try again."
//             });
//         }
        
//         //checking existing user or not
//         const user=await User.findOne({email});
//         if(user){
//             return res.status(400).json({
//                 success:false,
//                 message:"Already a user! , Go and Login." 
//             });
//         }

//         //finding most recent otp
//         const recentOtp= await OTP.find({email}).sort({createdAt:-1}).limit(1);
//         //validating OTP
//         if(!recentOtp || recentOtp.length==0){
//             return res.status(400).json({
//                 success:false,
//                 message:"Otp not found!"
//             });
//         }

//         // if (!recentOtp[0] || !recentOtp[0].otp) {
//         //     return res.status(400).json({
//         //         success: false,
//         //         message: "OTP record is invalid!",
//         //     });
//         // }

//         // if (otp.toString().trim() !== recentOtp[0].otp.toString().trim()) {
//         //     return res.status(400).json({
//         //         success: false,
//         //         message: "Invalid OTP!",
//         //     });
//         // }
//         else if(otp !== recentOtp[0].otp){
//             return res.status(400).json({
//                 success:false,
//                 message:"Invalid Otp!"
//             });
//         }

//         //Now hashing password
//         const hashedPassword = await bcrypt.hash(password,10);
//         //creating entry in DB
//         const profileDetails= await Profile.create({
//             gender:null,
//             dob:null,
//             about:null,
//             contactNumber:null
//         });

//         const newUser = await User.create(
//             {
//                 firstName,
//                 lastName,
//                 email,
//                 password:hashedPassword,
//                 accountType,
//                 additionalDetails:profileDetails._id,
//                 image:`https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`
//             });

//         return res.status(200).json({
//             success:true,
//             message:"User SignUp successfully!",
//             newUser
//         });
//     }
//     catch(error) {
//         console.log("error occured while signup!", error);
//         return res.status(500).json({
//             success:false,
//             message:"Some Internal server error!",
//         });
//     }
// }

// //Login Handler function
// exports.login = async(req,res)=>{
//     try{
//         //fetching data from req body
//         const {email,password}=req.body;
//         if(!email || !password){
//             return res.status(403).json({
//                 success:false,
//                 message:"All fields are required!"
//             });
//         }
//         let user = await User.findOne({email}).populate("additionalDetails");
//         if(!user){
//             return res.status(401).json({
//                 success:false,
//                 message:"Not a registered user! SignUp first."
//             });
//         }
        
//         //validating password with DB password
//         if(await bcrypt.compare(password,user.password)){
//             //password matches now generating jwt token
//             const payload={
//                 email:user.email,
//                 id:user._id,
//                 accountType:user.accountType
//             }
//             const token= jwt.sign(payload,process.env.JWT_SECRET,{expiresIn:"24h"});

//             user=user.toObject();
//             user.token=token;
//             user.password=null;
//             //sending responce via cookie
//             const options={
//                 expires: new Date(Date.now()+ 3 * 24 * 60 * 60 * 1000),
//                 httpOnly:true,
//                 secure:true,
//                 // sameSite:"None"
//             }
//             res.cookie("token" , token , options).status(200).json({
//                 success:true,
//                 token,
//                 user,
//                 message:"Login Succesfully!"
//             });
//         }
//         else{
//             return res.status(401).json({
//                 success:false,
//                 message:"Login failed! Password doesn't match."
//             });
//         }

//     }
//     catch(error){
//         console.log("Error during login process: ",error.message);
//         return res.status(500).json({
//             success:false,
//             message:"Error occured while login!"
//         });
//     }
// }

// //change passowrd handler
// exports.changePassword = async(req,res)=>{
//     try {
//         // Get user data from req.user
//         const userDetails = await User.findById(req.user.id)
    
//         // Get old password, new password, and confirm new password from req.body
//         const { oldPassword, newPassword } = req.body
    
//         // Validate old password
//         const isPasswordMatch = await bcrypt.compare(
//           oldPassword,
//           userDetails.password
//         )
//         if (!isPasswordMatch) {
//           // If old password does not match, return a 401 (Unauthorized) error
//           return res
//             .status(401)
//             .json({ success: false, message: "The password is incorrect" })
//         }
    
//         // Update password
//         const encryptedPassword = await bcrypt.hash(newPassword, 10)
//         const updatedUserDetails = await User.findByIdAndUpdate(
//           req.user.id,
//           { password: encryptedPassword },
//           { new: true }
//         )
    
//         // Send notification email
//         try {
//           const emailResponse = await mailSender(
//             updatedUserDetails.email,
//             "Password for your account has been updated",
//             passwordUpdated(
//               updatedUserDetails.email,
//               `Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
//             )
//           )
//           console.log("Email sent successfully:", emailResponse.response)
//         } catch (error) {
//           // If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
//           console.error("Error occurred while sending email:", error)
//           return res.status(500).json({
//             success: false,
//             message: "Error occurred while sending email",
//             error: error.message,
//           })
//         }
    
//         // Return success response
//         return res
//           .status(200)
//           .json({ success: true, message: "Password updated successfully" })
//       } catch (error) {
//         // If there's an error updating the password, log the error and return a 500 (Internal Server Error) error
//         console.error("Error occurred while updating password:", error)
//         return res.status(500).json({
//           success: false,
//           message: "Error occurred while updating password",
//           error: error.message,
//         })
//     }
//     // try{
//     //     //fetching data from req.body
//     //     const {email,oldPassword,newPassword,confirmNewPassword}=req.body;
//     //     //validating data
//     //     if(!email || !oldPassword || !newPassword || !confirmNewPassword){
//     //         return res.status(403).json({
//     //             success:false,
//     //             message:"All fields are required"
//     //         });
//     //     }
//     //     //checking user exits or not
//     //     const existingUser= await User.findOne({email});
//     //     if(!existingUser){
//     //         return res.status(400).json({
//     //             success:false,
//     //             message:"User not registered yet! go and register now."
//     //         });
//     //     }
//     //     //matching newPass and cnfNewPassword
//     //     if(newPassword !== confirmNewPassword){
//     //         return res.status(401).json({
//     //             success:false,
//     //             message:"New password and confirm new password doesn't match!"
//     //         });
//     //     }

//     //     //checking old password and DB password
//     //     if(await bcrypt.compare(oldPassword,existingUser.password)){
//     //         //if password matched then hash new password
//     //         const hashedPassword= await bcrypt.hash(newPassword,10);
//     //         //update this hashed password into DB
//     //         const newDetails= await User.findOneAndUpdate({email},
//     //                                                 {password:hashedPassword},
//     //                                                 {new:true});
//     //         //send mail to registered email
//     //         await mailSender(email,
//     //                         "Password changed alert",
//     //                         `Your account ${email} password changed successfully ${newPassword}`
//     //                         );
            
//     //         return res.status(200).json({
//     //             success:true,
//     //             message:"Password changed successfully!",
//     //         });
//     //     }
//     //     else{
//     //         return res.status(400).json({
//     //             success:true,
//     //             message:"Password doesn't match with DB",
//     //         });
//     //     }
//     // }
//     // catch(error){
//     //     console.log("Error while changing password: ",error.message);
//     //     return res.status(500).json({
//     //         success:true,
//     //         message:"Error during updating password",
//     //     });
//     // }
// }