
import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  cloudinary_url:process.env.CLOUDINARY_URL,
  secure:true

});
 
const uploadOnCloudinary = async (localFilePath) =>{

    try{
        if(!localFilePath){
            console.log("file not found");
            return null
        }

         const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
                api_key: process.env.CLOUDINARY_API_KEY
         });
        // File hasbeen uploaded successfully
        console.log("File is uploaded on cloudinary",response.url);
        return response;


    }
    catch (error) {
                console.log("24 mai catch part mai hu")

    console.error("❌ Cloudinary upload failed:", error.message);

    // ✅ Only delete file if it actually exists
    if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
    } else {
        console.warn("⚠️ Tried to delete file but it doesn't exist:", localFilePath);
    }

    return null;
}

}


 
export {uploadOnCloudinary}






 