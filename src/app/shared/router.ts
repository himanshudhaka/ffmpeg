import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { exec } from "child_process";

const gTTS = require("gtts");
const ffmpeg = require("fluent-ffmpeg");
const videoshow = require("videoshow");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/upload");
  },
  filename: function (req, file, cb) {
    const name = crypto.randomUUID() + path.extname(file.originalname);
    cb(null, name);
  },
});
const upload = multer({ storage: storage });

const router = express.Router();

router.post("/create_new_storage", (req, res, next) => {
  const token = crypto.randomBytes(16).toString("hex");
  console.log(token);
  res.cookie("token", token);
  res.send({
    status: "ok",
    message: "Storage Created Successfully",
  });
});

router.post("/upload_file", upload.single("my_file"), (req, res, next) => {
  if (req.file)
    res.send({
      status: "ok",
      file_path: "public/upload/" + req.file.filename,
    });
  else res.send({ message: "Please attach file" });
});

router.post("/text_file_to_audio", (req, res, next) => {
  const text = fs.readFileSync(req.body.file_path, "utf-8");
  const gtts = new gTTS(text, "en");
  const audio = "public/upload/" + crypto.randomUUID() + ".mp3";
  gtts.save(audio, (err: string, result: any) => {
    if (err) next(err);
    else
      res.send({
        status: "ok",
        message: "text to speech converted",
        audio_file_path: audio,
      });
  });
});

router.post("/merge_image_and_audio", (req, res, next) => {
  const img = req.body.image_file_path;
  const audio = req.body.audio_file_path;
  const video = "public/upload/" + crypto.randomUUID() + ".mp4";
  videoshow([img])
    .audio(audio)
    .save(video, (err: string, result: any) => {
      next(err);
    })
    .on("start", () => {
      console.log("ffmpeg process started");
    })
    .on("error", (err: any) => {
      next(err);
    })
    .on("end", function (output: any) {
      res.send({
        status: "ok",
        message: "Video Created Successfully",
        video_file_path: video,
      });
    });
});

router.post("/merge_video_and_audio", (req, res, next) => {
  const video = req.body.video_file_path;
  const audio = req.body.audio_file_path;
  const output = "public/upload/" + crypto.randomUUID() + ".mp4";
  exec(
    `ffmpeg -i ${video} -i ${audio} -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 ${output}`,
    (err: any, stdout: any, stderr: any) => {
      if (err) next(err);
      else
        res.send({
          status: "ok",
          message: "Video and Audio Merged Successfully",
          video_file_path: output,
        });
    }
  );
});

router.post("/merge_all_video", (req, res, next) => {
  const merged_video = ffmpeg();
  const videos = req.body.video_file_path_list;
  const video = "public/upload/" + crypto.randomUUID() + ".mp4";
  videos.forEach((video: any) => {
    merged_video.addInput(video);
  });
  merged_video
    .mergeToFile(video)
    .on("start", () => {
      console.log("ffmpeg process started");
    })
    .on("error", (err: any) => {
      next(err);
    })
    .on("end", () => {
      res.send({
        status: "ok",
        message: "Merged All Video Successfully",
        video_file_path: video,
      });
    });
});

router.get("/download_file", (req, res) => {
  let file = "";
  if (typeof req.query.file_path == "string") file = req.query.file_path;
  else res.send({ message: "Send one file only" });

  res.sendFile(path.resolve(__dirname, "../../../", file));
});

router.get("/my_upload_file", (req, res, next) => {
  const data = fs.readdirSync("public/upload");
  res.send({
    status: "ok",
    data,
  });
});

export default router;
