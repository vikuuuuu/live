"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function WatchPage() {
  const remoteVideo = useRef(null);
  const pc = useRef(null);
  const { id } = useParams();

  useEffect(() => {
    const join = async () => {
      pc.current = new RTCPeerConnection(iceServers);

      pc.current.ontrack = (e) => {
        remoteVideo.current.srcObject = e.streams[0];
      };

      const roomRef = doc(db, "rooms", id);
      const snap = await getDoc(roomRef);

      if (!snap.exists() || snap.data().status !== "live") {
        alert("Stream offline");
        return;
      }

      await pc.current.setRemoteDescription(
        new RTCSessionDescription(snap.data().offer)
      );

      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      await updateDoc(roomRef, {
        answer: { type: answer.type, sdp: answer.sdp },
      });

      pc.current.onicecandidate = async (e) => {
        if (e.candidate) {
          await addDoc(
            collection(db, "rooms", id, "calleeCandidates"),
            e.candidate.toJSON()
          );
        }
      };

      onSnapshot(
        collection(db, "rooms", id, "callerCandidates"),
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
    };

    join();
    return () => pc.current?.close();
  }, [id]);

  return (
    <main style={{ textAlign: "center" }}>
      <h2>👀 Watching Live</h2>

      <video
        ref={remoteVideo}
        autoPlay
        controls
        playsInline
        style={{
          width: "100%",
          maxWidth: 700,
          borderRadius: 10,
          background: "#000",
        }}
      />
    </main>
  );
}