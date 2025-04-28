// Import necessary modules
const Section = require("../models/Section")
const SubSection = require("../models/SubSection")
const { uploadImageToCloudinary } = require("../utils/uploadImage")

// Create a new sub-section for a given section
exports.createSubSection = async (req, res) => {
  try {
    // Extract necessary information from the request body
    const { sectionId, title, description } = req.body
    const video = req.files.video

    // Check if all necessary fields are provided
    if (!sectionId || !title || !description || !video) {
      return res
        .status(404)
        .json({ success: false, message: "All Fields are Required" })
    }
    console.log(video)

    // Upload the video file to Cloudinary
    const uploadDetails = await uploadImageToCloudinary(
      video,
      process.env.FOLDER_NAME
    )
    console.log(uploadDetails)
    // Create a new sub-section with the necessary information
    const SubSectionDetails = await SubSection.create({
      title: title,
      timeDuration: `${uploadDetails.duration}`,
      description: description,
      videoUrl: uploadDetails.secure_url,
    })

    // Update the corresponding section with the newly created sub-section
    const updatedSection = await Section.findByIdAndUpdate(
      { _id: sectionId },
      { $push: { subSection: SubSectionDetails._id } },
      { new: true }
    ).populate("subSection")

    // Return the updated section in the response
    return res.status(200).json({ success: true, data: updatedSection })
  } catch (error) {
    // Handle any errors that may occur during the process
    console.error("Error creating new sub-section:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
}

exports.updateSubSection = async (req, res) => {
  try {
    const { sectionId, subSectionId, title, description } = req.body
    const subSection = await SubSection.findById(subSectionId)

    if (!subSection) {
      return res.status(404).json({
        success: false,
        message: "SubSection not found",
      })
    }

    if (title !== undefined) {
      subSection.title = title
    }

    if (description !== undefined) {
      subSection.description = description
    }
    if (req.files && req.files.video !== undefined) {
      const video = req.files.video
      const uploadDetails = await uploadImageToCloudinary(
        video,
        process.env.FOLDER_NAME
      )
      subSection.videoUrl = uploadDetails.secure_url
      subSection.timeDuration = `${uploadDetails.duration}`
    }

    await subSection.save()

    // find updated section and return it
    const updatedSection = await Section.findById(sectionId).populate(
      "subSection"
    )

    console.log("updated section", updatedSection)

    return res.json({
      success: true,
      message: "Section updated successfully",
      data: updatedSection,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the section",
    })
  }
}

exports.deleteSubSection = async (req, res) => {
  try {
    const { subSectionId, sectionId } = req.body
    await Section.findByIdAndUpdate(
      { _id: sectionId },
      {
        $pull: {
          subSection: subSectionId,
        },
      }
    )
    const subSection = await SubSection.findByIdAndDelete({ _id: subSectionId })

    if (!subSection) {
      return res
        .status(404)
        .json({ success: false, message: "SubSection not found" })
    }

    // find updated section and return it
    const updatedSection = await Section.findById(sectionId).populate(
      "subSection"
    )

    return res.json({
      success: true,
      message: "SubSection deleted successfully",
      data: updatedSection,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the SubSection",
    })
  }
}





// const Section = require('../models/Section');
// const SubSection = require('../models/SubSection');
// const {uploadImageOnCloudinary}=require('../utils/uploadImage');
// require('dotenv').config();

// exports.createSubSection = async(req,res)=>{
//     try{
//         //fetch data
//         const {title,description,timeDuration,sectionId}=req.body;
//         const video= req.files.video;

//         //validate data
//         if(!title ||!description ||!timeDuration ||!sectionId ||!video){
//             return res.status(400).json({
//                 success:false,
//                 message:"All fields are required"
//             });
//         }
//         // upload video on cloudinary
//         const uploadedVideo= await uploadImageOnCloudinary(video,process.env.FOLDER_NAME);
//         // create a subsection with DB entry
//         const newSubSection= await SubSection.create({
//                                         title:title,
//                                         description:description,
//                                         timeDuration:timeDuration,
//                                         videoUrl:uploadedVideo.secure_url,
//                                         });
//         //update Section with this Section Id
//         const updatedSection= await Section.findByIdAndUpdate({_id:sectionId},
//                                                             { $push:{
//                                                                subSection:newSubSection._id 
//                                                             }},
//                                                             {new:true});
//         //send Suucess response
//         return res.status(200).json({
//             success:true,
//             message:"SubSection created successfully",
//             newSubSection,
//         });
//     }
//     catch(error){
//         console.log(error);
//         return res.status(500).json({
//             success:false,
//             message:"Failed to create Subsection ,try again.",
//             error:error.message,
//         });
//     }
// }

// //updateSubSection controller
// exports.updateSubSection= async(req,res)=>{
//     try{
//         //fetch data 
//         const {title,timeDuration}=req.body;
//         const {subSectionId}=req.params;
//         //data validation
//         if(!title ||!description ||!subSectionId){
//             return res.status(400).json({
//                 success:false,
//                 message:"All fields are required"
//             });
//         }

//         //fetch SubSection details
//         const subSectionDetails= await SubSection.findByIdAndUpdate({_id:subSectionId},
//                                                         {
//                                                             title:title,
//                                                             description:description,
//                                                         },
//                                                         {new:true});
//         //send success response
//         return res.status(200).json({
//             success:true,
//             message:"SubSection updated successfully",
//             subSectionDetails,
//         });

//     }
//     catch(error){
//         console.log(error);
//         return res.status(500).json({
//             success:false,
//             message:"Failed to update Subsection ,try again.",
//             error:error.message,
//         });
//     }
// }


// //deleteSubSection
// exports.deleteSubSection= async(req,res)=>{
//     try{
//         // fetch subSectionId
//         const {subSectionId}=req.body;
//         if(!subSectionId){
//             return res.status(400).json({
//                 success:false,
//                 message:"All fields are required"
//             });
//         }
//         //delete data from DB
//         const deletedSubSection= await SubSection.findByIdAndDelete(subSectionId);

//         //TODO: Do we need to delete this subSection Id from Section data

//         //send Suucess response
//         return res.status(200).json({
//             success:true,
//             message:"SubSection deleted successfully",
//             deletedSubSection,
//         });

//     }
//     catch(error){
//         console.log(error);
//         return res.status(500).json({
//             success:false,
//             message:"Failed to delete Subsection ,try again.",
//             error:error.message,
//         });
//     }
// }