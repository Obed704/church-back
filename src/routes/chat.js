import express from "express";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import ChatGroup from "../models/ChatGroup.js";
import ChatMessage from "../models/ChatMessage.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

/* ─── Helpers ────────────────────────────────────────────────── */

const toOid = (id) => new mongoose.Types.ObjectId(String(id));

const makeDmKey = (a, b) => {
  const A = String(a),
    B = String(b);
  return A < B ? `${A}:${B}` : `${B}:${A}`;
};

const isMember = (group, userId) =>
  (group.members || []).some((m) => String(m.userId) === String(userId));

const getSocketApi = (req) => req.app?.locals?.socketApi;

const getOtherId = (participants, myId) =>
  (participants || []).find((p) => String(p) !== String(myId));

/* ══════════════════════════════════════════
   DM
══════════════════════════════════════════ */

// POST /api/chat/dm/start  { otherUserId }
router.post("/dm/start", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    const { otherUserId } = req.body;

    if (!otherUserId)
      return res.status(400).json({ message: "otherUserId is required" });
    if (String(myId) === String(otherUserId))
      return res.status(400).json({ message: "Cannot DM yourself" });

    const dmKey = makeDmKey(myId, otherUserId);

    let convo = await Conversation.findOne({ dmKey });
    if (!convo) {
      convo = await Conversation.create({
        type: "dm",
        dmKey,
        participants: [toOid(myId), toOid(otherUserId)],
        lastReadAt: {
          [String(myId)]: new Date(),
          [String(otherUserId)]: new Date(0),
        },
      });
    }

    const otherUser = await User.findById(otherUserId)
      .select("fullName email role avatarUrl bio location")
      .lean();

    getSocketApi(req)?.emitInvite?.(String(otherUserId), {
      type: "dm_created",
      conversationId: convo._id,
      fromUserId: myId,
      fromName: req.user.fullName,
    });

    res.json({ ...convo.toObject(), otherUser });
  } catch (err) {
    if (err.code === 11000) {
      const dmKey = makeDmKey(req.user._id, req.body.otherUserId);
      const convo = await Conversation.findOne({ dmKey });
      const otherUser = await User.findById(req.body.otherUserId)
        .select("fullName email role avatarUrl bio location")
        .lean();
      return res.json({ ...convo.toObject(), otherUser });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/dm  — list my DMs with unread counts + online status
router.get("/dm", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    const myIdStr = String(myId);

    const dms = await Conversation.find({ type: "dm", participants: myId })
      .sort({ lastMessageAt: -1 })
      .lean();

    const otherIds = dms
      .map((c) => getOtherId(c.participants, myId))
      .filter(Boolean);
    const users = await User.find({ _id: { $in: otherIds } })
      .select("fullName email role avatarUrl bio location")
      .lean();
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    // Per-DM unread counts from DB
    const unreadCounts = await Promise.all(
      dms.map(async (c) => {
        const lastRead = c.lastReadAt?.[myIdStr] || new Date(0);
        const count = await ChatMessage.countDocuments({
          targetType: "dm",
          conversationId: c._id,
          senderId: { $ne: myId },
          createdAt: { $gt: lastRead },
          isDeleted: { $ne: true },
        });
        return count;
      }),
    );

    const socketApi = getSocketApi(req);
    const withOther = dms.map((c, i) => {
      const otherId = getOtherId(c.participants, myId);
      const otherIdStr = String(otherId);
      return {
        ...c,
        otherUser: otherId ? userMap.get(otherIdStr) : null,
        unreadCount: unreadCounts[i],
        isOnline: socketApi?.isOnline?.(otherIdStr) ?? false,
      };
    });

    res.json(withOther);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/dm/:conversationId/messages?limit=40&before=ISO
router.get("/dm/:conversationId/messages", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    const { conversationId } = req.params;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40));
    const before = req.query.before ? new Date(req.query.before) : null;

    const convo = await Conversation.findById(conversationId);
    if (!convo)
      return res.status(404).json({ message: "Conversation not found" });

    const ok = (convo.participants || []).some(
      (p) => String(p) === String(myId),
    );
    if (!ok) return res.status(403).json({ message: "Not allowed" });

    const filter = {
      targetType: "dm",
      conversationId,
      isDeleted: { $ne: true },
    };
    if (before) filter.createdAt = { $lt: before };

    const msgs = await ChatMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    // Update lastRead for this user
    await Conversation.findByIdAndUpdate(conversationId, {
      [`lastReadAt.${String(myId)}`]: new Date(),
    });

    // Emit read receipt via socket
    getSocketApi(req)
      ?.io?.to(`dm:${conversationId}`)
      .emit("messages:read", {
        userId: String(myId),
        roomId: conversationId,
        targetType: "dm",
        at: new Date().toISOString(),
      });

    res.json(msgs.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/chat/dm/:conversationId/read  — mark as read
router.patch("/dm/:conversationId/read", verifyToken, async (req, res) => {
  try {
    const myId = String(req.user._id);
    await Conversation.findByIdAndUpdate(req.params.conversationId, {
      [`lastReadAt.${myId}`]: new Date(),
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ══════════════════════════════════════════
   GROUPS
══════════════════════════════════════════ */

// POST /api/chat/groups  (ADMIN)
router.post("/groups", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const {
      name,
      description = "",
      avatarUrl = "",
      inviteUserIds = [],
    } = req.body;
    if (!name?.trim())
      return res.status(400).json({ message: "name is required" });

    const adminId = req.user._id;

    const group = await ChatGroup.create({
      name: name.trim(),
      description,
      avatarUrl,
      createdBy: adminId,
      members: [
        {
          userId: adminId,
          role: "admin",
          joinedAt: new Date(),
          lastReadAt: new Date(),
        },
      ],
      invites: (inviteUserIds || [])
        .filter((uid) => String(uid) !== String(adminId))
        .map((uid) => ({ userId: uid, invitedBy: adminId, status: "pending" })),
    });

    const socketApi = getSocketApi(req);
    for (const inv of group.invites || []) {
      socketApi?.emitInvite?.(String(inv.userId), {
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

// GET /api/chat/groups/mine
router.get("/groups/mine", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    const myIdStr = String(myId);

    const groups = await ChatGroup.find({
      isArchived: { $ne: true },
      $or: [
        { "members.userId": myId },
        { invites: { $elemMatch: { userId: myId, status: "pending" } } },
      ],
    }).sort({ lastMessageAt: -1 });

    // Per-group unread counts
    const withUnread = await Promise.all(
      groups.map(async (g) => {
        const memberEntry = (g.members || []).find(
          (m) => String(m.userId) === myIdStr,
        );
        const lastRead = memberEntry?.lastReadAt || new Date(0);
        const unreadCount = await ChatMessage.countDocuments({
          targetType: "group",
          groupId: g._id,
          senderId: { $ne: myId },
          createdAt: { $gt: lastRead },
          isDeleted: { $ne: true },
        });
        return { ...g.toObject(), unreadCount };
      }),
    );

    res.json(withUnread);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat/groups/:groupId/invites/accept
router.post(
  "/groups/:groupId/invites/accept",
  verifyToken,
  async (req, res) => {
    try {
      const myId = req.user._id;
      const group = await ChatGroup.findById(req.params.groupId);
      if (!group) return res.status(404).json({ message: "Group not found" });

      const inv = (group.invites || []).find(
        (i) => String(i.userId) === String(myId) && i.status === "pending",
      );
      if (!inv) return res.status(400).json({ message: "No pending invite" });

      inv.status = "accepted";
      if (!isMember(group, myId)) {
        group.members.push({
          userId: myId,
          role: "member",
          joinedAt: new Date(),
          lastReadAt: new Date(),
        });
      }
      await group.save();

      const socketApi = getSocketApi(req);
      socketApi?.io?.to(`group:${group._id}`).emit("group:join", {
        groupId: group._id,
        userId: myId,
        userName: req.user.fullName,
        at: new Date().toISOString(),
      });
      socketApi?.io?.socketsJoin?.(`group:${group._id}`);

      res.json({ message: "Invite accepted", group });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// POST /api/chat/groups/:groupId/invites/decline
router.post(
  "/groups/:groupId/invites/decline",
  verifyToken,
  async (req, res) => {
    try {
      const myId = req.user._id;
      const group = await ChatGroup.findById(req.params.groupId);
      if (!group) return res.status(404).json({ message: "Group not found" });

      const inv = (group.invites || []).find(
        (i) => String(i.userId) === String(myId) && i.status === "pending",
      );
      if (!inv) return res.status(400).json({ message: "No pending invite" });

      inv.status = "declined";
      await group.save();
      res.json({ message: "Invite declined" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// GET /api/chat/groups/:groupId/messages?limit=40&before=ISO
router.get("/groups/:groupId/messages", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    const myIdStr = String(myId);
    const { groupId } = req.params;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40));
    const before = req.query.before ? new Date(req.query.before) : null;

    const group = await ChatGroup.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!isMember(group, myId))
      return res.status(403).json({ message: "Not a member" });

    const filter = { targetType: "group", groupId, isDeleted: { $ne: true } };
    if (before) filter.createdAt = { $lt: before };

    const msgs = await ChatMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    // Update lastReadAt for this member
    await ChatGroup.updateOne(
      { _id: groupId, "members.userId": myId },
      { $set: { "members.$.lastReadAt": new Date() } },
    );

    getSocketApi(req)
      ?.io?.to(`group:${groupId}`)
      .emit("messages:read", {
        userId: myIdStr,
        roomId: groupId,
        targetType: "group",
        at: new Date().toISOString(),
      });

    res.json(msgs.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/chat/groups/:groupId/read
router.patch("/groups/:groupId/read", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    await ChatGroup.updateOne(
      { _id: req.params.groupId, "members.userId": myId },
      { $set: { "members.$.lastReadAt": new Date() } },
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/groups/:groupId/members
router.get("/groups/:groupId/members", verifyToken, async (req, res) => {
  try {
    const group = await ChatGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!isMember(group, req.user._id))
      return res.status(403).json({ message: "Not a member" });

    const userIds = group.members.map((m) => m.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select("fullName email avatarUrl role")
      .lean();

    const userMap = new Map(users.map((u) => [String(u._id), u]));
    const members = group.members.map((m) => ({
      ...(m.toObject?.() ?? m),
      user: userMap.get(String(m.userId)) || null,
    }));

    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/chat/groups/:groupId  — update name/description/avatarUrl (admin)
router.patch("/groups/:groupId", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    const group = await ChatGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isGroupAdmin = (group.members || []).some(
      (m) => String(m.userId) === String(myId) && m.role === "admin",
    );
    if (!isGroupAdmin && req.user.role !== "admin")
      return res.status(403).json({ message: "Group admins only" });

    const allowed = ["name", "description", "avatarUrl", "pinnedMessageId"];
    for (const k of allowed) {
      if (req.body[k] !== undefined) group[k] = req.body[k];
    }
    await group.save();
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ══════════════════════════════════════════
   MESSAGING
══════════════════════════════════════════ */

// POST /api/chat/message
router.post("/message", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    const { targetType, conversationId, groupId, text, replyToMessageId } =
      req.body;

    if (!text?.trim())
      return res.status(400).json({ message: "Text is required" });
    if (!["dm", "group"].includes(targetType))
      return res.status(400).json({ message: "Invalid targetType" });

    const socketApi = getSocketApi(req);

    // Hydrate reply snapshot
    let replyToSnapshot = null;
    if (replyToMessageId) {
      const orig = await ChatMessage.findById(replyToMessageId)
        .select("text senderName")
        .lean();
      if (orig)
        replyToSnapshot = { text: orig.text, senderName: orig.senderName };
    }

    if (targetType === "dm") {
      const convo = await Conversation.findById(conversationId);
      if (!convo)
        return res.status(404).json({ message: "Conversation not found" });
      if (!(convo.participants || []).some((p) => String(p) === String(myId)))
        return res.status(403).json({ message: "Not allowed" });

      const msg = await ChatMessage.create({
        targetType: "dm",
        conversationId: convo._id,
        senderId: myId,
        senderName: req.user.fullName,
        text: text.trim(),
        replyToMessageId: replyToMessageId || undefined,
        replyToSnapshot,
        readBy: [{ userId: myId, readAt: new Date() }],
      });

      convo.lastMessageAt = new Date();
      convo.lastMessageText = msg.text;
      convo.lastMessageSenderId = myId;
      convo.lastReadAt = convo.lastReadAt || {};
      convo.lastReadAt.set(String(myId), new Date());
      await convo.save();

      socketApi?.emitDmMessage?.(String(convo._id), msg);
      return res.status(201).json(msg);
    }

    // Group
    const group = await ChatGroup.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!isMember(group, myId))
      return res.status(403).json({ message: "Join group to chat" });

    const msg = await ChatMessage.create({
      targetType: "group",
      groupId: group._id,
      senderId: myId,
      senderName: req.user.fullName,
      text: text.trim(),
      replyToMessageId: replyToMessageId || undefined,
      replyToSnapshot,
      readBy: [{ userId: myId, readAt: new Date() }],
    });

    group.lastMessageAt = new Date();
    group.lastMessageText = msg.text;
    group.lastMessageSenderName = req.user.fullName;
    // Update sender's lastReadAt
    const memberEntry = group.members.find(
      (m) => String(m.userId) === String(myId),
    );
    if (memberEntry) memberEntry.lastReadAt = new Date();
    await group.save();

    socketApi?.emitGroupMessage?.(String(group._id), msg);
    return res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/chat/messages/:messageId  — edit
router.patch("/messages/:messageId", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    const { text } = req.body;
    if (!text?.trim())
      return res.status(400).json({ message: "Text is required" });

    const msg = await ChatMessage.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });
    if (String(msg.senderId) !== String(myId))
      return res.status(403).json({ message: "Not your message" });
    if (msg.isDeleted)
      return res.status(400).json({ message: "Cannot edit deleted message" });

    // Preserve history
    msg.editHistory.push({ text: msg.text, editedAt: new Date() });
    msg.text = text.trim();
    msg.isEdited = true;
    msg.editedAt = new Date();
    await msg.save();

    const socketApi = getSocketApi(req);
    const roomId =
      msg.targetType === "dm"
        ? String(msg.conversationId)
        : String(msg.groupId);
    socketApi?.emitMessageUpdate?.(msg.targetType, roomId, msg);

    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/chat/messages/:messageId  — soft delete
router.delete("/messages/:messageId", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    const msg = await ChatMessage.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    const isOwner = String(msg.senderId) === String(myId);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: "Not allowed" });

    msg.isDeleted = true;
    msg.deletedAt = new Date();
    msg.text = "This message was deleted.";
    await msg.save();

    const socketApi = getSocketApi(req);
    const roomId =
      msg.targetType === "dm"
        ? String(msg.conversationId)
        : String(msg.groupId);
    socketApi?.emitMessageDelete?.(msg.targetType, roomId, String(msg._id));

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat/messages/:messageId/react  — add/remove emoji reaction
router.post("/messages/:messageId/react", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    const myIdStr = String(myId);
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ message: "emoji is required" });

    const ALLOWED = ["❤️", "😂", "😮", "😢", "🙏", "👍"];
    if (!ALLOWED.includes(emoji))
      return res.status(400).json({ message: "Emoji not allowed" });

    const msg = await ChatMessage.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });
    if (msg.isDeleted)
      return res
        .status(400)
        .json({ message: "Cannot react to deleted message" });

    if (!msg.reactions) msg.reactions = new Map();

    const list = msg.reactions.get(emoji) || [];
    const existing = list.findIndex((r) => String(r.userId) === myIdStr);

    if (existing > -1) {
      // Toggle off
      list.splice(existing, 1);
    } else {
      list.push({ emoji, userId: myId, userName: req.user.fullName });
    }

    msg.reactions.set(emoji, list);
    msg.markModified("reactions");
    await msg.save();

    const socketApi = getSocketApi(req);
    const roomId =
      msg.targetType === "dm"
        ? String(msg.conversationId)
        : String(msg.groupId);
    socketApi?.emitReaction?.(msg.targetType, roomId, {
      messageId: String(msg._id),
      reactions: Object.fromEntries(msg.reactions),
    });

    res.json({ ok: true, reactions: Object.fromEntries(msg.reactions) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat/forward
router.post("/forward", verifyToken, async (req, res) => {
  try {
    const myId = req.user._id;
    const { messageId, targets } = req.body;

    if (!messageId)
      return res.status(400).json({ message: "messageId is required" });
    if (!Array.isArray(targets) || !targets.length)
      return res.status(400).json({ message: "targets required" });

    const original = await ChatMessage.findById(messageId);
    if (!original)
      return res.status(404).json({ message: "Original message not found" });
    if (original.isDeleted)
      return res
        .status(400)
        .json({ message: "Cannot forward deleted message" });

    const socketApi = getSocketApi(req);
    const results = [];

    for (const t of targets) {
      if (t.type === "dm") {
        const convo = await Conversation.findById(t.conversationId);
        if (!convo) continue;
        if (!(convo.participants || []).some((p) => String(p) === String(myId)))
          continue;

        const msg = await ChatMessage.create({
          targetType: "dm",
          conversationId: convo._id,
          senderId: myId,
          senderName: req.user.fullName,
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

        socketApi?.emitDmMessage?.(String(convo._id), msg);
        results.push(msg);
      }

      if (t.type === "group") {
        const group = await ChatGroup.findById(t.groupId);
        if (!group || !isMember(group, myId)) continue;

        const msg = await ChatMessage.create({
          targetType: "group",
          groupId: group._id,
          senderId: myId,
          senderName: req.user.fullName,
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
