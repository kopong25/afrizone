import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useAuth } from "./_app";
import api from "../lib/api";
import toast from "react-hot-toast";
import { FiSend, FiMessageSquare, FiChevronLeft } from "react-icons/fi";

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { if (!user) router.push("/login"); }, [user]);

  useEffect(() => {
    api.get("/messages/").then(r => setConversations(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!active) return;
    api.get(`/messages/${active.id}`).then(r => {
      setMessages(r.data.messages);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
    const interval = setInterval(() => {
      api.get(`/messages/${active.id}`).then(r => setMessages(r.data.messages));
    }, 5000);
    return () => clearInterval(interval);
  }, [active]);

  const send = async () => {
    if (!body.trim() || !active) return;
    setSending(true);
    try {
      const r = await api.post(`/messages/${active.id}/send`, { body });
      setMessages(prev => [...prev, r.data]);
      setBody("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch { toast.error("Failed to send"); }
    finally { setSending(false); }
  };

  const formatTime = (dt) => {
    const d = new Date(dt);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-black text-gray-900 mb-4 flex items-center gap-2">
          <FiMessageSquare className="text-green-700" /> Messages
        </h1>
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden flex" style={{ height: "600px" }}>
          {/* Sidebar */}
          <div className={`w-full md:w-80 border-r flex flex-col ${active ? "hidden md:flex" : "flex"}`}>
            <div className="p-4 border-b">
              <p className="text-sm font-semibold text-gray-500">Conversations</p>
            </div>
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">Loading…</div>
            ) : conversations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <FiMessageSquare size={36} className="mb-3" />
                <p className="font-medium">No conversations yet</p>
                <p className="text-sm mt-1">Visit a store and message the seller to start chatting</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {conversations.map(c => (
                  <button key={c.id} onClick={() => setActive(c)}
                    className={`w-full text-left p-4 border-b hover:bg-gray-50 transition-colors ${active?.id === c.id ? "bg-green-50 border-l-4 border-l-green-700" : ""}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-900 truncate">
                        {user?.id === c.buyer.id ? c.store?.name || c.seller.name : c.buyer.name}
                      </span>
                      {c.unread_count > 0 && (
                        <span className="w-5 h-5 bg-green-700 text-white text-xs rounded-full flex items-center justify-center font-bold flex-shrink-0">{c.unread_count}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{c.last_message || "No messages yet"}</p>
                    {c.order_id && <p className="text-xs text-green-700 mt-0.5">Order #{c.order_id}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat area */}
          {!active ? (
            <div className="hidden md:flex flex-1 items-center justify-center flex-col text-gray-300">
              <FiMessageSquare size={48} className="mb-3" />
              <p className="font-medium text-lg">Select a conversation</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <button onClick={() => setActive(null)} className="md:hidden text-gray-400"><FiChevronLeft size={20} /></button>
                <div>
                  <p className="font-bold text-gray-900">
                    {user?.id === active.buyer.id ? active.store?.name || active.seller.name : active.buyer.name}
                  </p>
                  {active.order_id && <p className="text-xs text-green-700">Re: Order #{active.order_id}</p>}
                </div>
              </div>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(m => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${mine ? "bg-green-800 text-white rounded-br-md" : "bg-gray-100 text-gray-800 rounded-bl-md"}`}>
                        <p>{m.body}</p>
                        <p className={`text-xs mt-1 ${mine ? "text-green-200" : "text-gray-400"}`}>{formatTime(m.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              {/* Input */}
              <div className="p-4 border-t flex gap-2">
                <input value={body} onChange={e => setBody(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="Type a message…"
                  className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
                <button onClick={send} disabled={sending || !body.trim()}
                  className="bg-green-800 hover:bg-green-700 disabled:opacity-40 text-white w-10 h-10 rounded-xl flex items-center justify-center transition-colors">
                  <FiSend size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}