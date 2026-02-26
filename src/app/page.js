"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");

  return (
    <main style={{ maxWidth: 420, margin: "60px auto", textAlign: "center" }}>
      <h1>🎥 WebRTC Live Stream</h1>

      <button
        onClick={() => router.push("/stream")}
        style={{
          width: "100%",
          padding: 14,
          fontSize: 16,
          background: "#e53935",
          color: "#fff",
          border: "none",
          borderRadius: 6,
        }}
      >
        🔴 Start Streaming
      </button>

      <hr style={{ margin: "30px 0" }} />

      <h3>Watch Stream</h3>
      <input
        placeholder="Enter Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          marginBottom: 10,
          borderRadius: 6,
        }}
      />
      <button
        onClick={() => roomId && router.push(`/watch/${roomId}`)}
        style={{
          width: "100%",
          padding: 12,
          background: "#1e88e5",
          color: "#fff",
          border: "none",
          borderRadius: 6,
        }}
      >
        👀 Watch
      </button>
    </main>
  );
}