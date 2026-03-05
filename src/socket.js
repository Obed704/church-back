import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "./models/User.js";
import Conversation from "./models/Conversation.js";
import ChatGroup from "./models/ChatGroup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env like your other files
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) return next(new Error("No token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("fullName email role");
      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch (e) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const me = socket.user;
    const myId = String(me._id);

    // Personal room
    socket.join(`user:${myId}`);

    // Join DM rooms
    const dms = await Conversation.find({ type: "dm", participants: me._id }).select("_id");
    dms.forEach((c) => socket.join(`dm:${c._id}`));

    // Join group rooms
    const groups = await ChatGroup.find({ "members.userId": me._id }).select("_id");
    groups.forEach((g) => socket.join(`group:${g._id}`));

    // Client can request refresh rooms after join/accept invite
    socket.on("rooms:refresh", async () => {
      const dms2 = await Conversation.find({ type: "dm", participants: me._id }).select("_id");
      dms2.forEach((c) => socket.join(`dm:${c._id}`));

      const groups2 = await ChatGroup.find({ "members.userId": me._id }).select("_id");
      groups2.forEach((g) => socket.join(`group:${g._id}`));
    });

    socket.on("disconnect", () => {});
  });

  // helper emitters you can call from routes (optional)
  const emitDmMessage = (conversationId, payload) => {
    io.to(`dm:${conversationId}`).emit("message:new", payload);
  };

  const emitGroupMessage = (groupId, payload) => {
    io.to(`group:${groupId}`).emit("message:new", payload);
  };

  const emitInvite = (userId, payload) => {
    io.to(`user:${userId}`).emit("invite:new", payload);
  };

  return { io, emitDmMessage, emitGroupMessage, emitInvite };
}