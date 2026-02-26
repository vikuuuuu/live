"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");

  return (
    <main style={{ maxWidth: 400, margin: "auto" }}>
      <h2>🎥 Live Stream App</h2>

      <button
        onClick={() => router.push("/stream")}
        style={{ width: "100%", padding: 12 }}
      >
        ▶ Start Streaming
      </button>

      <hr style={{ margin: 20 }} />

      <input
        placeholder="Enter Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        style={{ width: "100%", padding: 10 }}
      />

      <button
        onClick={() => router.push(`/watch/${roomId}`)}
        style={{ width: "100%", padding: 12, marginTop: 8 }}
      >
        👀 Watch Stream
      </button>
    </main>
  );
}
