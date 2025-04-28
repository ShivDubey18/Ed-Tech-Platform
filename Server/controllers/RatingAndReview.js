const RatingAndReview = require("../models/RatingAndReview");
const Course = require("../models/Course");
const { mongo, default: mongoose } = require("mongoose");

//createRating
exports.createRating = async (req, res) => {
    try{

        //get user id
        const userId = req.user.id;
        //fetchdata from req body
        const {rating, review, courseId} = req.body;
        //check if user is enrolled or not
        const courseDetails = await Course.findOne(
                                    {_id:courseId,
                                    studentsEnrolled: {$elemMatch: {$eq: userId} },
                                });

        if(!courseDetails) {
            return res.status(404).json({
                success:false,
                message:'Student is not enrolled in the course',
            });
        }
        //check if user already reviewed the course
        const alreadyReviewed = await RatingAndReview.findOne({
                                                user:userId,
                                                course:courseId,
                                            });
        if(alreadyReviewed) {
                    return res.status(403).json({
                        success:false,
                        message:'Course is already reviewed by the user',
                    });
                }
        //create rating and review
        const ratingReview = await RatingAndReview.create({
                                        rating, review, 
                                        course:courseId,
                                        user:userId,
                                    });
       
        //update course with this rating/review
        const updatedCourseDetails = await Course.findByIdAndUpdate({_id:courseId},
                                    {
                                        $push: {
                                            ratingAndReviews: ratingReview._id,
                                        }
                                    },
                                    {new: true});
        console.log(updatedCourseDetails);
        //return response
        return res.status(200).json({
            success:true,
            message:"Rating and Review created Successfully",
            ratingReview,
        })
    }
    catch(error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }
}



//getAverageRating
exports.getAverageRating = async (req, res) => {
    try {
            //get course ID
            const courseId = req.body.courseId;
            //calculate avg rating

            const result = await RatingAndReview.aggregate([
                {
                    $match:{
                        course: new mongoose.Types.ObjectId(courseId),
                    },
                },
                {
                    $group:{
                        _id:null,
                        averageRating: { $avg: "$rating"},
                    }
                }
            ])

            //return rating
            if(result.length > 0) {

                return res.status(200).json({
                    success:true,
                    averageRating: result[0].averageRating,
                })

            }
            
            //if no rating/Review exist
            return res.status(200).json({
                success:true,
                message:'Average Rating is 0, no ratings given till now',
                averageRating:0,
            })
    }
    catch(error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }
}


//getAllRatingAndReviews

exports.getAllRating = async (req, res) => {
    try{
            const allReviews = await RatingAndReview.find({})
                                    .sort({rating: "desc"})
                                    .populate({
                                        path:"user",
                                        select:"firstName lastName email image",
                                    })
                                    .populate({
                                        path:"course",
                                        select: "courseName",
                                    })
                                    .exec();
            return res.status(200).json({
                success:true,
                message:"All reviews fetched successfully",
                data:allReviews,
            });
    }   
    catch(error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    } 
}




// const { default: mongoose } = require("mongoose");
// const Course = require("../models/Course");
// const RatingAndReview = require("../models/RatingAndReview");


// // create Rating-Review controller
// exports.createRating = async(req,res)=>{
//     try{
//         //fetch courseId , userId ,rating and review req
//         const {courseId,rating,review}=req.body;
//         const {userId}=req.user;
//         if(!courseId ||!userId || !rating ||!review){
//             return res.status(400).json({
//                 success:false,
//                 message:"All fields are required"
//             });
//         }
//         //check if user already enrolled or not
//         const courseDetails = await Course.findOne({
//                                             _id:courseId,
//                                             studentEnrolled: {$elemMatch: {$eq:userId}},
//                                             });
//         if(!courseDetails){
//             return res.status(403).json({
//                 success:false,
//                 message:"You are not enrolled in this course"
//             });
//         }
//         // check if user already reviewed
//         const reviewed = await RatingAndReview.findOne({
//                                                 user:userId,
//                                                 course:courseId,
//                                             });
//         if(reviewed){
//             return res.status(400).json({
//                 success:false,
//                 message:"User have already reviewed this course"
//             });
//         }

