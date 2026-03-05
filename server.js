import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import cookieParser from "cookie-parser";

import connectDB from "./src/config/mongoConnect.js";

// Routes
import departmentRoutes from "./src/routes/departmentRoute.js";
import weekRoutes from "./src/routes/weeksRoute.js";
import preachingRoutes from "./src/routes/preachingsRoutes.js";
import sundayServiceRoutes from "./src/routes/sundayService.js";
import choirRoutes from "./src/routes/choirRoute.js";
import sermonRoutes from "./src/routes/sermonRoutes.js";
import songsRouter from "./src/routes/songRouter.js";
import eventRoutes from "./src/routes/EventsRoute.js";
import studyRoutes from "./src/routes/studyRoutes.js";
import baptismRoutes from "./src/routes/baptismRoute.js";
import donationRoutes from "./src/routes/donationRoute.js";
import authRoutes from "./src/routes/authRoute.js";
import videoRoutes from "./src/routes/videoRoute.js";
import LargeVideo from "./src/routes/LargeVideo.js";
import holidayRoutes from "./src/routes/HolidayRoutes.js";
import PreachRoutes from "./src/routes/dailyPreachingRoutes.js";
import commingeventsRoutes from "./src/routes/eventEvent.js";
import AdminVideo from "./src/routes/adminVideos.js";
import committeeRoutes from "./src/routes/committeeRoutes.js";



// NEW: chat
import usersRoutes from "./src/routes/users.js";
import chatRoutes from "./src/routes/chat.js";
import { initSocket } from "./src/socket.js";

import passport from "passport";
import session from "express-session";
import "./src/config/Passport.js";

// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Connect DB
connectDB();

// Middleware
app.use(express.json());

// ✅ cookie parser (helps your verifyToken if you ever use cookie auth)
app.use(cookieParser());

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/largeVideo", express.static(path.join(__dirname, "public", "largeVideo")));
app.use("/uploads/videos", express.static(path.join(__dirname, "public", "uploads", "videos")));
app.use("/videos", express.static(path.join(__dirname, "public/videos")));
app.use(express.static(path.join(__dirname, "public")));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// API Routes
app.use("/api/committees", committeeRoutes);
app.use("/api/choirs", choirRoutes);
app.use("/api/sundayService", sundayServiceRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/weeks", weekRoutes);
app.use("/api/dailyPreachings", preachingRoutes);
app.use("/api/sermons", sermonRoutes);
app.use("/api/songs", songsRouter);
app.use("/api/events", eventRoutes);
app.use("/api/studies", studyRoutes);
app.use("/api/baptism", baptismRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/admin/videos", AdminVideo);
app.use("/api/LargeVideo", LargeVideo);
app.use("/api/holiday", holidayRoutes);
app.use("/api/dailyPreachingsWord", PreachRoutes);
app.use("/api/commingevents", commingeventsRoutes);

// ✅ NEW: Users directory + Chat APIs
app.use("/api/users", usersRoutes);
app.use("/api/chat", chatRoutes);

// Health check
app.get("/", (req, res) => res.send("✅ API running"));

// ✅ Create HTTP server + attach socket
const server = http.createServer(app);
const socketApi = initSocket(server);

// ✅ Make socket available in routes via req.app.locals.socketApi
app.locals.socketApi = socketApi;

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

export default app;