const nodemailer=require('nodemailer');
require("dotenv").config();

const mailSender = async(email,title,body)=>{
    try{
        const transporter= nodemailer.createTransport({
            host:process.env.MAIL_HOST,
            // port: 587,  // Use 465 for SSL or 587 for TLS
            // secure: false, // Set `true` for port 465, `false` for other ports
            auth:{
                user:process.env.MAIL_USER,
                pass:process.env.MAIL_PASS
            },
        });

        let info= await transporter.sendMail({
            from:"Study Notion Ed-Tech Platform",
            to:`${email}`,
            subject:`${title}`,
            html:`${body}`
        });

        console.log(info);
        return info;
    }
    catch(error){
        console.error("Error occured while sending mail!",error.message);
    }
}

module.exports = mailSender;