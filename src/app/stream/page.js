"use client";

import { useEffect, useRef, useState } from "react";
import { collection, addDoc, setDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function StreamPage() {
  const localVideo = useRef(null);
  const pc = useRef(null);
  const streamRef = useRef(null);

  const [roomId, setRoomId] = useState(null);
  const [isLive, setIsLive] = useState(false);

  const startStream = async () => {
    pc.current = new RTCPeerConnection(iceServers);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    streamRef.current = stream;
    localVideo.current.srcObject = stream;

    stream.getTracks().forEach((track) =>
      pc.current.addTrack(track, stream)
    );

    const roomRef = await addDoc(collection(db, "rooms"), {});
    setRoomId(roomRef.id);

    pc.current.onicecandidate = async (event) => {
      if (event.candidate) {
        await addDoc(
          collection(db, "rooms", roomRef.id, "callerCandidates"),
          event.candidate.toJSON()
        );
      }
    };

    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);

    await setDoc(doc(db, "rooms", roomRef.id), {
      offer: { type: offer.type, sdp: offer.sdp },
      status: "live",
    });

    onSnapshot(doc(db, "rooms", roomRef.id), async (snap) => {
      const data = snap.data();
      if (data?.answer && !pc.current.currentRemoteDescription) {
        await pc.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      }
    });

    onSnapshot(
      collection(db, "rooms", roomRef.id, "calleeCandidates"),
      (snap) => {
        snap.docChanges().forEach((c) => {
          if (c.type === "added") {
            pc.current.addIceCandidate(
              new RTCIceCandidate(c.doc.data())
            );
          }
        });
      }
    );

    setIsLive(true);
  };

  const endStream = async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    pc.current?.close();

    if (roomId) {
      await setDoc(
        doc(db, "rooms", roomId),
        { status: "offline" },
        { merge: true }
      );
    }

    setIsLive(false);
    setRoomId(null);
  };

  return (
    <main style={{ maxWidth: 800, margin: "auto", textAlign: "center" }}>
      <h2>🎥 Broadcaster</h2>

      <video
        ref={localVideo}
        autoPlay
        muted
        controls
        playsInline
        style={{
          width: "100%",
          maxWidth: 700,
          borderRadius: 10,
          background: "#000",
        }}
      />

      <div style={{ marginTop: 20 }}>
        {!isLive ? (
          <button
            onClick={startStream}
            style={{
              padding: "12px 30px",
              background: "#e53935",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 16,
            }}
          >
            ▶ Start Stream
          </button>
        ) : (
          <button
            onClick={endStream}
            style={{
              padding: "12px 30px",
              background: "#555",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 16,
            }}
          >
            ⛔ End Stream
          </button>
        )}
      </div>

      {roomId && (
        <p style={{ marginTop: 20 }}>
          Share link: <br />
          <b>/watch/{roomId}</b>
        </p>
      )}
    </main>
  );
}