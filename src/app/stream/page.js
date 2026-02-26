"use client";

import { useEffect, useRef, useState } from "react";
import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

export default function StreamPage() {
  const videoRef = useRef(null);
  const pc = useRef(null);
  const streamRef = useRef(null);

  const [roomId, setRoomId] = useState("");
  const [isLive, setIsLive] = useState(false);

  const startStream = async () => {
    pc.current = new RTCPeerConnection(iceServers);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    streamRef.current = stream;
    videoRef.current.srcObject = stream;

    stream.getTracks().forEach((track) =>
      pc.current.addTrack(track, stream)
    );

    const roomRef = await addDoc(collection(db, "rooms"), {
      status: "live",
    });

    setRoomId(roomRef.id);
    setIsLive(true);

    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);

    await setDoc(doc(db, "rooms", roomRef.id), {
      offer,
      status: "live",
    });
  };

  const endStream = async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    pc.current?.close();
    setIsLive(false);

    await setDoc(
      doc(db, "rooms", roomId),
      { status: "offline" },
      { merge: true }
    );
  };

  return (
    <main>
      <h2>🔴 Broadcaster</h2>

      <video
        ref={videoRef}
        autoPlay
        muted
        controls
        style={{ width: 600 }}
      />

      {!isLive ? (
        <button onClick={startStream}>▶ Start Stream</button>
      ) : (
        <button onClick={endStream}>⛔ End Stream</button>
      )}

      {roomId && (
        <p>
          Share link: <br />
          <b>/watch/{roomId}</b>
        </p>
      )}
    </main>
  );
}
