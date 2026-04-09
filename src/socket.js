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
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// In-memory: userId -> Set of socketIds (supports multiple tabs)
const onlineUsers = new Map();
// In-memory: roomKey -> { userId, userName, until }[]
const typingState = new Map();

const setOnline = (userId, socketId) => {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
};

const setOffline = (userId, socketId) => {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return false;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    return true; // truly offline now
  }
  return false;
};

const isOnline = (userId) => {
  const s = onlineUsers.get(String(userId));
  return !!s && s.size > 0;
};

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  // ─── Auth middleware ───────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) return next(new Error("No token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select(
        "fullName email role avatarUrl",
      );
      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  // ─── Connection ────────────────────────────────────────────
  io.on("connection", async (socket) => {
    const me = socket.user;
    const myId = String(me._id);

    // Track online
    setOnline(myId, socket.id);

    // Personal presence room
    socket.join(`user:${myId}`);

    // Join existing DM rooms
    const dms = await Conversation.find({
      type: "dm",
      participants: me._id,
    }).select("_id");
    dms.forEach((c) => socket.join(`dm:${c._id}`));

    // Join group rooms
    const groups = await ChatGroup.find({
      "members.userId": me._id,
      isArchived: false,
    }).select("_id");
    groups.forEach((g) => socket.join(`group:${g._id}`));

    // Broadcast this user is now online
    io.emit("presence:online", { userId: myId });

    // ── Presence: get online list ──
    socket.on("presence:who", (userIds, cb) => {
      const result = {};
      for (const uid of userIds || []) result[uid] = isOnline(uid);
      if (typeof cb === "function") cb(result);
    });

    // ── Room refresh (after joining group / accepting invite) ──
    socket.on("rooms:refresh", async () => {
      const dms2 = await Conversation.find({
        type: "dm",
        participants: me._id,
      }).select("_id");
      dms2.forEach((c) => socket.join(`dm:${c._id}`));

      const groups2 = await ChatGroup.find({
        "members.userId": me._id,
        isArchived: false,
      }).select("_id");
      groups2.forEach((g) => socket.join(`group:${g._id}`));
    });

    // ── Typing indicators ──
    socket.on("typing:start", ({ targetType, roomId }) => {
      const key = `${targetType}:${roomId}`;
      if (!typingState.has(key)) typingState.set(key, []);

      const list = typingState.get(key).filter((t) => t.userId !== myId);
      list.push({
        userId: myId,
        userName: me.fullName,
        until: Date.now() + 4000,
      });
      typingState.set(key, list);

      const room = targetType === "dm" ? `dm:${roomId}` : `group:${roomId}`;
      socket.to(room).emit("typing:update", {
        key,
        typing: list.map((t) => ({ userId: t.userId, userName: t.userName })),
      });
    });

    socket.on("typing:stop", ({ targetType, roomId }) => {
      const key = `${targetType}:${roomId}`;
      if (!typingState.has(key)) return;

      const list = typingState.get(key).filter((t) => t.userId !== myId);
      typingState.set(key, list);

      const room = targetType === "dm" ? `dm:${roomId}` : `group:${roomId}`;
      socket.to(room).emit("typing:update", {
        key,
        typing: list.map((t) => ({ userId: t.userId, userName: t.userName })),
      });
    });

    // ── Read receipt ──
    socket.on("messages:read", ({ targetType, roomId }) => {
      const room = targetType === "dm" ? `dm:${roomId}` : `group:${roomId}`;
      socket.to(room).emit("messages:read", {
        userId: myId,
        roomId,
        targetType,
        at: new Date().toISOString(),
      });
    });

    // ── Disconnect ──
    socket.on("disconnect", () => {
      const trulyOffline = setOffline(myId, socket.id);
      if (trulyOffline) {
        io.emit("presence:offline", { userId: myId });
      }
      // Clean typing state
      for (const [key, list] of typingState.entries()) {
        const cleaned = list.filter((t) => t.userId !== myId);
        typingState.set(key, cleaned);
        // notify room
        const [type, id] = key.split(":");
        const room = type === "dm" ? `dm:${id}` : `group:${id}`;
        io.to(room).emit("typing:update", { key, typing: cleaned });
      }
    });
  });

  // ─── Cleanup expired typing every 5s ──────────────────────
  setInterval(() => {
    const now = Date.now();
    for (const [key, list] of typingState.entries()) {
      const fresh = list.filter((t) => t.until > now);
      typingState.set(key, fresh);
    }
  }, 5000);

  // ─── Helper emitters for routes ───────────────────────────
  const emitDmMessage = (conversationId, payload) =>
    io.to(`dm:${conversationId}`).emit("message:new", payload);

  const emitGroupMessage = (groupId, payload) =>
    io.to(`group:${groupId}`).emit("message:new", payload);

  const emitInvite = (userId, payload) =>
    io.to(`user:${userId}`).emit("invite:new", payload);

  const emitMessageUpdate = (targetType, roomId, payload) => {
    const room = targetType === "dm" ? `dm:${roomId}` : `group:${roomId}`;
    io.to(room).emit("message:update", payload);
  };

  const emitMessageDelete = (targetType, roomId, messageId) => {
    const room = targetType === "dm" ? `dm:${roomId}` : `group:${roomId}`;
    io.to(room).emit("message:delete", { messageId });
  };

  const emitReaction = (targetType, roomId, payload) => {
    const room = targetType === "dm" ? `dm:${roomId}` : `group:${roomId}`;
    io.to(room).emit("message:reaction", payload);
  };

  return {
    io,
    emitDmMessage,
    emitGroupMessage,
    emitInvite,
    emitMessageUpdate,
    emitMessageDelete,
    emitReaction,
    isOnline,
  };
}
