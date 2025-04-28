const mongoose = require("mongoose");

// Define the Courses schema
const coursesSchema = new mongoose.Schema({
	courseName: { type: String },
	courseDescription: { type: String },
	instructor: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: "User",
	},
	whatYouWillLearn: {
		type: String,
	},
	courseContent: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Section",
		},
	],
	ratingAndReviews: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "RatingAndReview",
		},
	],
	price: {
		type: Number,
	},
	thumbnail: {
		type: String,
	},
	tag: {
		type: [String],
		required: true,
	},
	category: {
		type: mongoose.Schema.Types.ObjectId,
		// required: true,
		ref: "Category",
	},
	studentsEnrolled: [
		{
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: "User",
		},
	],
	instructions: {
		type: [String],
	},
	status: {
		type: String,
		enum: ["Draft", "Published"],
	},
	createdAt: {
		type:Date,
		default:Date.now
	},
});

// Export the Courses model
module.exports = mongoose.model("Course", coursesSchema);







// const mongoose=require('mongoose');

// const course=new mongoose.Schema({
//     courseName:{
//         type:String,
//         required:true,
//         trim:true
//     },
//     courseDescription:{
//         type:String,
//         required:true
//     },
//     instructor:{
//         type:mongoose.Schema.Types.ObjectId,
//         ref:"User",
//         required:true,
//     },
//     whatYouWillLearn:{
//         type:String,
//         required:true
//     },
//     courseContent:[
//         {
//             type:mongoose.Schema.Types.ObjectId,
//             ref:"Section",
//         },
//     ],
//     ratingAndReviews:[
//         {
//             type:mongoose.Schema.Types.ObjectId,
//             ref:"RatingAndReview"
//         },
//     ],
//     price:{
//         type:Number,
//         required:true,
//         trim:true
//     },
//     thumbnail:{
//         type:String,
//         required:true,
//         trim:true
//     },
//     category:{
//         type:mongoose.Schema.Types.ObjectId,
//         ref:"Category",
//     },
//     tags:{
//         type:[String],
//         required:true
//     },
//     studentEnrolled:[
//         {
//             type:mongoose.Schema.Types.ObjectId,
//             ref:"User",
//         }
//     ],
//     status:{
//         type:String,
//         enum:["Draft" , "Published"]
//     },
//     // language:{
//     //     type:String,
//     //     // required:true
//     // }
// });

// module.exports = mongoose.model("Course", course);