//         //check rating is not more that 5.
//         // if(rating>5){
//         //     console.log("Give rating in range of 1 to 5.");
//         //     return res.status(400).json({
//         //         success:false,
//         //         message:"Rating should not be more than 5"
//         //     });
//         // }
//         //create a DB entry for Rating&Review
//         const uid=new mongoose.Schema.Types.ObjectId(userId); //converting from string to ObjectId
//         const response= await RatingAndReview.create({user:uid,
//                                                      rating,
//                                                      review,
//                                                      course:courseId
//                                                     });
//         console.log("rating and review is: ",response);
//         //update ratingAndReview in Course model
//         const updatedCourse= await Course.findByIdAndUpdate(courseId,
//                                                 {$push:{ratingAndReviews:response._id}},
//                                                 {new:true});
//         console.log("updated Course is: ",updatedCourse);
//         //send success response
//         return res.status(200).json({
//             success:true,
//             message:"Thanks for giving Rating and Review",
//             response
//         });
//     }
//     catch(error){
//         console.log("Error occured while posting rating and review");
//         return res.status(500).json({
//             success:false,
//             message:error.message
//         });
//     }
// }

// //getAverageRating handler/controller
// exports.getAverageRating = async(req,res)=>{
//     try{
//         //get courseId from req
//         const {courseId}=req.body;

//         //fetch courseDetails from DB
//         // const courseDetails= await Course.findById(courseId)
//         //                                           .populate(ratingAndReviews)
//         //                                           .exec();
//         // if(!courseDetails){
//         //     return res.status(404).json({
//         //         success:false,
//         //         message:"Course details not found"
//         //     });
//         // }

//         //calculate average rating
//         const result= await RatingAndReview.aggregate([
//             {
//                 $match:{
//                     course:new mongoose.Schema.Types.ObjectId(courseId)
//                 },
//             },
//             {
//                 $group:{
//                     _id:null,
//                     averageRating:{$avg:"$rating"},
//                 }
//             }
//         ])
//         //return rating
//         if(result.length>0){
//             return res.status(200).json({
//                 success:true,
//                 averageRating: result[0].averageRating
//             });
//         }
//         //if no rating available
//         else{
//             return res.status(200).json({
//                 success:true,
//                 message:"No rating available for this course till now",
//                 averageRating:0,
//             });
//         }


//         // // get all ratingsAndReviews
//         // let average=0;
//         // const ratingAndReviews= courseDetails.ratingAndReviews;
//         // // if course exist but has no ratings
//         // if (ratingAndReviews.length === 0) {
//         //     return res.status(204).json({
//         //         success: true,
//         //         message: `No ratings available for ${courseDetails.courseName} course`,
//         //         average: "0.0",  // Default rating
//         //     });
//         // }
        
//         // // if ratings exists then calculate average rating
//         // for (const ratingAndReview of ratingAndReviews) {
//         //     average+=ratingAndReview.rating;
//         // }
//         // average = (average/ratingAndReviews.length).toFixed(1); // division with one decimal point
//         // console.log("Average rating is : ",average);

//         //return response
//         // return res.status(200).json({
//         //     success:true,
//         //     message:`Average rating of ${courseDetails.courseName} course is :${average}`,
//         //     average,
//         // });
//     }
//     catch(error){
//         console.log("error while fetching course ratings");
//         return res.status(500).json({
//             success:false,
//             message:error.message
//         });
//     }
// }

// //getAllRating controller
// exports.getAllRating = async(req,res)=>{
//     try{
//         //get courseId from req
//         const {courseId}=req.body;
//         //fetch courseDetails from DB
//         const allRatings= await Course.findById(courseId,{ratingAndReviews:true ,_id:0});
//         if (!allRatings) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Course not found",
//             });
//         }

//         // If course exists but has no ratings
//         if(allRatings.ratingAndReviews.length===0){
//             return res.status(204).json({
//                 success:false,
//                 message:"No ratings and reviews available for this course"
//             });
//         }
        
//         console.log("all Ratings are: ",allRatings.ratingAndReviews);
//         //send success response
//         return res.status(200).json({
//             success:true,
//             message:"All Ratings and Reviews are fetched successfully",
//             allRatings:allRatings.ratingAndReviews,
//         });
        
//     }
//     catch(error){
//         console.log("error while fetching course ratingsAndReviews");
//         return res.status(500).json({
//             success:false,
//             message:error.message
//         });
//     }
// }