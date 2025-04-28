const bcrypt=require('bcrypt');
const User=require('../models/User');
const mailSender=require('../utils/mailSender');

exports.resetPasswordToken = async(req,res)=>{
    try{
        //fetching email from req.body
        const {email}=req.body;
        //validate mail and check existence user or not
        if(!email){
            return res.json({
                success:false,
                message:"Enter details carefully!"
            });
        }
        const user= await User.findOne({email:email});
        if(!user){
            return res.json({
                success:false,
                message:"Not a registered user!,Enter registered email."
            });
        }

        //generating token for URL
        const token= crypto.randomUUID();
        // updating User data by adding token and token expiry time
        const updatedDetails= await User.findOneAndUpdate({email},
                                        {
                                            token:token,
                                            resetPasswordExpires:Date.now() + 5*60*1000,
                                        },
                                        {new:true});

        //creating url for reseting password
        const url=`http://localhost:3000/update-password/${token}`;
        //sending mail containing link to update password.
        await mailSender(email,
                        "Reset Password Link",
                        `Reset password link ${url}`,
        );
        return res.json({
            success:true,
            message:"Email sent successfully, check your email and change Password"
        });
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:"Something went wrong while mailing password reset link!"
        });
    }
}


//reset password handler
exports.resetPassword = async(req,res)=>{
    try{
        //fetching data like pass,cnfPass,token
        const {password,confirmPassword,token}=req.body;
        //validating data
        if(password !== confirmPassword){
            return res.json({
                success:false,
                message:"Password and confirm password doesn't matched",
            });
        }

        //getting user details from DB using token
        const userDetails= await User.findOne({token:token});
        //if no userDetails -invalid token
        if(!userDetails){
            return res.json({
                success:false,
                message:"Invalid Token!",
            });
        }
        //token expiry check
        if(userDetails.resetPasswordExpires < Date.now()){
            return res.json({
                success:false,
                message:"Token expired, try again",
            });
        }

        //Hashing Password
        const hashedPassword= await bcrypt.hash(password,10);
        //updating password in DB
        await User.findOneAndUpdate(
                                    {token:token},
                                    {password:hashedPassword},
                                    {new:true});

        return res.status(200).json({
            success:true,
            message:"Password changed successfully!",
        });
    }
    catch(error){
        console.log("error in password updation",error.message);
        return res.status(500).json({
            success:false,
            message:"Something went wrong in updating password!",
        });
    }
}