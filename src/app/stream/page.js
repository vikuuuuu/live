"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  addDoc,
  setDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function StreamPage() {
  const localVideo = useRef(null);
  const [roomId, setRoomId] = useState(null);
  const pc = useRef(null);

  useEffect(() => {
    const startStream = async () => {
      pc.current = new RTCPeerConnection();

      // Get media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.current.srcObject = stream;

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.current.addTrack(track, stream);
      });

      // Create room in Firestore
      const roomRef = await addDoc(collection(db, "rooms"), {});
      setRoomId(roomRef.id);

      // Listen for ICE candidates and add to Firestore
      pc.current.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(collection(db, "rooms", roomRef.id, "callerCandidates"), event.candidate.toJSON());
        }
      };

      // Create offer
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);

      // Save offer in Firestore
      await setDoc(doc(db, "rooms", roomRef.id), { offer: { type: offer.type, sdp: offer.sdp } });
    };

    startStream();

    // Cleanup on unmount
    return () => {
      if (pc.current) {
        pc.current.close();
        pc.current = null;
      }
    };
  }, []);

  return (
    <main>
      <h1>Streaming...</h1>
      <video
        ref={localVideo}
        autoPlay
        playsInline
        muted
        style={{ width: "600px", borderRadius: 8 }}
      />
      {roomId && (
        <p>
          Share this room ID with viewers:{" "}
          <code>{roomId}</code>
        </p>
      )}
    </main>
  );
}