"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const iceServers = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function WatchPage() {
  const videoRef = useRef(null);
  const pc = useRef(null);
  const { id } = useParams();

  useEffect(() => {
    const join = async () => {
      pc.current = new RTCPeerConnection(iceServers);

      pc.current.ontrack = (e) => {
        videoRef.current.srcObject = e.streams[0];
      };

      const roomRef = doc(db, "rooms", id);
      const snap = await getDoc(roomRef);
      const data = snap.data();

      if (data?.status !== "live") {
        alert("Stream offline");
        return;
      }

      await pc.current.setRemoteDescription(data.offer);
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      await setDoc(
        roomRef,
        { answer },
        { merge: true }
      );
    };

    join();
    return () => pc.current?.close();
  }, [id]);

  return (
    <main>
      <h2>👀 Watching Stream</h2>

      <video
        ref={videoRef}
        autoPlay
        controls
        playsInline
        style={{ width: 600 }}
      />
    </main>
  );
}
