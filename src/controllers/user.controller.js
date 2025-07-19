import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import { uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/Apiresponse.js";
 


const registerUser = asyncHandler(async (req,res) =>{

    // REGISTER USER STEPS

    // 1 Get user detail from frontend 
    // 2 validation - Not Empty
    // 3 check if user already exits :  username , email
    // 4 check for image , check for avatar 
    // 5 upload them to cloudinary , avatar
    // 6 create user object - crate entry in db 
    // 7 remove password and refresh token field from response
    // 8 check for user creation 

    // 9 return res




    // get user detail
    const { fullname,email,username,password } = req.body
    console.log("email",email);
    // console.log("body",req.body);



    // 2 validation
    if(
        [fullname,email,username,password].some( (field) =>
            field?.trim() === "")
    ){
        throw new ApiError(400,"All fields are required")
    }
    // 3 check if user already exits :  username , email
   const exitedUser = await User.findOne({
        $or:[{username },{email}]

    })

    if(exitedUser){
        throw new ApiError(409,"user with email or usernamev already exists")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }
    if(!avatarLocalPath){
        throw new ApiError(400," 12 Avatar file is required")
    }
   const avatar = await uploadOnCloudinary(avatarLocalPath)
   const  coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if(!avatar){
     throw new ApiError(400," 21  Avatar file is required")
   }

  const user = await User.create({
    fullname,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
   })


   const createdUser = await User.findById(user._id).select("-password -refreshToken")

   if(!createdUser){
    throw new ApiError(500,"something went wrong while requesting the user")
   }

   return res.status(201).json(
    new ApiResponse(200,createdUser,"User register successfully")
   )
    
})



export {registerUser}