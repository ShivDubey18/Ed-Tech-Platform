const { instance } = require("../config/razorpay")
const Course = require("../models/Course")
const crypto = require("crypto")
const User = require("../models/User")
const mailSender = require("../utils/mailSender")
const mongoose = require("mongoose")
const {
  courseEnrollmentEmail,
} = require("../mail/templates/courseEnrollmentEmail")
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail")
const CourseProgress = require("../models/CourseProgress")

// Capture the payment and initiate the Razorpay order
exports.capturePayment = async (req, res) => {
  const { courses } = req.body
  const userId = req.user.id
  if (courses.length === 0) {
    return res.json({ success: false, message: "Please Provide Course ID" })
  }

  let total_amount = 0

  for (const course_id of courses) {
    let course
    try {
      // Find the course by its ID
      course = await Course.findById(course_id)

      // If the course is not found, return an error
      if (!course) {
        return res
          .status(200)
          .json({ success: false, message: "Could not find the Course" })
      }

      // Check if the user is already enrolled in the course
      const uid = new mongoose.Types.ObjectId(userId)
      if (course.studentsEnrolled.includes(uid)) {
        return res
          .status(200)
          .json({ success: false, message: "Student is already Enrolled" })
      }

      // Add the price of the course to the total amount
      total_amount += course.price
    } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  const options = {
    amount: total_amount * 100,
    currency: "INR",
    receipt: Math.random(Date.now()).toString(),
  }

  try {
    // Initiate the payment using Razorpay
    console.log("Razorpay key id and secret can be error!"); // to be removed
    const paymentResponse = await instance.orders.create(options)
    console.log("Payment response : ",paymentResponse)
    res.json({
      success: true,
      data: paymentResponse,
    })
  } catch (error) {
    console.log(error)
    res
      .status(500)
      .json({ success: false, message: "Could not initiate order." })
  }
}

// verify the payment
exports.verifyPayment = async (req, res) => {
  const razorpay_order_id = req.body?.razorpay_order_id
  const razorpay_payment_id = req.body?.razorpay_payment_id
  const razorpay_signature = req.body?.razorpay_signature
  const courses = req.body?.courses

  const userId = req.user.id

  if (
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature ||
    !courses ||
    !userId
  ) {
    return res.status(200).json({ success: false, message: "Payment Failed" })
  }

  let body = razorpay_order_id + "|" + razorpay_payment_id

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(body.toString())
    .digest("hex")

  if (expectedSignature === razorpay_signature) {
    await enrollStudents(courses, userId, res)
    return res.status(200).json({ success: true, message: "Payment Verified" })
  }

  return res.status(200).json({ success: false, message: "Payment Failed" })
}

// Send Payment Success Email
exports.sendPaymentSuccessEmail = async (req, res) => {
  const { orderId, paymentId, amount } = req.body

  const userId = req.user.id

  if (!orderId || !paymentId || !amount || !userId) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all the details" })
  }

  try {
    const enrolledStudent = await User.findById(userId)

    await mailSender(
      enrolledStudent.email,
      `Payment Received`,
      paymentSuccessEmail(
        `${enrolledStudent.firstName} ${enrolledStudent.lastName}`,
        amount / 100,
        orderId,
        paymentId
      )
    )
  } catch (error) {
    console.log("error in sending mail", error)
    return res
      .status(400)
      .json({ success: false, message: "Could not send email" })
  }
}

// enroll the student in the courses
const enrollStudents = async (courses, userId, res) => {
  if (!courses || !userId) {
    return res
      .status(400)
      .json({ success: false, message: "Please Provide Course ID and User ID" })
  }

  for (const courseId of courses) {
    try {
      // Find the course and enroll the student in it
      const enrolledCourse = await Course.findOneAndUpdate(
        { _id: courseId },
        { $push: { studentsEnrolled: userId } },
        { new: true }
      )

      if (!enrolledCourse) {
        return res
          .status(500)
          .json({ success: false, error: "Course not found" })
      }
      console.log("Updated course: ", enrolledCourse)

      const courseProgress = await CourseProgress.create({
        courseID: courseId,
        userId: userId,
        completedVideos: [],
      })
      // Find the student and add the course to their list of enrolled courses
      const enrolledStudent = await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            courses: courseId,
            courseProgress: courseProgress._id,
          },
        },
        { new: true }
      )

      console.log("Enrolled student: ", enrolledStudent)
      // Send an email notification to the enrolled student
      const emailResponse = await mailSender(
        enrolledStudent.email,
        `Successfully Enrolled into ${enrolledCourse.courseName}`,
        courseEnrollmentEmail(
          enrolledCourse.courseName,
          `${enrolledStudent.firstName} ${enrolledStudent.lastName}`
        )
      )

      console.log("Email sent successfully: ", emailResponse.response)
    } catch (error) {
      console.log(error)
      return res.status(400).json({ success: false, error: error.message })
    }
  }
}




