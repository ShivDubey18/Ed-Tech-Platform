const Profile = require("../models/Profile")
const CourseProgress = require("../models/CourseProgress")

const Course = require("../models/Course")
const User = require("../models/User")
const { uploadImageToCloudinary } = require("../utils/uploadImage")
const mongoose = require("mongoose")
const { convertSecondsToDuration } = require("../utils/secToDuration")
// Method for updating a profile
exports.updateProfile = async (req, res) => {
  try {
    const {
      firstName = "",
      lastName = "",
      dateOfBirth = "",
      about = "",
      contactNumber = "",
      gender = "",
    } = req.body
    const id = req.user.id

    // Find the profile by id
    const userDetails = await User.findById(id)
    const profile = await Profile.findById(userDetails.additionalDetails)

    const user = await User.findByIdAndUpdate(id, {
      firstName,
      lastName,
    })
    await user.save()

    // Update the profile fields
    profile.dateOfBirth = dateOfBirth
    profile.about = about
    profile.contactNumber = contactNumber
    profile.gender = gender

    // Save the updated profile
    await profile.save()

    // Find the updated user details
    const updatedUserDetails = await User.findById(id)
      .populate("additionalDetails")
      .exec()

    return res.json({
      success: true,
      message: "Profile updated successfully",
      updatedUserDetails,
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

exports.deleteAccount = async (req, res) => {
  try {
    const id = req.user.id
    console.log(id)
    const user = await User.findById({ _id: id })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }
    // Delete Assosiated Profile with the User
    await Profile.findByIdAndDelete({
      _id: new mongoose.Types.ObjectId(user.additionalDetails),
    })
    for (const courseId of user.courses) {
      await Course.findByIdAndUpdate(
        courseId,
        { $pull: { studentsEnroled: id } },
        { new: true }
      )
    }
    // Now Delete User
    await User.findByIdAndDelete({ _id: id })
    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    })
    await CourseProgress.deleteMany({ userId: id })
  } catch (error) {
    console.log(error)
    res
      .status(500)
      .json({ success: false, message: "User Cannot be deleted successfully" })
  }
}

exports.getAllUserDetails = async (req, res) => {
  try {
    const id = req.user.id
    const userDetails = await User.findById(id)
      .populate("additionalDetails")
      .exec()
    console.log(userDetails)
    res.status(200).json({
      success: true,
      message: "User Data fetched successfully",
      data: userDetails,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

exports.updateDisplayPicture = async (req, res) => {
  try {
    const displayPicture = req.files.displayPicture
    const userId = req.user.id
    const image = await uploadImageToCloudinary(
      displayPicture,
      process.env.FOLDER_NAME,
      1000,
      1000
    )
    console.log(image)
    const updatedProfile = await User.findByIdAndUpdate(
      { _id: userId },
      { image: image.secure_url },
      { new: true }
    )
    res.send({
      success: true,
      message: `Image Updated successfully`,
      data: updatedProfile,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

exports.getEnrolledCourses = async (req, res) => {
  try {
    const userId = req.user.id
    let userDetails = await User.findOne({
      _id: userId,
    })
      .populate({
        path: "courses",
        populate: {
          path: "courseContent",
          populate: {
            path: "subSection",
          },
        },
      })
      .exec()
    userDetails = userDetails.toObject()
    var SubsectionLength = 0
    for (var i = 0; i < userDetails.courses.length; i++) {
      let totalDurationInSeconds = 0
      SubsectionLength = 0
      for (var j = 0; j < userDetails.courses[i].courseContent.length; j++) {
        totalDurationInSeconds += userDetails.courses[i].courseContent[
          j
        ].subSection.reduce((acc, curr) => acc + parseInt(curr.timeDuration), 0)
        userDetails.courses[i].totalDuration = convertSecondsToDuration(
          totalDurationInSeconds
        )
        SubsectionLength +=
          userDetails.courses[i].courseContent[j].subSection.length
      }
      let courseProgressCount = await CourseProgress.findOne({
        courseID: userDetails.courses[i]._id,
        userId: userId,
      })
      courseProgressCount = courseProgressCount?.completedVideos.length
      if (SubsectionLength === 0) {
        userDetails.courses[i].progressPercentage = 100
      } else {
        // To make it up to 2 decimal point
        const multiplier = Math.pow(10, 2)
        userDetails.courses[i].progressPercentage =
          Math.round(
            (courseProgressCount / SubsectionLength) * 100 * multiplier
          ) / multiplier
      }
    }

    if (!userDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find user with id: ${userDetails}`,
      })
    }
    return res.status(200).json({
      success: true,
      message:"Enrolled courses fetched successfully!",
      data: userDetails.courses,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

exports.instructorDashboard = async (req, res) => {
  try {
    const courseDetails = await Course.find({ instructor: req.user.id })

    const courseData = courseDetails.map((course) => {
      const totalStudentsEnrolled = course.studentsEnrolled.length
      const totalAmountGenerated = totalStudentsEnrolled * course.price

      // Create a new object with the additional fields
      const courseDataWithStats = {
        _id: course._id,
        courseName: course.courseName,
        courseDescription: course.courseDescription,
        // Include other course properties as needed
        totalStudentsEnrolled,
        totalAmountGenerated,
      }

      return courseDataWithStats
    })

    res.status(200).json({ courses: courseData })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}











// const mongoose=require("mongoose");
// const User=require('../models/User');
// const Profile=require('../models/Profile');
// const Course=require("../models/Course");
// const CourseProgress=require("../models/CourseProgress");
// const { uploadImageOnCloudinary } = require('../utils/uploadImage');

// exports.updateProfile = async(req,res)=>{
//     try {
//         const {
//           firstName = "",
//           lastName = "",
//           dateOfBirth = "",
//           about = "",
//           contactNumber = "",
//           gender = "",
//         } = req.body
//         const id = req.user.id
    
//         // Find the profile by id
//         const userDetails = await User.findById(id)
//         const profile = await Profile.findById(userDetails.additionalDetails)
    
//         const user = await User.findByIdAndUpdate(id, {
//           firstName,
//           lastName,
//         })
//         await user.save()
    
//         // Update the profile fields
//         profile.dateOfBirth = dateOfBirth
//         profile.about = about
//         profile.contactNumber = contactNumber
//         profile.gender = gender
    
//         // Save the updated profile
//         await profile.save()
    
//         // Find the updated user details
//         const updatedUserDetails = await User.findById(id)
//           .populate("additionalDetails")
//           .exec()
    
//         return res.json({
//           success: true,
//           message: "Profile updated successfully",
//           updatedUserDetails,
//         })
//       } catch (error) {
//         console.log(error)
//         return res.status(500).json({
//           success: false,
//           error: error.message,
//         })
//     }
//     // try{
//     //     //fetch data
//     //     const {gender,dateOfBirth="", about="",contactNumber}=req.body;
//     //     const userId=req.user.id;
//     //     //validate data
//     //     if(!gender || !contactNumber ||!userId){
//     //         return res.status(400).json({
//     //             success:false,
//     //             message:"All fields are required"
//     //         });
//     //     }
//     //     //find userDetails
//     //     const userDetails= await User.findById(userId);
//     //     //finding Profile details
//     //     const profileId=userDetails.additionalDetails;
//     //     const profileDetails= await Profile.findById(profileId);
//     //     //update profile details
//     //     profileDetails.gender=gender;
//     //     profileDetails.dateOfBirth= dateOfBirth;
//     //     profileDetails.about =about;
//     //     profileDetails.contactNumber=contactNumber;
//     //     //save this details into DB
//     //     profileDetails.save();

//     //     //send suceess response
//     //     return res.status(200).json({
//     //         success:true,
//     //         message:"Profile details updated successfully",
//     //         profileDetails,
//     //     });
//     // }
//     // catch(error){
//     //     console.log("Unable to update profile ,try again");
//     //     return res.status(500).json({
//     //         success:false,
//     //         message:"Profile details not updated",
//     //         error:error.message
//     //     });
//     // }
// }


// //deleteAccount handler
// exports.deleteAccount = async(req,res)=>{
//     try{
//         //fetch data
//         const userId=req.user.id;
//         console.log("userId: ",req.user.id);
//         // console.log("userId type : ",typeof userId);
//         // console.log("Valid ObjectId:", mongoose.Types.ObjectId.isValid(userId));
        
//         //get userDetails
//         const user= await User.findById(userId);
//         if(!user){
//             return res.status(400).json({
//                 success:false,
//                 message:"User not found!"
//             });
//         }
//         // delete Profile of user
//         // Unenroll user from all courses-------------->
//         //fetch all courses from userDetails
//         //loop on courses array of user
//         //fetch every CourseDetails using courseId and update studentsEnrolled .
//         //like findByIdAndUpdate({_id:courseId}},
//         //                       { $pull:{studentsEnrolled:userId}
//         //                       });

//         await Profile.findByIdAndDelete({ _id: user.additionalDetails });
//           // remove user from enrolled courses
//           for (const courseId of user.courses) {
//             await Course.findByIdAndUpdate(
//               courseId,
//               { $pull: { studentsEnroled: userId } },
//               { new: true }
//             )
//           }

//         await User.findByIdAndDelete(userId);
//         //delete all course progress also
//         await CourseProgress.deleteMany({ userId: userId});

//         //send success response
//         return res.status(200).json({
//             success:true,
//             message:"Delete request sent/executed successfully!",
//         });

//     }
//     catch(error){
//         console.log("Unable to delete profile ,try again");
//         return res.status(500).json({
//             success:false,
//             message:"Profile deletion failed!",
//             error:error.message
//         });
//     }
// }

// //get all details of user
// exports.getAllUserDetails = async(req,res)=>{
//     try{
//         //get id
//         const userId= req.user.id;
//         //fetch user details from DB
//         const userDetails=await User.findById({_id:userId})
//                                             .populate("additionalDetails")
//                                             .exec();
//         //send response
//         return res.status(200).json({
//             success:true,
//             message:"User details fetched successfully",
//             userDetails,
//         });
//     }
//     catch(error){
//         console.log("Unable to fetch all details of user");
//         return res.status(500).json({
//             success:false,
//             message:"User Details not fetched!",
//             error:error.message
//         });
//     }
// }

// exports.updateDisplayPicture = async(req,res)=>{
//     try{
//         const image=req.files.displayPicture;
//         const userId=req.user.id;
//         if(!image){
//             return res.status(400).json({
//                 success:false,
//                 message:"Please Provide image! Image not found"
//             });
//         }

//         const uploadedImage = await uploadImageOnCloudinary(image,
//                                                             process.env.FOLDER_NAME,
//                                                             1000,
//                                                             1000);

//         const updatedProfile = await User.findOneAndUpdate({_id:userId},
//                                                         {image:uploadedImage.secure_url},
//                                                         {new:true}
//                                                         );

//         return res.status(200).json({
//             success:true,
//             message:"Profile picture updated successfully!",
//             updatedProfile
//         });
//     }
//     catch(error){
//         console.log("Error while updating profile picture: ",error.message);
//         return res.status(500).json({
//             success:false,
//             message:"Some Internal Error while updating profile picture!"
//         });
//     }
// }