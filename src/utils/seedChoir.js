// src/pages/ChatHome.jsx
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { AuthContext } from "../context/authContext.jsx";
import Header from "../components/header.jsx";
import { createSocket } from "../utils/socket.js";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_BASE_URL;
const API_CHAT = `${API_BASE_URL}/api/chat`;
const API_USERS = `${API_BASE_URL}/api/users`;

/* ─── Utils ──────────────────────────────────────────────────── */

const strId = (v) => {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return strId(v._id || v.id || v.userId || "");
  return String(v);
};

const roomKey = (type, id) => `${type}:${strId(id)}`;

const absUrl = (url) => {
  if (!url) return "";
  const s = String(url).trim();
  if (!s) return "";
  return s.startsWith("http")
    ? s
    : `${API_BASE_URL}${s.startsWith("/") ? s : `/${s}`}`;
};

const timeAgo = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const fmtTime = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const initials = (name = "") =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

// Helper: lighten/darken hex color
const adjustColor = (hex, percent) => {
  // Simple version for demo – in production use a proper library
  return hex;
};

/* ─── Glass Avatar ─────────────────────────────────────────────────── */
function Avatar({ label, src, size = 40, online = false, className = "" }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size, minWidth: size };

  return (
    <div className={`relative shrink-0 ${className}`} style={style}>
      <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg ring-2 ring-white/40">
        {src && !broken ? (
          <img
            src={src}
            alt={label || ""}
            className="w-full h-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <span
            className="text-white font-bold select-none drop-shadow"
            style={{ fontSize: size * 0.36 }}
          >
            {initials(label)}
          </span>
        )}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-gradient-to-tr from-green-400 to-emerald-500 rounded-full border-2 border-white shadow-md" />
      )}
    </div>
  );
}

/* ─── Emoji picker (glass) ─────────────────────────── */
const EMOJIS = ["❤️", "😂", "😮", "😢", "🙏", "👍"];

