import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import { uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/Apiresponse.js";
import jwt from "jsonwebtoken"
 


const  generateAccessAndRefreshToken = async (userId) =>{
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave:false })

        return {accessToken,refreshToken}

    }catch(error){
        throw new ApiError(500,"something went wrong while generating refresh and access Token")
        
    }

}

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

const loginUser = asyncHandler(async (req,res) => {
    // LogIn steps 



    // 1 req body -> data      request body se data lao
    // 2 username or email
    // 3 find the user         pta kro user hai ya nahi 
    // 4 password check
    // 5 access and refresh token
    // 6 send cookie
     
    const {email, username, password } = req.body

    if(!username || !email){
        if(!username && !email){

            throw new ApiError(400,"username or email is required")
        }
    }

   const user = await User.findOne({
        $or: [{username},{email}]

    })

    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    const isPasswordValid = await user.iscorrectPassword((password))

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user's password or tera password galat hai gadhe ")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    console.log("loginuser data:",loggedInUser)
    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User logged In successfully"
        )
    )



})

const logoutUser = asyncHandler( async (req,res) =>{

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly:true,
        secure:true
    }

    return res 
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out successfully"))

})

const refreshAccessToken = asyncHandler( async (req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

   try {
     const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
     )
 
     const user = await User.findById(decodedToken?._id)
 
     if(!user){
         throw new ApiError(401,"Invalid refresh Token")
     }
     if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401,"Refresh Token is expired")
 
     }
 
     const options = {
         httpOnly:true,
         secure:true
     }
 
    const {newAccessToken,newRefreshToken} =  await generateAccessAndRefreshToken(user._id)
 
     return res 
     .status(200)
     .cookie("accessToken",newAccessToken,options)
     .cookie("refreshToken",newRefreshToken,options)
     .json(
         new ApiResponse(
             200,
             {newAccessToken,refreshToken:newRefreshToken},
             "Access token refreshed"
         )
     )
   } catch (error) {
    throw new ApiError(401,error?.message || "Invalid refresh token")
    
   }


})






export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken

}