const Section = require("../models/Section");
const Course = require("../models/Course");
const SubSection = require("../models/SubSection");
// CREATE a new section
exports.createSection = async (req, res) => {
	try {
		// Extract the required properties from the request body
		const { sectionName, courseId } = req.body;

		// Validate the input
		if (!sectionName || !courseId) {
			return res.status(400).json({
				success: false,
				message: "Missing required properties",
			});
		}

		// Create a new section with the given name
		const newSection = await Section.create({ sectionName });

		// Add the new section to the course's content array
		const updatedCourse = await Course.findByIdAndUpdate(
			courseId,
			{
				$push: {
					courseContent: newSection._id,
				},
			},
			{ new: true }
		)
			.populate({
				path: "courseContent",
				populate: {
					path: "subSection",
				},
			})
			.exec();

		// Return the updated course object in the response
		res.status(200).json({
			success: true,
			message: "Section created successfully",
			updatedCourse,
		});
	} catch (error) {
		// Handle errors
		res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// UPDATE a section
exports.updateSection = async (req, res) => {
	try {
		const { sectionName, sectionId,courseId } = req.body;
		const section = await Section.findByIdAndUpdate(
			sectionId,
			{ sectionName },
			{ new: true }
		);

		const course = await Course.findById(courseId)
		.populate({
			path:"courseContent",
			populate:{
				path:"subSection",
			},
		})
		.exec();

		res.status(200).json({
			success: true,
			message: section,
			data:course,
		});
	} catch (error) {
		console.error("Error updating section:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error",
		});
	}
};

// DELETE a section
exports.deleteSection = async (req, res) => {
	try {

		const { sectionId, courseId }  = req.body;
		await Course.findByIdAndUpdate(courseId, {
			$pull: {
				courseContent: sectionId,
			}
		})
		const section = await Section.findById(sectionId);
		console.log(sectionId, courseId);
		if(!section) {
			return res.status(404).json({
				success:false,
				message:"Section not Found",
			})
		}

		//delete sub section
		await SubSection.deleteMany({_id: {$in: section.subSection}});

		await Section.findByIdAndDelete(sectionId);

		//find the updated course and return 
		const course = await Course.findById(courseId).populate({
			path:"courseContent",
			populate: {
				path: "subSection"
			}
		})
		.exec();

		res.status(200).json({
			success:true,
			message:"Section deleted",
			data:course
		});
	} catch (error) {
		console.error("Error deleting section:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error",
		});
	}
};   




// const Section = require("../models/Section");
// const Course = require("../models/Course");


// exports.createSection = async(req,res)=>{
//     try{
//         //fetch data
//         const {sectionName,courseId}=req.body;
//         //validate data
//         if(!sectionName ||!courseId){
//             return res.status(400).json({
//                 success:false,
//                 message:"All fields are required"
//             });
//         }
//         //create a DB entry
//         const newSection= await Section.create({sectionName});
//         //update course with this section id
//         const updatedCourse= await Course.findByIdAndUpdate(courseId,
//                                                         { $push:{
//                                                             courseContent:newSection._id,
//                                                         }},
//                                                         {new:true})
//                                                         .populate("courseContent").exec();
//         // send success response
//         return res.status(200).json({
//             success:true,
//             message:"Section created successfully",
//             newSection,
//         });
//     }
//     catch(error){
//         console.log(error);
//         return res.status(500).json({
//             success:false,
//             message:"Failed to create section ,try again.",
//             error:error.message,
//         });
//     }
// }

// //updateSection controller
// exports.updateSection = async(req,res)=>{
//     try{
//         //fetch data
//         const {sectionName,sectionId}=req.body;
//         //validate data
//         if(!sectionName ||!sectionId){
//             return res.status(400).json({
//                 success:false,
//                 message:"All fields are required"
//             });
//         }
//         //update DB with newSectionName
//         const updatedSection= await Section.findByIdAndUpdate(sectionId,
//                                                     {sectionName:sectionName},
//                                                     {new:true});
//         //send success response
//         return res.status(200).json({
//             success:true,
//             message:"Section updated successfully",
//             updatedSection,
//         });
//     }
//     catch(error){
//         console.log(error);
//         return res.status(500).json({
//             success:false,
//             message:"Failed to update section ,try again.",
//             error:error.message,
//         });
//     }
// }

// //deleteSection controller
// exports.deleteSection = async(req,res)=>{
//     try{
//         //fetch data 
//         const {sectionId}=req.params;
//         //validate data
//         if(!sectionId){
//             return res.status(400).json({
//                 success:false,
//                 message:"All fields are required"
//             });
//         }
//         //delete data from DB
//         const deletedSection= await Section.findByIdAndDelete(sectionId);
//         //TODO: Do we need to delete this section Id from Course data
        
//         //send Suucess response
//         return res.status(200).json({
//             success:true,
//             message:"Section deleted successfully",
//             deletedSection,
//         });
//     }
//     catch(error){
//         console.log(error);
//         return res.status(500).json({
//             success:false,
//             message:"Failed to delete section ,try again.",
//             error:error.message,
//         });
//     }
// }