function EmojiBar({ onPick, className = "" }) {
  return (
    <div
      className={`flex gap-1 bg-white/20 backdrop-blur-xl border border-white/30 rounded-full px-2 py-1 shadow-2xl ${className}`}
    >
      {EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => onPick(e)}
          className="text-base hover:scale-125 transition-transform leading-none px-0.5 text-white/90 hover:text-white"
          title={e}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

/* ─── Reaction summary row (glass) ───────────────────────────────────── */
function ReactionRow({ reactions = {}, onPick, myId }) {
  const entries = Object.entries(reactions).filter(
    ([, users]) => users?.length > 0,
  );
  if (!entries.length) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([emoji, users]) => {
        const mine = (users || []).some((r) => strId(r.userId) === myId);
        return (
          <button
            key={emoji}
            onClick={() => onPick(emoji)}
            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition backdrop-blur-md
              ${mine ? "reaction-mine" : "bg-white/10 border-white/20 text-white/80 hover:bg-white/20"}`}
          >
            <span>{emoji}</span>
            <span className="font-medium">{users.length}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Single message bubble (glass/gradient) ──────────────────────────────────── */
function MessageBubble({
  msg,
  mine,
  showAvatar,
  avatarLabel,
  avatarSrc,
  isGroup,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onForward,
  myId,
}) {
  const [hovering, setHovering] = useState(false);
  const [emojiBarOpen, setEmojiBarOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.text);
  const emojiBarRef = useRef(null);

  useEffect(() => {
    if (!emojiBarOpen) return;
    const handler = (e) => {
      if (emojiBarRef.current && !emojiBarRef.current.contains(e.target))
        setEmojiBarOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [emojiBarOpen]);

  const handleEditSave = () => {
    if (editText.trim() && editText !== msg.text)
      onEdit(msg._id, editText.trim());
    setEditing(false);
  };

  if (msg.isDeleted) {
    return (
      <div className={`flex ${mine ? "justify-end" : "justify-start"} px-4`}>
        <div className="text-xs text-white/50 italic py-1 px-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
          Message deleted
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-end gap-2 px-4 group ${mine ? "flex-row-reverse" : "flex-row"}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
      }}
    >
      {!mine && (
        <div style={{ width: 32 }}>
          {showAvatar && (
            <Avatar label={avatarLabel} src={avatarSrc} size={32} />
          )}
        </div>
      )}

      <div
        className={`max-w-[72%] flex flex-col ${mine ? "items-end" : "items-start"}`}
      >
        {isGroup && !mine && showAvatar && (
          <span className="text-xs text-white/80 mb-1 ml-1 font-medium drop-shadow">
            {msg.senderName}
          </span>
        )}

        {msg.replyToSnapshot && (
          <div
            className={`mb-1 px-3 py-1.5 rounded-xl text-xs border-l-2 max-w-full backdrop-blur-sm
            ${mine ? "reply-preview-mine" : "bg-white/10 border-white/30 text-white/80"}`}
          >
            <span className="font-semibold">
              {msg.replyToSnapshot.senderName}
            </span>
            <span className="ml-1 opacity-80 line-clamp-1">
              {msg.replyToSnapshot.text}
            </span>
          </div>
        )}

        {msg.isForwarded && (
          <div
            className={`text-[10px] mb-1 flex items-center gap-1 ${mine ? "text-cyan-300" : "text-white/60"}`}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="15 17 20 12 15 7" />
              <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
            </svg>
            Forwarded
          </div>
        )}

        <div
          className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-lg backdrop-blur-md
            ${mine ? "message-mine" : "bg-white/20 text-white border border-white/30 shadow-xl rounded-bl-sm"}`}
        >
          {editing ? (
            <div>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-black/20 outline-none resize-none min-h-[40px] text-sm text-white rounded-lg px-2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleEditSave();
                  }
                  if (e.key === "Escape") setEditing(false);
                }}
              />
              <div className="flex gap-2 mt-2 justify-end">
                <button
                  onClick={() => setEditing(false)}
                  className="text-xs opacity-70 hover:opacity-100 text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  className="text-xs font-semibold hover:opacity-90 text-white"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
          )}
        </div>

        <ReactionRow
          reactions={msg.reactions}
          onPick={(emoji) => onReact(msg._id, emoji)}
          myId={myId}
        />

        <div
          className={`text-[10px] mt-1 flex items-center gap-1.5 text-white/50`}
        >
          <span>{fmtTime(msg.createdAt)}</span>
          {msg.isEdited && <span className="italic">edited</span>}
        </div>
      </div>

      {hovering && !editing && (
        <div
          className={`flex items-center gap-0.5 shrink-0 ${mine ? "mr-1 flex-row-reverse" : "ml-1"}`}
        >
          <div className="relative" ref={emojiBarRef}>
            <button
              onClick={() => setEmojiBarOpen((v) => !v)}
              className="p-1.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/30 text-white/70 hover:text-white transition"
              title="React"
            >
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 13s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>
            {emojiBarOpen && (
              <div
                className={`absolute bottom-8 z-20 ${mine ? "right-0" : "left-0"}`}
              >
                <EmojiBar
                  onPick={(e) => {
                    onReact(msg._id, e);
                    setEmojiBarOpen(false);
                  }}
                />
              </div>
            )}
          </div>

          <button
            onClick={() => onReply(msg)}
            className="p-1.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/30 text-white/70 hover:text-white transition"
            title="Reply"
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
          </button>

          <button
            onClick={() => onForward(msg)}
            className="p-1.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/30 text-white/70 hover:text-white transition"
            title="Forward"
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <polyline points="15 17 20 12 15 7" />
              <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
            </svg>
          </button>

          {mine && !msg.isDeleted && (
            <button
              onClick={() => {
                setEditing(true);
                setEditText(msg.text);
              }}
              className="p-1.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/30 text-white/70 hover:text-white transition"
              title="Edit"
            >
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}

          {(mine || true) && !msg.isDeleted && (
            <button
              onClick={() => onDelete(msg._id)}
              className="p-1.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-red-500/40 text-white/70 hover:text-red-200 transition"
              title="Delete"
            >
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Date separator (glass) ─────────────────────────────────────────── */
function DateSep({ date }) {
  const label = (() => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  })();
  return (
    <div className="flex items-center gap-3 px-4 my-3">
      <div className="flex-1 h-px bg-white/20" />
      <span className="text-xs text-white/60 font-medium drop-shadow">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/20" />
    </div>
  );
}

/* ─── Typing indicator (glass) ───────────────────────────────────────── */
function TypingIndicator({ names }) {
  if (!names?.length) return null;
  const label =
    names.length === 1
      ? `${names[0]} is typing…`
      : `${names.join(", ")} are typing…`;
  return (
    <div className="px-4 pb-2 flex items-center gap-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-xs text-white/70 font-medium drop-shadow">
        {label}
      </span>
    </div>
  );
}

/* ─── Sidebar conversation item (glass) ──────────────────────────────── */
function ConvItem({
  title,
  subtitle,
  lastMsg,
  time,
  unread,
  needsReply,
  isActive,
  isOnline,
  avatarSrc,
  avatarLabel,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all duration-200 backdrop-blur-md
        ${isActive ? "conv-active" : "bg-white/5 hover:bg-white/20 border border-transparent hover:border-white/20"}`}
    >
      <Avatar label={avatarLabel} src={avatarSrc} size={46} online={isOnline} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span
            className={`text-sm truncate drop-shadow ${unread ? "font-bold text-white" : "font-semibold text-white/90"}`}
          >
            {title}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {unread > 0 && (
              <span className="text-[10px] font-bold unread-badge text-white rounded-full px-1.5 py-0.5 leading-none shadow">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
            {needsReply && !unread && (
              <span
                className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shrink-0 shadow"
                title="Needs reply"
              />
            )}
            <span className="text-[11px] text-white/50">{time}</span>
          </div>
        </div>
        {subtitle && (
          <div className="text-xs text-white/60 truncate">{subtitle}</div>
        )}
        <div
          className={`text-xs truncate mt-0.5 ${unread ? "text-white font-medium" : "text-white/70"}`}
        >
          {lastMsg || "No messages yet"}
        </div>
      </div>
    </button>
  );
}

/* ─── Forward modal (glass) ──────────────────────────────────────────── */
function ForwardModal({ open, onClose, msg, dms, groups, onForward }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [sending, setSending] = useState(false);

  const targets = useMemo(() => {
    const all = [
      ...dms.map((d) => ({
        type: "dm",
        id: d._id,
        title: d?.otherUser?.fullName || d?.otherUser?.email || "Chat",
        src: absUrl(d?.otherUser?.avatarUrl),
      })),
      ...groups.map((g) => ({
        type: "group",
        id: g._id,
        title: g.name,
        src: absUrl(g.avatarUrl),
      })),
    ];
    const q = search.toLowerCase();
    return q ? all.filter((t) => t.title.toLowerCase().includes(q)) : all;
  }, [dms, groups, search]);

  const toggle = (t) => {
    const key = `${t.type}:${strId(t.id)}`;
    setSelected((prev) =>
      prev.find((x) => `${x.type}:${strId(x.id)}` === key)
        ? prev.filter((x) => `${x.type}:${strId(x.id)}` !== key)
        : [...prev, t],
    );
  };

  const isSelected = (t) =>
    !!selected.find(
      (x) => `${x.type}:${strId(x.id)}` === `${t.type}:${strId(t.id)}`,
    );

  const handleSend = async () => {
    if (!selected.length) return;
    setSending(true);
    await onForward(msg, selected);
    setSending(false);
    setSelected([]);
    onClose();
  };

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelected([]);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/20">
          <h3 className="font-semibold text-white text-lg drop-shadow">
            Forward message
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/30 text-white/70 hover:text-white transition"
          >
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3 bg-white/5 mx-4 mt-4 rounded-2xl text-sm text-white/80 line-clamp-2 backdrop-blur-sm border border-white/20">
          {msg?.text}
        </div>

        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/20">
            <svg
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              className="text-white/60"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/50"
            />
          </div>
        </div>

        <div className="px-4 pb-2 max-h-56 overflow-y-auto space-y-1">
          {targets.map((t) => (
            <button
              key={`${t.type}:${strId(t.id)}`}
              onClick={() => toggle(t)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition backdrop-blur-sm
                ${isSelected(t) ? "forward-selected" : "bg-white/5 hover:bg-white/20 border border-transparent"}`}
            >
              <Avatar label={t.title} src={t.src} size={36} />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-white drop-shadow">
                  {t.title}
                </div>
                <div className="text-xs text-white/60">
                  {t.type === "dm" ? "Direct" : "Group"}
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                ${isSelected(t) ? "forward-checked" : "border-white/50"}`}
              >
                {isSelected(t) && (
                  <svg width="10" height="10" fill="white" viewBox="0 0 24 24">
                    <polyline
                      points="20 6 9 17 4 12"
                      stroke="white"
                      strokeWidth="3"
                      fill="none"
                    />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="px-4 pb-4 pt-2 border-t border-white/20">
          <button
            onClick={handleSend}
            disabled={!selected.length || sending}
            className="w-full py-2.5 rounded-2xl forward-send-btn text-white font-semibold text-sm hover:shadow-xl transition disabled:opacity-50"
          >
            {sending
              ? "Sending…"
              : `Send to ${selected.length || ""} ${selected.length === 1 ? "chat" : "chats"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ChatHome (Glassmorphic + Dynamic Theme) ───────────────────────────── */
export default function ChatHome() {
  const { user, token, authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const myId = strId(user?._id || user?.id);

  // Theme color state (default: #d946ef – fuchsia)
  const [themeColor, setThemeColor] = useState(() => {
    const saved = localStorage.getItem("chat_theme_color");
    return saved && saved.match(/^#[0-9A-F]{6}$/i) ? saved : "#d946ef";
  });

  // Apply CSS custom properties when theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--theme-primary", themeColor);
    // Generate lighter/darker variants using simple HSL logic
    const r = parseInt(themeColor.slice(1, 3), 16);
    const g = parseInt(themeColor.slice(3, 5), 16);
    const b = parseInt(themeColor.slice(5, 7), 16);
    root.style.setProperty(
      "--theme-primary-light",
      `rgba(${r}, ${g}, ${b}, 0.3)`,
    );
    root.style.setProperty(
      "--theme-primary-dark",
      `rgba(${r * 0.7}, ${g * 0.7}, ${b * 0.7}, 1)`,
    );
    localStorage.setItem("chat_theme_color", themeColor);
  }, [themeColor]);

  const authH = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );

  /* ── State ── */
  const [dms, setDms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [sidebarReady, setSidebarReady] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [sidebarTab, setSidebarTab] = useState("all");

  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);

  const [typing, setTyping] = useState({});
  const [online, setOnline] = useState({});
  const [needsReply, setNeedsReply] = useState({});

  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardMsg, setForwardMsg] = useState(null);

  const [infoOpen, setInfoOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);

  const [toast, setToast] = useState(null);
  const [muted, setMuted] = useState(
    () => localStorage.getItem("chat_muted") === "1",
  );
  const [showColorPicker, setShowColorPicker] = useState(false);

  const socketRef = useRef(null);
  const activeRef = useRef(null);
  const typingTimerRef = useRef(null);
  const bottomRef = useRef(null);
  const msgAreaRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    localStorage.setItem("chat_muted", muted ? "1" : "0");
  }, [muted]);

  const showToast = useCallback((t) => {
    setToast(t);
    setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 5000);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  /* ── Sidebar load ── */
  const loadSidebar = useCallback(
    async ({ silent = false } = {}) => {
      if (!token || !myId) return;
      try {
        if (!silent) setSidebarReady(false);
        const [dmRes, groupRes] = await Promise.all([
          axios.get(`${API_CHAT}/dm`, { headers: authH }),
          axios.get(`${API_CHAT}/groups/mine`, { headers: authH }),
        ]);

        const allGroups = groupRes.data || [];
        setDms(dmRes.data || []);
        setGroups(
          allGroups.filter((g) =>
            (g.members || []).some((m) => strId(m.userId) === myId),
          ),
        );
        setPendingInvites(
          allGroups.filter((g) =>
            (g.invites || []).some(
              (i) => strId(i.userId) === myId && i.status === "pending",
            ),
          ),
        );
        setSidebarReady(true);
      } catch {
        setSidebarReady(true);
      }
    },
    [token, myId, authH],
  );

  useEffect(() => {
    if (!token || authLoading) return;
    loadSidebar();
  }, [token, authLoading, loadSidebar]);

  /* ── Load messages ── */
  const loadMessages = useCallback(
    async (target, before = null) => {
      if (!token) return;
      const isInitial = !before;
      if (isInitial) setLoadingMsgs(true);
      else setLoadingMore(true);

      try {
        const url =
          target.type === "dm"
            ? `${API_CHAT}/dm/${target.id}/messages?limit=40${before ? `&before=${before}` : ""}`
            : `${API_CHAT}/groups/${target.id}/messages?limit=40${before ? `&before=${before}` : ""}`;

        const { data } = await axios.get(url, { headers: authH });

        if (isInitial) {
          setMessages(data);
          setHasMore(data.length === 40);
          setTimeout(() => scrollToBottom(false), 50);
        } else {
          setMessages((prev) => [...data, ...prev]);
          setHasMore(data.length === 40);
        }
      } catch {
        if (isInitial) setMessages([]);
      } finally {
        if (isInitial) setLoadingMsgs(false);
        else setLoadingMore(false);
      }
    },
    [token, authH, scrollToBottom],
  );

  const loadMore = useCallback(() => {
    if (!active || !messages.length || loadingMore || !hasMore) return;
    const oldest = messages[0]?.createdAt;
    if (oldest) loadMessages(active, oldest);
  }, [active, messages, loadingMore, hasMore, loadMessages]);

  /* ── Open chat ── */
  const openChat = useCallback(
    (type, item) => {
      const id = strId(item._id);
      const title =
        type === "dm"
          ? item?.otherUser?.fullName || item?.otherUser?.email || "Chat"
          : item.name;

      const target = { type, id, title, meta: item };
      setActive(target);
      setReplyTo(null);
      setText("");
      setMessages([]);

      if (type === "dm") {
        axios
          .patch(`${API_CHAT}/dm/${id}/read`, {}, { headers: authH })
          .catch(() => {});
        setDms((prev) =>
          prev.map((d) => (strId(d._id) === id ? { ...d, unreadCount: 0 } : d)),
        );
      } else {
        axios
          .patch(`${API_CHAT}/groups/${id}/read`, {}, { headers: authH })
          .catch(() => {});
        setGroups((prev) =>
          prev.map((g) => (strId(g._id) === id ? { ...g, unreadCount: 0 } : g)),
        );
      }

      setNeedsReply((prev) => {
        const n = { ...prev };
        delete n[roomKey(type, id)];
        return n;
      });

      loadMessages(target);

      if (type === "group") {
        axios
          .get(`${API_CHAT}/groups/${id}/members`, { headers: authH })
          .then(({ data }) => setGroupMembers(data))
          .catch(() => {});
      }
    },
    [authH, loadMessages],
  );

  /* ── Auto-open from URL params ── */
  useEffect(() => {
    if (!sidebarReady || active) return;
    const dmId = searchParams.get("dm");
    const groupId = searchParams.get("group");
    if (dmId) {
      const dm = dms.find((d) => strId(d._id) === dmId);
      if (dm) {
        openChat("dm", dm);
        navigate("/chat", { replace: true });
      }
    } else if (groupId) {
      const g = groups.find((x) => strId(x._id) === groupId);
      if (g) {
        openChat("group", g);
        navigate("/chat", { replace: true });
      }
    }
  }, [sidebarReady, active, searchParams, dms, groups, openChat, navigate]);

  /* ── Online presence ── */
  useEffect(() => {
    if (!active || active.type !== "dm" || !socketRef.current) return;
    const otherId = strId(active.meta?.otherUser?._id);
    if (!otherId) return;
    socketRef.current.emit("presence:who", [otherId], (result) => {
      if (result) setOnline((prev) => ({ ...prev, ...result }));
    });
  }, [active]);

  const emitTyping = useCallback(() => {
    if (!active || !socketRef.current) return;
    const roomId = active.id;
    socketRef.current.emit("typing:start", { targetType: active.type, roomId });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit("typing:stop", {
        targetType: active.type,
        roomId,
      });
    }, 2500);
  }, [active]);

  /* ── Socket ── */
  useEffect(() => {
    if (!token || authLoading) return;

    const s = createSocket(API_BASE_URL, token);
    socketRef.current = s;

    s.on("connect", () => s.emit("rooms:refresh"));

    s.on("message:new", (msg) => {
      const a = activeRef.current;
      const isActive =
        a &&
        ((a.type === "dm" &&
          msg.targetType === "dm" &&
          strId(msg.conversationId) === a.id) ||
          (a.type === "group" &&
            msg.targetType === "group" &&
            strId(msg.groupId) === a.id));

      const incoming = strId(msg.senderId) !== myId;

      if (msg.targetType === "dm") {
        setDms((prev) => {
          const idx = prev.findIndex(
            (d) => strId(d._id) === strId(msg.conversationId),
          );
          if (idx === -1) return prev;
          const updated = {
            ...prev[idx],
            lastMessageText: msg.text,
            lastMessageAt: msg.createdAt,
          };
          if (incoming && !isActive)
            updated.unreadCount = (updated.unreadCount || 0) + 1;
          const next = [...prev];
          next.splice(idx, 1);
          return [updated, ...next];
        });
      }
      if (msg.targetType === "group") {
        setGroups((prev) => {
          const idx = prev.findIndex(
            (g) => strId(g._id) === strId(msg.groupId),
          );
          if (idx === -1) return prev;
          const updated = {
            ...prev[idx],
            lastMessageText: msg.text,
            lastMessageAt: msg.createdAt,
          };
          if (incoming && !isActive)
            updated.unreadCount = (updated.unreadCount || 0) + 1;
          const next = [...prev];
          next.splice(idx, 1);
          return [updated, ...next];
        });
      }

      if (isActive) {
        setMessages((prev) => {
          if (prev.some((m) => strId(m._id) === strId(msg._id))) return prev;
          return [...prev, msg];
        });
        const key =
          msg.targetType === "dm"
            ? `dm:${msg.conversationId}`
            : `group:${msg.groupId}`;
        setTyping((prev) => ({ ...prev, [key]: [] }));
        setTimeout(() => scrollToBottom(), 30);
        if (incoming) {
          setNeedsReply((prev) => ({ ...prev, [roomKey(a.type, a.id)]: true }));
        }
        if (msg.targetType === "dm") {
          axios
            .patch(
              `${API_CHAT}/dm/${msg.conversationId}/read`,
              {},
              { headers: authH },
            )
            .catch(() => {});
        } else {
          axios
            .patch(
              `${API_CHAT}/groups/${msg.groupId}/read`,
              {},
              { headers: authH },
            )
            .catch(() => {});
        }
      } else if (incoming) {
        const key =
          msg.targetType === "dm"
            ? roomKey("dm", msg.conversationId)
            : roomKey("group", msg.groupId);
        setNeedsReply((prev) => ({ ...prev, [key]: true }));

        if (!muted) {
          try {
            new Audio(
              "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
            ).play();
          } catch {}
        }
        showToast({
          title: msg.senderName || "New message",
          body: msg.text,
          openTo:
            msg.targetType === "dm"
              ? { type: "dm", id: strId(msg.conversationId) }
              : { type: "group", id: strId(msg.groupId) },
        });
        if (msg.targetType === "dm") {
          const known = dms.find(
            (d) => strId(d._id) === strId(msg.conversationId),
          );
          if (!known) loadSidebar({ silent: true });
        }
      }
    });

    s.on("message:update", (msg) => {
      setMessages((prev) =>
        prev.map((m) => (strId(m._id) === strId(msg._id) ? msg : m)),
      );
    });

    s.on("message:delete", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          strId(m._id) === messageId
            ? { ...m, isDeleted: true, text: "This message was deleted." }
            : m,
        ),
      );
    });

    s.on("message:reaction", ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (strId(m._id) === messageId ? { ...m, reactions } : m)),
      );
    });

    s.on("typing:update", ({ key, typing: typingUsers }) => {
      setTyping((prev) => ({
        ...prev,
        [key]: typingUsers.filter((t) => t.userId !== myId),
      }));
    });

    s.on("messages:read", ({ userId, roomId, targetType }) => {
      if (userId === myId) return;
    });

    s.on("presence:online", ({ userId }) =>
      setOnline((prev) => ({ ...prev, [userId]: true })),
    );
    s.on("presence:offline", ({ userId }) =>
      setOnline((prev) => ({ ...prev, [userId]: false })),
    );

    s.on("invite:new", () => loadSidebar({ silent: true }));
    s.on("group:join", () => loadSidebar({ silent: true }));

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [
    token,
    authLoading,
    myId,
    authH,
    muted,
    showToast,
    loadSidebar,
    scrollToBottom,
  ]);

  const send = useCallback(async () => {
    if (!token || !active || !text.trim() || sending) return;
    setSending(true);

    const payload =
      active.type === "dm"
        ? {
            targetType: "dm",
            conversationId: active.id,
            text: text.trim(),
            replyToMessageId: replyTo?._id,
          }
        : {
            targetType: "group",
            groupId: active.id,
            text: text.trim(),
            replyToMessageId: replyTo?._id,
          };

    try {
      const { data: msg } = await axios.post(`${API_CHAT}/message`, payload, {
        headers: authH,
      });
      setMessages((prev) =>
        prev.some((m) => strId(m._id) === strId(msg._id))
          ? prev
          : [...prev, msg],
      );
      setText("");
      setReplyTo(null);
      if (active.type === "dm") {
        setDms((prev) =>
          prev.map((d) =>
            strId(d._id) === active.id
              ? {
                  ...d,
                  lastMessageText: msg.text,
                  lastMessageAt: msg.createdAt,
                }
              : d,
          ),
        );
      } else {
        setGroups((prev) =>
          prev.map((g) =>
            strId(g._id) === active.id
              ? {
                  ...g,
                  lastMessageText: msg.text,
                  lastMessageAt: msg.createdAt,
                }
              : g,
          ),
        );
      }
      setNeedsReply((prev) => {
        const n = { ...prev };
        delete n[roomKey(active.type, active.id)];
        return n;
      });
      socketRef.current?.emit("typing:stop", {
        targetType: active.type,
        roomId: active.id,
      });
      setTimeout(() => scrollToBottom(), 30);
    } catch (e) {
      showToast({
        title: "Failed to send",
        body: e?.response?.data?.message || e.message,
        error: true,
      });
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [token, active, text, replyTo, sending, authH, scrollToBottom, showToast]);

  const editMsg = useCallback(
    async (msgId, newText) => {
      try {
        await axios.patch(
          `${API_CHAT}/messages/${msgId}`,
          { text: newText },
          { headers: authH },
        );
      } catch (e) {
        showToast({
          title: "Edit failed",
          body: e?.response?.data?.message || e.message,
          error: true,
        });
      }
    },
    [authH, showToast],
  );

  const deleteMsg = useCallback(
    async (msgId) => {
      if (!window.confirm("Delete this message?")) return;
      try {
        await axios.delete(`${API_CHAT}/messages/${msgId}`, { headers: authH });
      } catch (e) {
        showToast({
          title: "Delete failed",
          body: e?.response?.data?.message || e.message,
          error: true,
        });
      }
    },
    [authH, showToast],
  );

  const reactMsg = useCallback(
    async (msgId, emoji) => {
      try {
        await axios.post(
          `${API_CHAT}/messages/${msgId}/react`,
          { emoji },
          { headers: authH },
        );
      } catch (e) {
        showToast({
          title: "Reaction failed",
          body: e?.response?.data?.message || e.message,
          error: true,
        });
      }
    },
    [authH, showToast],
  );

  const doForward = useCallback(
    async (msg, targets) => {
      const mapped = targets.map((t) =>
        t.type === "dm"
          ? { type: "dm", conversationId: t.id }
          : { type: "group", groupId: t.id },
      );
      try {
        await axios.post(
          `${API_CHAT}/forward`,
          { messageId: strId(msg._id), targets: mapped },
          { headers: authH },
        );
      } catch (e) {
        showToast({
          title: "Forward failed",
          body: e?.response?.data?.message || e.message,
          error: true,
        });
      }
    },
    [authH, showToast],
  );

  const acceptInvite = async (groupId) => {
    try {
      await axios.post(
        `${API_CHAT}/groups/${groupId}/invites/accept`,
        {},
        { headers: authH },
      );
      await loadSidebar({ silent: true });
      socketRef.current?.emit("rooms:refresh");
    } catch (e) {
      showToast({
        title: "Accept failed",
        body: e?.response?.data?.message || e.message,
        error: true,
      });
    }
  };
  const declineInvite = async (groupId) => {
    try {
      await axios.post(
        `${API_CHAT}/groups/${groupId}/invites/decline`,
        {},
        { headers: authH },
      );
      await loadSidebar({ silent: true });
    } catch {}
  };

  const currTyping = useMemo(() => {
    if (!active) return [];
    const key = roomKey(active.type, active.id);
    return (typing[key] || []).map((t) => t.userName);
  }, [active, typing]);

  const allConvs = useMemo(() => {
    const q = sidebarSearch.toLowerCase();
    let items = [];
    if (sidebarTab !== "groups") {
      items = [
        ...items,
        ...dms
          .filter((d) => {
            const name = (
              d?.otherUser?.fullName ||
              d?.otherUser?.email ||
              ""
            ).toLowerCase();
            return !q || name.includes(q);
          })
          .map((d) => ({ kind: "dm", item: d })),
      ];
    }
    if (sidebarTab !== "dms") {
      items = [
        ...items,
        ...groups
          .filter((g) => !q || g.name.toLowerCase().includes(q))
          .map((g) => ({ kind: "group", item: g })),
      ];
    }
    return items.sort(
      (a, b) => new Date(b.item.lastMessageAt) - new Date(a.item.lastMessageAt),
    );
  }, [dms, groups, sidebarSearch, sidebarTab]);

  const groupedMessages = useMemo(() => {
    const result = [];
    let prevDate = null;
    let prevSenderId = null;

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const d = new Date(m.createdAt).toDateString();
      if (d !== prevDate) {
        result.push({ type: "sep", date: m.createdAt });
        prevDate = d;
        prevSenderId = null;
      }
      const showAvatar = strId(m.senderId) !== prevSenderId;
      result.push({ type: "msg", msg: m, showAvatar });
      prevSenderId = strId(m.senderId);
    }
    return result;
  }, [messages]);

  const activeOtherUser = active?.meta?.otherUser;
  const activeAvatarSrc =
    active?.type === "dm"
      ? absUrl(activeOtherUser?.avatarUrl)
      : absUrl(active?.meta?.avatarUrl);
  const activeAvatarLabel =
    active?.type === "dm"
      ? activeOtherUser?.fullName || activeOtherUser?.email || active?.title
      : active?.title;
  const activeOtherId = strId(activeOtherUser?._id);
  const isActiveOnline =
    active?.type === "dm" && activeOtherId && online[activeOtherId];

  const [usersById, setUsersById] = useState({});
  useEffect(() => {
    if (active?.type !== "group" || Object.keys(usersById).length) return;
    axios
      .get(`${API_USERS}?search=`, { headers: authH })
      .then(({ data }) => {
        const m = {};
        for (const u of data) m[strId(u._id)] = u;
        setUsersById(m);
      })
      .catch(() => {});
  }, [active?.type, authH]);

  if (authLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700">
        <div className="w-10 h-10 rounded-full border-2 border-white border-t-transparent animate-spin" />
      </div>
    );

  if (!token)
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700">
        <Header />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-2xl">
            <svg
              width="28"
              height="28"
              fill="none"
              stroke="white"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white drop-shadow">
            Chat is for members
          </h1>
          <p className="text-white/70 mt-2 mb-6">
            Please sign in to access messages.
          </p>
          <Link
            to="/login"
            className="inline-flex px-6 py-3 theme-gradient text-white rounded-2xl font-semibold hover:shadow-xl transition"
          >
            Sign in
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background image and overlay gradient */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[url('/img2.jpg')] bg-cover bg-center bg-no-repeat" />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-5 py-4 flex flex-col gap-0">
          {/* Page header with glass effect + color picker */}
          <div className="flex items-center justify-between mb-3 px-1">
            <h1 className="text-2xl font-bold text-white drop-shadow-lg tracking-tight">
              Messages
            </h1>
            <div className="flex items-center gap-3">
              {/* Color picker button */}
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/30 hover:bg-white/30 transition flex items-center gap-2"
                  title="Change theme color"
                >
                  <div
                    className="w-5 h-5 rounded-full shadow-inner"
                    style={{ backgroundColor: themeColor }}
                  />
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    className="text-white/80"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H5.78a1.65 1.65 0 0 0-1.51 1 1.65 1.65 0 0 0 .33 1.82l.04.04A10 10 0 0 0 12 17.66a10 10 0 0 0 6.36-2.62z" />
                    <path d="M16.5 9.4a10 10 0 0 0-9-5.4 10 10 0 0 0-7 2.5" />
                  </svg>
                </button>
                {showColorPicker && (
                  <div className="absolute right-0 mt-2 p-3 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30 shadow-2xl z-50">
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="w-32 h-10 rounded-lg cursor-pointer"
                    />
                    <div className="text-xs text-white/70 text-center mt-2">
                      Pick a color
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setMuted((m) => !m)}
                title={muted ? "Unmute" : "Mute"}
                className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/30 hover:bg-white/30 text-white/80 hover:text-white transition"
              >
                {muted ? (
                  <svg
                    width="17"
                    height="17"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v3M8 23h8" />
                  </svg>
                ) : (
                  <svg
                    width="17"
                    height="17"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                )}
              </button>
              <Link
                to="/chat/new"
                className="flex items-center gap-1.5 px-4 py-2 theme-gradient text-white text-sm font-semibold rounded-xl hover:shadow-xl transition"
              >
                <svg
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New
              </Link>
            </div>
          </div>

          {/* Main grid - more spacious */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 min-h-0">
            {/* Sidebar */}
            <aside
              className={`flex flex-col bg-white/10 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl overflow-hidden ${active ? "hidden lg:flex" : "flex"}`}
            >
              <div className="p-3 border-b border-white/20">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-3 py-2.5 border border-white/20">
                  <svg
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    className="text-white/60"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    placeholder="Search conversations…"
                    className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/50"
                  />
                </div>
              </div>

              <div className="flex px-3 pt-2 gap-1">
                {[
                  ["all", "All"],
                  ["dms", "DMs"],
                  ["groups", "Groups"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSidebarTab(key)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition backdrop-blur-sm
                      ${sidebarTab === key ? "tab-active" : "text-white/70 hover:bg-white/20"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {pendingInvites.length > 0 && (
                <div className="px-3 pt-3">
                  <div className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-2 px-1">
                    Invites
                  </div>
                  {pendingInvites.map((g) => (
                    <div
                      key={g._id}
                      className="invite-card backdrop-blur-md border border-white/30 rounded-2xl p-3 mb-2"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar label={g.name} size={32} />
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {g.name}
                          </div>
                          <div className="text-xs text-white/70">
                            Group invite
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptInvite(g._id)}
                          className="flex-1 py-1.5 theme-gradient text-white text-xs font-semibold rounded-lg hover:shadow-lg transition"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => declineInvite(g._id)}
                          className="flex-1 py-1.5 bg-white/10 backdrop-blur-md border border-white/30 text-white/90 text-xs font-semibold rounded-lg hover:bg-white/20 transition"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-2 pb-3 pt-2 space-y-0.5 custom-scroll">
                {!sidebarReady ? (
                  [...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 animate-pulse"
                    >
                      <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-white/20 rounded w-3/4" />
                        <div className="h-2.5 bg-white/20 rounded w-1/2" />
                      </div>
                    </div>
                  ))
                ) : allConvs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-white/60">
                    <svg
                      width="36"
                      height="36"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      className="mb-2 opacity-40"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <p className="text-sm">No conversations yet</p>
                    <Link
                      to="/chat/new"
                      className="mt-3 text-xs text-cyan-300 font-medium hover:underline"
                    >
                      Start a new chat →
                    </Link>
                  </div>
                ) : (
                  allConvs.map(({ kind, item }) => {
                    const isActiveCur =
                      active?.type === kind &&
                      strId(active.id) === strId(item._id);
                    const key = roomKey(kind, item._id);
                    if (kind === "dm") {
                      const otherId = strId(item.otherUser?._id);
                      return (
                        <ConvItem
                          key={strId(item._id)}
                          title={
                            item.otherUser?.fullName ||
                            item.otherUser?.email ||
                            "Chat"
                          }
                          subtitle={item.otherUser?.email}
                          lastMsg={item.lastMessageText}
                          time={timeAgo(item.lastMessageAt)}
                          unread={item.unreadCount || 0}
                          needsReply={!!needsReply[key]}
                          isActive={isActiveCur}
                          isOnline={!!online[otherId]}
                          avatarSrc={absUrl(item.otherUser?.avatarUrl)}
                          avatarLabel={
                            item.otherUser?.fullName ||
                            item.otherUser?.email ||
                            ""
                          }
                          onClick={() => openChat("dm", item)}
                        />
                      );
                    }
                    return (
                      <ConvItem
                        key={strId(item._id)}
                        title={item.name}
                        subtitle={`${(item.members || []).length} members`}
                        lastMsg={
                          item.lastMessageSenderName
                            ? `${item.lastMessageSenderName}: ${item.lastMessageText}`
                            : item.lastMessageText
                        }
                        time={timeAgo(item.lastMessageAt)}
                        unread={item.unreadCount || 0}
                        needsReply={!!needsReply[key]}
                        isActive={isActiveCur}
                        isOnline={false}
                        avatarSrc={absUrl(item.avatarUrl)}
                        avatarLabel={item.name}
                        onClick={() => openChat("group", item)}
                      />
                    );
                  })
                )}
              </div>
            </aside>

            {/* Chat window */}
            <div
              className={`flex flex-col bg-white/10 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl overflow-hidden ${active ? "flex" : "hidden lg:flex"}`}
              style={{ minHeight: 600 }}
            >
              {!active ? (
                <div className="flex-1 flex flex-col items-center justify-center text-white/70 p-10">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mb-4 border border-white/30 shadow-2xl">
                    <svg
                      width="28"
                      height="28"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <p className="text-base font-medium text-white">
                    Select a conversation
                  </p>
                  <p className="text-sm text-white/50 mt-1">
                    Choose from the list or start a new chat.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActive(null)}
                        className="lg:hidden p-1.5 rounded-xl bg-white/10 backdrop-blur-md hover:bg-white/30 text-white/80 transition"
                      >
                        <svg
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          viewBox="0 0 24 24"
                        >
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                      </button>
                      <Avatar
                        label={activeAvatarLabel}
                        src={activeAvatarSrc}
                        size={40}
                        online={isActiveOnline}
                      />
                      <div>
                        <div className="font-semibold text-white text-sm drop-shadow">
                          {active.title}
                        </div>
                        <div className="text-xs text-white/70">
                          {active.type === "dm"
                            ? isActiveOnline
                              ? "Online"
                              : "Offline"
                            : `${(active.meta?.members || []).length || "?"} members`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {active.type === "group" && (
                        <button
                          onClick={() => setInfoOpen((v) => !v)}
                          className={`p-2 rounded-xl transition backdrop-blur-md ${infoOpen ? "bg-white/30 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"}`}
                          title="Group info"
                        >
                          <svg
                            width="17"
                            height="17"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {infoOpen && active.type === "group" && (
                    <div className="border-b border-white/20 bg-white/5 backdrop-blur-md px-4 py-3">
                      <div className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-2">
                        Members
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {groupMembers.map((m) => (
                          <div
                            key={strId(m.userId)}
                            className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-2.5 py-1"
                          >
                            <Avatar
                              label={m.user?.fullName || ""}
                              src={absUrl(m.user?.avatarUrl)}
                              size={20}
                              online={!!online[strId(m.userId)]}
                            />
                            <span className="text-xs text-white">
                              {m.user?.fullName || "Unknown"}
                            </span>
                            {m.role === "admin" && (
                              <span className="text-[10px] text-cyan-300 font-semibold">
                                Admin
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    ref={msgAreaRef}
                    className="flex-1 overflow-y-auto py-4 space-y-1 custom-scroll"
                    onScroll={(e) => {
                      if (
                        e.currentTarget.scrollTop < 100 &&
                        hasMore &&
                        !loadingMore
                      )
                        loadMore();
                    }}
                  >
                    {loadingMore && (
                      <div className="flex justify-center py-2">
                        <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      </div>
                    )}

                    {loadingMsgs ? (
                      <div className="flex justify-center py-10">
                        <div className="w-7 h-7 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      </div>
                    ) : (
                      groupedMessages.map((item, i) => {
                        if (item.type === "sep")
                          return <DateSep key={`sep-${i}`} date={item.date} />;

                        const m = item.msg;
                        const isMine = strId(m.senderId) === myId;
                        const senderId = strId(m.senderId);
                        const sender = usersById[senderId];

                        return (
                          <MessageBubble
                            key={strId(m._id)}
                            msg={m}
                            mine={isMine}
                            myId={myId}
                            showAvatar={item.showAvatar}
                            avatarLabel={
                              active.type === "dm"
                                ? activeAvatarLabel
                                : sender?.fullName || m.senderName
                            }
                            avatarSrc={
                              active.type === "dm"
                                ? activeAvatarSrc
                                : absUrl(sender?.avatarUrl)
                            }
                            isGroup={active.type === "group"}
                            onReply={setReplyTo}
                            onReact={reactMsg}
                            onEdit={editMsg}
                            onDelete={deleteMsg}
                            onForward={(msg) => {
                              setForwardMsg(msg);
                              setForwardOpen(true);
                            }}
                          />
                        );
                      })
                    )}

                    <TypingIndicator names={currTyping} />
                    <div ref={bottomRef} />
                  </div>

                  {replyTo && (
                    <div className="flex items-center gap-2 px-4 py-2.5 reply-bar backdrop-blur-md border-t border-white/20">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-cyan-300">
                          {replyTo.senderName}
                        </div>
                        <div className="text-xs text-white/80 truncate">
                          {replyTo.text}
                        </div>
                      </div>
                      <button
                        onClick={() => setReplyTo(null)}
                        className="p-1 rounded-full bg-white/10 hover:bg-white/30 text-white/80 transition"
                      >
                        <svg
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          viewBox="0 0 24 24"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  )}

                  <div className="px-3 py-3 border-t border-white/20 bg-white/5 backdrop-blur-md">
                    <div className="flex items-end gap-2">
                      <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/30 rounded-2xl px-4 py-2.5 flex items-end gap-2">
                        <textarea
                          ref={textareaRef}
                          value={text}
                          onChange={(e) => {
                            setText(e.target.value);
                            emitTyping();
                          }}
                          placeholder="Message…"
                          rows={1}
                          className="flex-1 bg-transparent outline-none resize-none text-sm text-white placeholder:text-white/50 max-h-32 overflow-y-auto leading-relaxed"
                          style={{ minHeight: 22 }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              send();
                            }
                          }}
                          onInput={(e) => {
                            e.target.style.height = "auto";
                            e.target.style.height =
                              Math.min(e.target.scrollHeight, 128) + "px";
                          }}
                        />
                      </div>
                      <button
                        onClick={send}
                        disabled={!text.trim() || sending}
                        className="w-10 h-10 theme-gradient text-white rounded-2xl flex items-center justify-center hover:shadow-xl disabled:opacity-40 transition shrink-0"
                      >
                        {sending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                          >
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="text-[10px] text-white/40 mt-1.5 pl-1">
                      Enter to send · Shift+Enter for new line
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-5 right-5 z-50 w-80 max-w-[92vw] bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl overflow-hidden">
            <div
              className={`h-0.5 ${toast.error ? "bg-gradient-to-r from-red-500 to-rose-500" : "theme-gradient"}`}
            />
            <div className="p-4">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">
                    {toast.title}
                  </div>
                  {toast.body && (
                    <div className="text-xs text-white/70 mt-0.5 line-clamp-2">
                      {toast.body}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setToast(null)}
                  className="p-1 bg-white/10 rounded-lg hover:bg-white/20 text-white/70 transition"
                >
                  <svg
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              {toast.openTo && (
                <button
                  onClick={() => {
                    const t = toast.openTo;
                    const item =
                      t.type === "dm"
                        ? dms.find((d) => strId(d._id) === t.id)
                        : groups.find((g) => strId(g._id) === t.id);
                    if (item) openChat(t.type, item);
                    setToast(null);
                  }}
                  className="mt-2.5 w-full py-1.5 text-xs font-semibold theme-gradient text-white rounded-xl hover:shadow-lg transition"
                >
                  Open chat
                </button>
              )}
            </div>
          </div>
        )}

        <ForwardModal
          open={forwardOpen}
          onClose={() => setForwardOpen(false)}
          msg={forwardMsg}
          dms={dms}
          groups={groups}
          onForward={doForward}
        />
      </div>

      {/* Dynamic theme styles */}
      <style>{`
        :root {
          --theme-primary: ${themeColor};
          --theme-primary-light: ${themeColor}30;
          --theme-primary-dark: ${themeColor};
        }
        .theme-gradient {
          background: linear-gradient(135deg, var(--theme-primary), var(--theme-primary-dark));
        }
        .message-mine {
          background: linear-gradient(135deg, var(--theme-primary), var(--theme-primary-dark));
          color: white;
          border-radius: 1rem;
          border-bottom-right-radius: 0.25rem;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .conv-active {
          background: linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1));
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border: 1px solid rgba(255,255,255,0.3);
        }
        .tab-active {
          background: linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1));
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .unread-badge {
          background: linear-gradient(135deg, var(--theme-primary), var(--theme-primary-dark));
        }
        .reply-preview-mine {
          background: linear-gradient(135deg, var(--theme-primary-light), var(--theme-primary-dark)20);
          border-left-color: var(--theme-primary);
          color: white;
        }
        .reaction-mine {
          background: linear-gradient(135deg, var(--theme-primary-light), var(--theme-primary-dark)20);
          border-color: var(--theme-primary);
          color: white;
        }
        .invite-card {
          background: linear-gradient(135deg, var(--theme-primary-light), rgba(0,0,0,0.2));
        }
        .forward-selected {
          background: linear-gradient(135deg, var(--theme-primary-light), var(--theme-primary-dark)20);
          border-color: rgba(255,255,255,0.3);
        }
        .forward-checked {
          background: linear-gradient(135deg, var(--theme-primary), var(--theme-primary-dark));
          border-color: var(--theme-primary);
        }
        .forward-send-btn {
          background: linear-gradient(135deg, var(--theme-primary), var(--theme-primary-dark));
        }
        .reply-bar {
          background: linear-gradient(135deg, var(--theme-primary-light), rgba(0,0,0,0.2));
        }
      `}</style>

      <style>{`
        .custom-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.3);
          border-radius: 10px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.5);
        }
      `}</style>
    </div>
  );
}
