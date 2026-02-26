"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");

  return (
    <main style={{ maxWidth: 400, margin: "auto" }}>
      <h1>WebRTC Live Stream</h1>

      <button
        onClick={() => router.push("/stream")}
        style={{ width: "100%", padding: 12, marginBottom: 20 }}
      >
        🎥 Start Streaming
      </button>

      <h3>Watch Stream</h3>
      <input
        placeholder="Enter Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 8 }}
      />
      <button
        onClick={() => {
          if (roomId.trim()) router.push(`/watch/${roomId.trim()}`);
        }}
        style={{ width: "100%", padding: 12 }}
      >
        🔗 Watch
      </button>
    </main>
  );
}