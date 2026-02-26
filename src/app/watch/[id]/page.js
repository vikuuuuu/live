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
  const { id } = useParams();
  const pc = useRef(null);

  useEffect(() => {
    const joinRoom = async () => {
      pc.current = new RTCPeerConnection(iceServers);

      // 🎥 Remote stream
      pc.current.ontrack = (event) => {
        remoteVideo.current.srcObject = event.streams[0];
      };

      const roomRef = doc(db, "rooms", id);
      const roomSnap = await getDoc(roomRef);

      if (!roomSnap.exists()) {
        alert("Room not found");
        return;
      }

      const roomData = roomSnap.data();

      // 📥 Set offer
      await pc.current.setRemoteDescription(
        new RTCSessionDescription(roomData.offer)
      );

      // 📡 Create answer
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      await updateDoc(roomRef, {
        answer: {
          type: answer.type,
          sdp: answer.sdp,
        },
      });

      // 📤 ICE candidates (callee)
      pc.current.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(
            collection(db, "rooms", id, "calleeCandidates"),
            event.candidate.toJSON()
          );
        }
      };

      // 📥 Listen for caller ICE
      onSnapshot(
        collection(db, "rooms", id, "callerCandidates"),
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const candidate = new RTCIceCandidate(change.doc.data());
              pc.current.addIceCandidate(candidate);
            }
          });
        }
      );
    };

    joinRoom();

    return () => {
      if (pc.current) {
        pc.current.close();
        pc.current = null;
      }
    };
  }, [id]);

  return (
    <main>
      <h1>👀 Watching Live Stream</h1>
      <video
        ref={remoteVideo}
        autoPlay
        playsInline
        controls
        style={{ width: 600, borderRadius: 8 }}
      />
    </main>
  );
}
