import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { Video } from "../models/video.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

/**
 * Upload a new video (with title, description, video file, and thumbnail)
 */
export const publishVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const videoFile = req.files?.video?.[0];
  const thumbnailFile = req.files?.thumbnail?.[0];

  if (!videoFile) {
    throw new ApiError(400, "Video file is required");
  }

  // Upload video to Cloudinary
  const videoUpload = await uploadOnCloudinary(videoFile.path);
  if (!videoUpload?.url) {
    throw new ApiError(500, "Failed to upload video to Cloudinary");
  }

  // Upload thumbnail if provided
  let thumbnailUrl = "";
  if (thumbnailFile) {
    const thumbUpload = await uploadOnCloudinary(thumbnailFile.path);
    if (!thumbUpload?.url) {
      throw new ApiError(500, "Failed to upload thumbnail");
    }
    thumbnailUrl = thumbUpload.url;
  }

  // Extract user from token
  const token = req.cookies?.accessToken || req.headers.authorization?.replace("Bearer ", "");
  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

  const newVideo = await Video.create({
  title,
  description,
  videoUrl: videoUpload.url,
  thumbnail: thumbnailUrl,
  owner: decoded?._id,
  videoFile: videoUpload.public_id || videoUpload.url, // 🔁 required field
  duration: videoUpload.duration || 0                   // 🔁 required field
});

  return res.status(201).json(new ApiResponse(201, newVideo, "Video published successfully"));
});

/**
 * Get a video by ID
 */
export const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  console.log("video id ",req.owner._id)

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId).populate("owner", "username email");

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res.status(200).json(new ApiResponse(200, video, "Video fetched successfully"));
});

/**
 * Update video details
 */
export const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const { title, description } = req.body;
  if (title) video.title = title;
  if (description) video.description = description;

  if (req.file) {
    const thumbUpload = await uploadOnCloudinary(req.file.path);
    if (!thumbUpload?.url) {
      throw new ApiError(500, "Failed to upload thumbnail");
    }
    video.thumbnail = thumbUpload.url;
  }

  await video.save();

  return res.status(200).json(new ApiResponse(200, video, "Video updated successfully"));
});

/**
 * Get all videos (with optional search/sort)
 */
export const getAllVideos = asyncHandler(async (req, res) => {
  const { search = "", sortBy = "createdAt", sortOrder = "desc" } = req.query;
  console.log("request ander kya hai",req.query._id)

  const query = search ? { title: { $regex: search, $options: "i" } } : {};

  const videos = await Video.find(query)
    .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
    .populate("owner", "username");

  return res.status(200).json(new ApiResponse(200, videos, "Videos fetched"));
});
