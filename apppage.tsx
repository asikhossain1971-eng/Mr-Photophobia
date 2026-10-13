"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Send, Paperclip, Video, Phone, PhoneOff, Copy, Check, Radio } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
);

export default function Home() {
  // Chat States
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [userRole, setUserRole] = useState("Client");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video Call States
  const [peerId, setPeerId] = useState("");
  const [remotePeerId, setRemotePeerId] = useState("");
  const [inCall, setInCall] = useState(false);
  const [copied, setCopied] = useState(false);
  const peerRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // 1. Supabase Chat
    supabase.from("messages").select("*").order("created_at", { ascending: true })
      .then(({ data }) => data && setMessages(data));

    const channel = supabase.channel("public:messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
        setMessages((prev) => [...prev, p.new]);
      }).subscribe();

    // 2. PeerJS Video Call
    import("peerjs").then(({ default: Peer }) => {
      const peer = new Peer();
      peerRef.current = peer;
      peer.on("open", (id) => setPeerId(id));
      peer.on("call", (call) => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          call.answer(stream);
          setInCall(true);
          call.on("stream", (remStream) => {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remStream;
          });
        });
      });
    });

    return () => {
      supabase.removeChannel(channel);
      peerRef.current?.destroy();
    };
  }, []);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const txt = input;
    setInput("");
    await supabase.from("messages").insert([{ sender: userRole, content: txt }]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("chat-files").upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from("chat-files").getPublicUrl(path);
      await supabase.from("messages").insert([{
        sender: userRole,
        content: `Attached file: ${file.name}`,
        file_url: data.publicUrl,
        file_name: file.name
      }]);
    }
  };

  const startCall = () => {
    if (!remotePeerId) return;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const call = peerRef.current.call(remotePeerId, stream);
      setInCall(true);
      call.on("stream", (remStream: MediaStream) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remStream;
      });
    });
  };

  return (
    <div style={{ backgroundColor: "#09090b", color: "#fafafa", minHeight: "100vh", padding: "40px 20px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
          <div>
            <h1 style={{ fontSize: "2rem", margin: 0 }}>Full-Stack Portfolio</h1>
            <p style={{ color: "#a1a1aa", marginTop: "5px" }}>Direct Client Chat & Live Video Workspace</p>
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "#71717a", marginRight: "8px" }}>Role:</span>
            <button 
              onClick={() => setUserRole(userRole === "Client" ? "Developer" : "Client")}
              style={{ padding: "6px 14px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
              {userRole}
            </button>
          </div>
        </div>

        {/* Client Workspace Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
          
          {/* Chat Section */}
          <div style={{ backgroundColor: "#18181b", borderRadius: "12px", border: "1px solid #27272a", display: "flex", flexDirection: "column", height: "480px" }}>
            <div style={{ padding: "14px", borderBottom: "1px solid #27272a", fontWeight: "bold" }}>💬 Client Messenger & Files</div>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {messages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.sender === userRole ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                  <span style={{ fontSize: "10px", color: "#71717a" }}>{m.sender}</span>
                  <div style={{ padding: "8px 12px", borderRadius: "8px", backgroundColor: m.sender === userRole ? "#2563eb" : "#27272a", color: "#fff", fontSize: "13px" }}>
                    {m.content}
                    {m.file_url && (
                      <a href={m.file_url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: "6px", color: "#93c5fd", textDecoration: "underline", fontSize: "11px" }}>
                        📥 {m.file_name || "Download Attachment"}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} style={{ padding: "12px", borderTop: "1px solid #27272a", display: "flex", gap: "8px" }}>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: "none" }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer" }}>
                <Paperclip size={18} />
              </button>
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="Type message..." 
                style={{ flex: 1, backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "6px", padding: "8px", color: "#fff", outline: "none" }} 
              />
              <button type="submit" style={{ backgroundColor: "#2563eb", border: "none", borderRadius: "6px", color: "#fff", padding: "8px 14px", cursor: "pointer" }}>
                <Send size={16} />
              </button>
            </form>
          </div>

          {/* Video Call Section */}
          <div style={{ backgroundColor: "#18181b", borderRadius: "12px", border: "1px solid #27272a", padding: "18px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h3 style={{ margin: 0, fontSize: "16px" }}>📹 Direct Audio/Video Call</h3>
                <span style={{ fontSize: "11px", color: inCall ? "#4ade80" : "#a1a1aa" }}>{inCall ? "Connected" : "Idle"}</span>
              </div>
              
              <div style={{ backgroundColor: "#09090b", padding: "10px", borderRadius: "8px", border: "1px solid #27272a", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#4ade80", overflow: "hidden", textOverflow: "ellipsis" }}>
                  ID: {peerId || "Generating..."}
                </span>
                <button 
                  onClick={() => { navigator.clipboard.writeText(peerId); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer" }}>
                  {copied ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
                </button>
              </div>

              {!inCall ? (
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                  <input 
                    type="text" 
                    placeholder="Paste Client Call ID" 
                    value={remotePeerId} 
                    onChange={(e) => setRemotePeerId(e.target.value)} 
                    style={{ flex: 1, backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "6px", padding: "8px", color: "#fff", fontSize: "12px" }}
                  />
                  <button onClick={startCall} style={{ backgroundColor: "#16a34a", border: "none", borderRadius: "6px", color: "#fff", padding: "8px 14px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>
                    Connect
                  </button>
                </div>
              ) : (
                <button onClick={() => window.location.reload()} style={{ width: "100%", backgroundColor: "#e11d48", border: "none", borderRadius: "6px", color: "#fff", padding: "8px", cursor: "pointer", marginBottom: "16px", fontWeight: "bold" }}>
                  Hang Up Call
                </button>
              )}
            </div>

            {/* Video Streams */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", backgroundColor: "#09090b", padding: "10px", borderRadius: "8px" }}>
              <video ref={localVideoRef} autoPlay playsInline muted style={{ width: "100%", height: "120px", backgroundColor: "#000", borderRadius: "6px", objectFit: "cover" }} />
              <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", height: "120px", backgroundColor: "#000", borderRadius: "6px", objectFit: "cover" }} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}