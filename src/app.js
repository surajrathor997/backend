import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,

}));

app.use(express.json({ limit: "16kb"}))

app.use(express.urlencoded({extended:true, limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser());


//router import
import userRouter from "./routes/user.routes.js"
import  uploadVideo from "./routes/video.routes.js"


// router declaration
app.use("/api/v1/users",userRouter)
app.use("/api/v1/video",uploadVideo)


//http://localhost:8000/api/v1/video/upload
// http://localhost:8000/api/v1/users/register


export{app}