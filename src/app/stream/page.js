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
  const pc = useRef(null);
  const [roomId, setRoomId] = useState("");

  useEffect(() => {
    const start = async () => {
      pc.current = new RTCPeerConnection(iceServers);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localVideo.current.srcObject = stream;

      stream.getTracks().forEach((track) => {
        pc.current.addTrack(track, stream);
      });

      const roomRef = await addDoc(collection(db, "rooms"), {});
      setRoomId(roomRef.id);

      pc.current.onicecandidate = async (e) => {
        if (e.candidate) {
          await addDoc(
            collection(db, "rooms", roomRef.id, "callerCandidates"),
            e.candidate.toJSON()
          );
        }
      };

      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);

      await setDoc(doc(db, "rooms", roomRef.id), {
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      });

      // listen answer
      onSnapshot(doc(db, "rooms", roomRef.id), async (snap) => {
        const data = snap.data();
        if (data?.answer && !pc.current.currentRemoteDescription) {
          await pc.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
        }
      });

      // listen callee ICE
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

      pc.current.onconnectionstatechange = () => {
        console.log("STREAM STATE:", pc.current.connectionState);
      };
    };

    start();

    return () => {
      pc.current?.close();
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
          Share link 👉 <br />
          https://live-iota-blond.vercel.app/watch/{roomId}
        </p>
      )}
    </main>
  );
}
