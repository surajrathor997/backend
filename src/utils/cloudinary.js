import {v2 as cloudinary} from "cloudinary"

import fs from "fs"

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});





const uploadOnCloudinary = async (localFilePath) =>{
    try{
        if(!localFilePath){
            console.log("file not found");
            return null
        }
        const response = await cloudinary.uploader.upload(localFilePath,{resource_type:"auto"})

        // File hasbeen uploaded successfully
        console.log("File is uploaded on cloudinary",response.url);
        return response;



    }
    catch(error){
        fs.unlinkSync(localFilePath) // remove the locally saved temparary file as the upload operation got failed
        return null;

    }
}

 


export {uploadOnCloudinary}











 