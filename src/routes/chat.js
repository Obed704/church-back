import express from "express";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import ChatGroup from "../models/ChatGroup.js";
import ChatMessage from "../models/ChatMessage.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

/* ---------------- Helpers ---------------- */

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

const makeDmKey = (a, b) => {
  const A = String(a);
  const B = String(b);
  return A < B ? `${A}:${B}` : `${B}:${A}`;
};

const isGroupMember = (groupDoc, userId) =>
  (groupDoc.members || []).some((m) => String(m.userId) === String(userId));

const getSocketApi = (req) => req.app?.locals?.socketApi;



//  { otherUserId }




/* ---------------- DM ---------------- */

// POST /api/chat/dm/start  { otherUserId }
// POST /api/chat/dm/start  { otherUserId }
// helper already in your file
const getOtherId = (participants, myId) =>
  (participants || []).find((p) => String(p) !== String(myId));

// POST /api/chat/dm/start  { otherUserId }
router.post("/dm/start", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    const otherId = req.body.otherUserId;

    if (!otherId) return res.status(400).json({ message: "otherUserId is required" });
    if (String(myId) === String(otherId))
      return res.status(400).json({ message: "Cannot chat with yourself" });

    const dmKey = makeDmKey(myId, otherId);

    let convo = await Conversation.findOne({ dmKey });
    if (!convo) {
      convo = await Conversation.create({
        type: "dm",
        dmKey,
        participants: [toObjectId(myId), toObjectId(otherId)],
      });
    }

    // ✅ include avatarUrl
    const otherUser = await User.findById(otherId)
      .select("fullName email role avatarUrl bio phone location website socials")
      .lean();

    // realtime notify (optional)
    const socketApi = getSocketApi(req);
    socketApi?.emitInvite?.(otherId, {
      type: "dm_created",
      conversationId: convo._id,
      fromUserId: myId,
      fromName: req.user.fullName,
    });

    res.json({ ...(convo.toObject?.() || convo), otherUser });
  } catch (err) {
    if (err.code === 11000) {
      const dmKey = makeDmKey(req.user._id, req.body.otherUserId);
      const convo = await Conversation.findOne({ dmKey });
      const otherUser = await User.findById(req.body.otherUserId)
        .select("fullName email role avatarUrl bio phone location website socials")
        .lean();

      return res.json({ ...(convo.toObject?.() || convo), otherUser });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/dm  -> list my DMs WITH otherUser
router.get("/dm", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;

    const dms = await Conversation.find({ type: "dm", participants: myId })
      .sort({ lastMessageAt: -1 })
      .lean();

    const otherIds = dms
      .map((c) => getOtherId(c.participants, myId))
      .filter(Boolean);

    // ✅ include avatarUrl
    const users = await User.find({ _id: { $in: otherIds } })
      .select("fullName email role avatarUrl bio phone location website socials")
      .lean();

    const map = new Map(users.map((u) => [String(u._id), u]));

    const withOther = dms.map((c) => {
      const otherId = getOtherId(c.participants, myId);
      return {
        ...c,
        otherUser: otherId ? map.get(String(otherId)) : null,
      };
    });

    res.json(withOther);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/dm/:conversationId/messages?limit=50&before=ISO
router.get("/dm/:conversationId/messages", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    const { conversationId } = req.params;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const before = req.query.before ? new Date(req.query.before) : null;

    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ message: "Conversation not found" });

    const isParticipant = (convo.participants || []).some((p) => String(p) === String(myId));
    if (!isParticipant) return res.status(403).json({ message: "Not allowed" });

    const filter = { targetType: "dm", conversationId };
    if (before) filter.createdAt = { $lt: before };

    const msgs = await ChatMessage.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json(msgs.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- Groups ---------------- */

// POST /api/chat/groups (ADMIN)  { name, description, inviteUserIds: [] }
router.post("/groups", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, description = "", inviteUserIds = [] } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "name is required" });

    const adminId = req.user._id;

    const group = await ChatGroup.create({
      name: name.trim(),
      description,
      createdBy: adminId,
      members: [{ userId: adminId, role: "admin", joinedAt: new Date() }],
      invites: (inviteUserIds || [])
        .filter(Boolean)
        .filter((uid) => String(uid) !== String(adminId))
        .map((uid) => ({
          userId: uid,
          invitedBy: adminId,
          status: "pending",
        })),
    });

    // realtime: notify all invited users
    const socketApi = getSocketApi(req);
    for (const inv of group.invites || []) {
      socketApi?.emitInvite?.(inv.userId, {
        type: "group_invite",
        groupId: group._id,
        groupName: group.name,
        invitedBy: req.user.fullName,
      });
    }

    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/groups/mine  (member or invited)
router.get("/groups/mine", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;

    const groups = await ChatGroup.find({
      $or: [
        { "members.userId": myId },
        { invites: { $elemMatch: { userId: myId, status: "pending" } } },
      ],
    }).sort({ lastMessageAt: -1 });

    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat/groups/:groupId/invites/accept
router.post("/groups/:groupId/invites/accept", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    const { groupId } = req.params;

    const group = await ChatGroup.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const inv = (group.invites || []).find(
      (i) => String(i.userId) === String(myId) && i.status === "pending"
    );
    if (!inv) return res.status(400).json({ message: "No pending invite found" });

    inv.status = "accepted";

    if (!isGroupMember(group, myId)) {
      group.members.push({ userId: myId, role: "member", joinedAt: new Date() });
    }

    await group.save();

    // realtime: let group room know someone joined (optional)
    const socketApi = getSocketApi(req);
    socketApi?.io?.to(`group:${group._id}`).emit("group:join", {
      groupId: group._id,
      userId: myId,
      userName: req.user.fullName,
      at: new Date().toISOString(),
    });

    res.json({ message: "Invite accepted", group });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat/groups/:groupId/invites/decline
router.post("/groups/:groupId/invites/decline", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    const { groupId } = req.params;

    const group = await ChatGroup.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const inv = (group.invites || []).find(
      (i) => String(i.userId) === String(myId) && i.status === "pending"
    );
    if (!inv) return res.status(400).json({ message: "No pending invite found" });

    inv.status = "declined";
    await group.save();

    res.json({ message: "Invite declined" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/groups/:groupId/messages?limit=50&before=ISO
router.get("/groups/:groupId/messages", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    const { groupId } = req.params;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const before = req.query.before ? new Date(req.query.before) : null;

    const group = await ChatGroup.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!isGroupMember(group, myId)) {
      return res.status(403).json({ message: "Join/accept invite to view chat" });
    }

    const filter = { targetType: "group", groupId };
    if (before) filter.createdAt = { $lt: before };

    const msgs = await ChatMessage.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json(msgs.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- Messaging ---------------- */

// POST /api/chat/message
// body: { targetType:"dm"|"group", conversationId?, groupId?, text, replyToMessageId? }
router.post("/message", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    const myName = req.user.fullName;

    const { targetType, conversationId, groupId, text, replyToMessageId } = req.body;

    if (!text?.trim()) return res.status(400).json({ message: "Text is required" });
    if (!["dm", "group"].includes(targetType))
      return res.status(400).json({ message: "Invalid targetType" });

    const socketApi = getSocketApi(req);

    // DM message
    if (targetType === "dm") {
      const convo = await Conversation.findById(conversationId);
      if (!convo) return res.status(404).json({ message: "Conversation not found" });

      const ok = (convo.participants || []).some((p) => String(p) === String(myId));
      if (!ok) return res.status(403).json({ message: "Not allowed" });

      const msg = await ChatMessage.create({
        targetType: "dm",
        conversationId: convo._id,
        senderId: myId,
        senderName: myName,
        text: text.trim(),
        replyToMessageId: replyToMessageId || undefined,
        readBy: [{ userId: myId, readAt: new Date() }],
      });

      convo.lastMessageAt = new Date();
      convo.lastMessageText = msg.text;
      await convo.save();

      // ✅ realtime emit
      socketApi?.emitDmMessage?.(String(convo._id), msg);

      return res.status(201).json(msg);
    }

    // Group message
    const group = await ChatGroup.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!isGroupMember(group, myId))
      return res.status(403).json({ message: "Join group to chat" });

    const msg = await ChatMessage.create({
      targetType: "group",
      groupId: group._id,
      senderId: myId,
      senderName: myName,
      text: text.trim(),
      replyToMessageId: replyToMessageId || undefined,
      readBy: [{ userId: myId, readAt: new Date() }],
    });

    group.lastMessageAt = new Date();
    group.lastMessageText = msg.text;
    await group.save();

    // ✅ realtime emit
    socketApi?.emitGroupMessage?.(String(group._id), msg);

    return res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/chat/forward
 * body: { messageId, targets:[{type:"dm", conversationId},{type:"group", groupId}] }
 */
router.post("/forward", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    const myName = req.user.fullName;

    const { messageId, targets } = req.body;
    if (!messageId) return res.status(400).json({ message: "messageId is required" });
    if (!Array.isArray(targets) || targets.length === 0)
      return res.status(400).json({ message: "targets is required" });

    const original = await ChatMessage.findById(messageId);
    if (!original) return res.status(404).json({ message: "Original message not found" });

    const socketApi = getSocketApi(req);
    const results = [];

    for (const t of targets) {
      if (t.type === "dm") {
        const convo = await Conversation.findById(t.conversationId);
        if (!convo) continue;

        const ok = (convo.participants || []).some((p) => String(p) === String(myId));
        if (!ok) continue;

        const msg = await ChatMessage.create({
          targetType: "dm",
          conversationId: convo._id,
          senderId: myId,
          senderName: myName,
          text: original.text,
          isForwarded: true,
          forwardedFrom: {
            fromUserId: original.senderId,
            fromUserName: original.senderName,
            originalMessageId: original._id,
            originalTextSnapshot: original.text,
          },
          readBy: [{ userId: myId, readAt: new Date() }],
        });

        convo.lastMessageAt = new Date();
        convo.lastMessageText = msg.text;
        await convo.save();

        // ✅ realtime emit
        socketApi?.emitDmMessage?.(String(convo._id), msg);

        results.push(msg);
      }

      if (t.type === "group") {
        const group = await ChatGroup.findById(t.groupId);
        if (!group) continue;
        if (!isGroupMember(group, myId)) continue;

        const msg = await ChatMessage.create({
          targetType: "group",
          groupId: group._id,
          senderId: myId,
          senderName: myName,
          text: original.text,
          isForwarded: true,
          forwardedFrom: {
            fromUserId: original.senderId,
            fromUserName: original.senderName,
            originalMessageId: original._id,
            originalTextSnapshot: original.text,
          },
          readBy: [{ userId: myId, readAt: new Date() }],
        });

        group.lastMessageAt = new Date();
        group.lastMessageText = msg.text;
        await group.save();

        // ✅ realtime emit
        socketApi?.emitGroupMessage?.(String(group._id), msg);

        results.push(msg);
      }
    }

    res.json({ forwarded: results.length, messages: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;