// const {instance}=require('../config/razorpay');
// const Course=require('../models/Course');
// const User=require('../models/User');
// const mailSender=require('../utils/mailSender');
// const {courseEnrollmentEmail}=require('../mail/templates/courseEnrollmentEmail');
// const { default: mongoose } = require('mongoose');

// //capture the payment and intiate the Razorpay order
// exports.capturePayment = async(req,res)=> {
//     //fetch CourseId and UserId
//     const {course_id}=req.body;
//     const userId=req.user.id;
//     //validation
//     //valid courseId
//     if(!course_id){
//         return res.json({
//             success:false,
//             message:"Please provide valid Course ID"
//         });
//     }

//     //courseDetails validation
//     let course;
//     try{
//         const course= await Course.findById(course_id);
//         if(!course){
//             return res.json({
//                 success:false,
//                 message:"Could not find the course"
//             });
//         }
//         //check for user is already enrolled in course
//         const uid=new mongoose.Schema.Types.ObjectId(userId);
//         if(course.studentEnrolled.includes(uid)){
//             return res.status(400).json({
//                 success:false,
//                 message:"User already enrolled in Course"
//             });
//         }
//     }
//     catch(error){
//         console.error(error);
//         return res.status(500).json({
//             success:false,
//             message:error.message
//         });
//     }

//     //order create
//     const amount=course.price;
//     const currency="INR";

//     const options ={
//         amount: amount*100,
//         currency,
//         receipt: Math.random(Date.now()).toString(),
//         notes:{
//             courseId:course_id,
//             userId,
//         }
//     };

//     //initiate the payment using razorpay
//     try{
//         const paymentResponse= await instance.orders.create(options);
//         console.log(paymentResponse);
//         //send response
//         return res.status(200).json({
//             success:true,
//             courseName:course.courseName,
//             description:course.courseDesciption,
//             thumbnail:course.thumbnail,
//             orderId:paymentResponse.id,
//             currency:paymentResponse.currency,
//             amount:paymentResponse.amount
//         });
//     }
//     catch(error){
//         console.log(error);
//         return res.status(500).json({
//             success:false,
//             message:"Could not initiate order"
//         })
//     }
// }

// // verify signature of Razorpay and Server
// exports.verifyPayment = async(req,res)=>{
//     try{
//         // get server secret 
//         const webhookSecret="12345678";
//         //get signature returned by Razorpay
//         const signature=req.headers["x-razorpay-signature"];
//         // step --1 create Hmac object
//         const shasum= crypto.createHmac("sha256",webhookSecret);
//         // step --2 convert shasum( Hmac object ) to String
//         shasum.update(JSON.stringify(req.body));
//         // step --3 get digest 
//         const digest=shasum.digest("hex");

//         //match / compare digest and signature
//         if(signature === digest){
//             console.log("Payment is authorized");

//             // update Course Model and User model
//             const {courseId,userId}=req.body.payload.payment.entity.notes;
//             try{
//                 //Updating Course Model
//                 const enrolledCourse= await Course.findOneAndUpdate({_id:courseId},
//                                                         {$push:{studentEnrolled:userId}},
//                                                         {new:true});
//                 if(!enrolledCourse){
//                     return res.status(500).json({
//                         success:false,
//                         message:"Course not found"
//                     });
//                 }
//                 console.log(enrolledCourse);

//                 //updating User Model
//                 const enrolledStudent= await User.findOneAndUpdate({_id:userId},
//                                                             {$push:{courses:courseId}},
//                                                             {new:true});

//                 console.log(enrolledStudent);
//                 //send Course enrollment mail
//                 const emailResponse= await mailSender(
//                                             enrolledStudent.email,
//                                             "Congratulations",
//                                             "Congratulations you are enrolled in new course"
//                                             );
//                 console.log(emailResponse);
//                 //send success response
//                 return res.status(200).json({
//                     success:true,
//                     message:"Signature verified and Course added"
//                 });
//             }
//             catch(error){
//                 return res.status(500).json({
//                     success:false,
//                     message:"Error occured while adding course"
//                 });
//             }
//         }
//         else{
//             return res.status(400).json({
//                 success:false,
//                 message:"Signature not matched!"
//             });
//         }
//     }
//     catch(error){
//         console.log(error);
//         return res.status(500).json({
//             success:false,
//             message:error.message
//         });
//     }
// }
