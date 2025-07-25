import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import { uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/Apiresponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

 


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
    if(!incomingRefreshToken){
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


const changeCurrentPassword = asyncHandler(async (req,res) => {
    const {oldPassword,newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Old Password")
    }

    user.password = newPassword
   await user.save({validateBeforeSave:false})

   return res
   .status(200)
   .json(new ApiResponse(200,{},"Password change Successfully"))
})

const getCurrentUser = asyncHandler( async (req,res) =>{
    return res
    .status(200)
    .json(
        new ApiResponse(200,req.user,"current user successfully")
    )
})

const updateAccountDetails = asyncHandler( async (req,res) =>{
    const {fullname,email} = req.body

    if(!fullname || !email){
        throw new ApiError(400,"All fields are required")

    }
   const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname:fullname,
                email:email
            }
        },
        {new:true}

    ).select("-password")


    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details successfully"))



})


const updateUserAvatar = asyncHandler( async (req,res) =>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is missing")
    }

     const avatar = await uploadOnCloudinary(avatarLocalPath)
     if(!avatar.url){

        throw new ApiError(400,"Erroe while uploading on avatar")
     }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {
            new:true
        }


     ).select("-password")

     return res 
     .status(200)
     .json(
        new ApiResponse(200,user,"Avatar file update successfully")
     )

})



const updateUserCoverImage = asyncHandler( async (req,res) =>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"coverImage file is missing")
    }

     const coverImage = await uploadOnCloudinary(coverImageLocalPath)
     if(!coverImage.url){

        throw new ApiError(400,"Erroe while uploading on coverImage")
     }

    const user =  await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:coverImage.url
            }
        },
        {
            new:true
        }


     ).select("-password")

      return res 
     .status(200)
     .json(
        new ApiResponse(200,user,"cover Image file is update successfully")
     )

})


// const getUserChannelProfile = asyncHandler( async(req,res) =>{
//     const {username} = req.params

//     if(!username?.trim()){
//         throw new ApiError(400,"username is missing")
//     }

//     const channel = await User.aggregate([
//         {
//             $match:{
//                 username:username?.toLowerCase()
//             }
//         },
//         {
//             $lookup:{
//                 from:"subscriptions",
//                 localField:"_id",
//                 foreignField:"channel",
//                 as:"subscribers"
//             }
//         },
//         {
            
//             $lookup:{
//                  from:"subscriptions",
//                 localField:"_id",
//                 foreignField:"subscriber",
//                 as:"subscribedTo"
//             }
//         },
//         // {
//         //     $addFields:{
//         //         subscribersCount:{
//         //             $size:"$subscribers"
//         //         },
//         //         channelsSubscribedToCount:{
//         //             $size:"$subscribedTo"
//         //         },
//         //         isSubscribed:{
//         //             $cond:{
//         //                 if:{$in:[req.user?._id,"subscribers.subscriber"]},
//         //                 then:true,
//         //                 else:false
//         //             }
//         //         }
//         //     }
//         // },



// {
//   $addFields: {
//     subscribersCount: {
//       $size: "$subscribers"
//     },
//     channelsSubscribedToCount: {
//       $size: "$subscribedTo"
//     },
//     isSubscribed: {
//       $cond: {
//         if: {
//           $in: [
//             req.user?._id,
//             {
//               $map: {
//                 input: "$subscribers",
//                 as: "sub",
//                 in: "$$sub.subscriber"
//               }
//             }
//           ]
//         },
//         then: true,
//         else: false
//       }
//     }
//   }
// },




//         {
//             $project:{
//                 fullname:1,
//                 username:1,
//                 subscribersCount:1,
//                 channelsSubscribedToCount:1,
//                 isSubscribed:1,
//                 avatar:1,
//                 coverImage:1,
//                 email:1



//             }
//         }

//     ])
//     console.log("channel data hai ",channel)

//     if(!channel?.length){
//         throw new ApiError(404,"channel does not exists")
//     }

//     return res
//     .status(200)
//     .json(
//         new ApiResponse(200,channel[0],"user channel fetch successfully")
//     )



// })



























const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  console.log("username params se liya hai",req.params)

  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
        
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        channelsSubscribedToCount: { $size: "$subscribedTo" },
        isSubscribed: {
          $cond: {
            if: {
              $in: [
                req.user?._id,
                {
                  $map: {
                    input: "$subscribers",
                    as: "sub",
                    in: "$$sub.subscriber",
                  },
                },
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  console.log("channel data hai ", channel);

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist");
  }

  return res.status(200).json(
    new ApiResponse(200, channel[0], "User channel fetched successfully")
  );
});






































































































































const getWatchHistory = asyncHandler( async (req,res) =>{
    const user = await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                        from:"user",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[
                            {
                                $project:{
                                    fullname:1,
                                    username:1,
                                    avatar:1
                                }
                            }
                        ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]

            }
        }
    ])

    return res 
    .status(200)
    .json(
        new ApiResponse(200,
            user[0].watchHistory,
            "watch History fetched successfully "
        )
    )
})








export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory

}