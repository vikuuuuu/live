"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  addDoc,
  setDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function StreamPage() {
  const localVideo = useRef(null);
  const [roomId, setRoomId] = useState(null);
  const pc = useRef(null);

  useEffect(() => {
    const startStream = async () => {
      pc.current = new RTCPeerConnection(iceServers);

      // 🎥 Get camera + mic
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localVideo.current.srcObject = stream;

      stream.getTracks().forEach((track) => {
        pc.current.addTrack(track, stream);
      });

      // 🔥 Create room
      const roomRef = await addDoc(collection(db, "rooms"), {});
      setRoomId(roomRef.id);

      // 📤 ICE candidates (caller)
      pc.current.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(
            collection(db, "rooms", roomRef.id, "callerCandidates"),
            event.candidate.toJSON()
          );
        }
      };

      // 📡 Create offer
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);

      await setDoc(doc(db, "rooms", roomRef.id), {
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      });

      // 📥 Listen for answer
      onSnapshot(doc(db, "rooms", roomRef.id), async (snapshot) => {
        const data = snapshot.data();
        if (!pc.current.currentRemoteDescription && data?.answer) {
          const answer = new RTCSessionDescription(data.answer);
          await pc.current.setRemoteDescription(answer);
        }
      });

      // 📥 Listen for callee ICE
      onSnapshot(
        collection(db, "rooms", roomRef.id, "calleeCandidates"),
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

    startStream();

    return () => {
      if (pc.current) {
        pc.current.close();
        pc.current = null;
      }
    };
  }, []);

  return (
    <main>
      <h1>🔴 Live Streaming</h1>
      <video
        ref={localVideo}
        autoPlay
        muted
        playsInline
        style={{ width: 600, borderRadius: 8 }}
      />
      {roomId && (
        <p>
          Share this link 👉 <br />
          https://live-iota-blond.vercel.app/watch/{roomId}
        </p>
      )}
    </main>
  );
}
