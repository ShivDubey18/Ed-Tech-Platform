const jwt=require('jsonwebtoken');
const User=require('../models/User');
require('dotenv').config();

//authN middleware
exports.auth = async(req,res,next)=>{
    try{
        //fetching token from various sources
        // console.log("Cookies:", req.cookies);
        const token= req.cookies.token ||
                     req.body.token ||
                     req.header("Authorization").replace("Bearer ", "");
        
        // console.log("Extracted token:", token);
        
        //validating token
        if(!token){
            return res.status(401).json({
                success:false,
                message:"Token missing!"
            })
        }

        //verifying token
        try{
            const decode= jwt.verify(token, process.env.JWT_SECRET);
            console.log(decode);
            req.user=decode;
        }
        catch(error){
            return res.status(401).json({
                success:false,
                message:"Invalid Token!"
            })
        }
        next(); //calling next middleware
    }
    catch(error){
        console.log("jwt token verification failed",error.message);
        return res.status(500).json({
            success:false,
            message:"Something went wrong while validating token!"
        });
    }
}

// isStudent Middleware
exports.isStudent = async(req,res,next)=>{
    try{
        // const accountType=req.user.accountType;
        const userDetails = await User.findOne({ email: req.user.email });
        if(userDetails.accountType !== "Student"){
            return res.status(401).json({
                success:false,
                message:`This is protected route for Students U can't access to it! AccType : ${accountType}`
            });
        }
        next();
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:"User role cannot be verified Plz try again!"
        })
    }
}

// isInstructor Middleware
exports.isInstructor = async(req,res,next)=>{
    try{
        const userDetails = await User.findOne({ email: req.user.email });
        if(userDetails.accountType !== "Instructor"){
            return res.status(401).json({
                success:false,
                message:`This is protected route for Students U can't access to it! AccType : ${accountType}`
            });
        }
        next();
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:"User role cannot be verified Plz try again!"
        })
    }
}

//isAdmin Middleware
exports.isAdmin = async(req,res,next)=>{
    try{
        const userDetails = await User.findOne({ email: req.user.email });
        if(userDetails.accountType !== "Admin"){
            return res.status(401).json({
                success:false,
                message:`This is protected route for Students U can't access to it! AccType : ${accountType}`
            });
        }
        next();
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:"User role cannot be verified Plz try again!"
        })
    }
}