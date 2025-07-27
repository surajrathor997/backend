



import express from "express";
import {
  publishVideo,
  getVideoById,
  updateVideo,
  getAllVideos,
} from "../controllers/video.controller.js";
import { uploadVideoAndThumbnail, upload } from "../middlewares/multer.video.middleware.js";

const router = express.Router();

router.post("/upload", uploadVideoAndThumbnail, publishVideo);
router.get("/:videoId", getVideoById);
router.put("/update/:videoId", upload.single("thumbnail"), updateVideo);
router.get("/", getAllVideos);

export default router;




























































































// import { Router } from "express";
// import { getAllVideos,uploadVideo,getVideoById,publishAVideo,updateVideo } from "../controllers/video.controller.js";
// import { upload } from "../middlewares/multer.middleware.js";
// import { verifyJWT } from "../middlewares/auth.middleware.js";

// const router = Router();



// router.route("/upload").post(
//   verifyJWT,                 // JWT auth
//   upload.single("video"),    // Multer single file
//   uploadVideo                // Controller
// );


// router.route("/videos").get(getAllVideos);
// router.post("/publish", verifyJWT, upload.single("video"), publishAVideo);
// router.get("/videos/:id", getVideoById);
// router.route("/update/:id").put(updateVideo);

// //  router.get("/videos/:id", getVideoById)
// // "_id": "6882e3868040b4a12576ed28",
// // "videos"



 
// export default router;

 







