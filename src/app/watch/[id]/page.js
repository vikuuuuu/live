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

export default function WatchPage() {
  const remoteVideo = useRef(null);
  const { id } = useParams();
  const pc = useRef(null);

  useEffect(() => {
    const joinRoom = async () => {
      pc.current = new RTCPeerConnection();

      // Set remote track
      pc.current.ontrack = (event) => {
        remoteVideo.current.srcObject = event.streams[0];
      };

      // Get room and offer
      const roomRef = doc(db, "rooms", id);
      const roomSnap = await getDoc(roomRef);

      if (!roomSnap.exists()) {
        alert("Room not found!");
        return;
      }

      const roomData = roomSnap.data();

      // Set remote description with offer
      await pc.current.setRemoteDescription(new RTCSessionDescription(roomData.offer));

      // Create answer
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      // Save answer to Firestore
      await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } });

      // Send ICE candidates
      pc.current.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(collection(db, "rooms", id, "calleeCandidates"), event.candidate.toJSON());
        }
      };

      // Listen for broadcaster ICE candidates
      onSnapshot(collection(db, "rooms", id, "callerCandidates"), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const candidate = new RTCIceCandidate(change.doc.data());
            pc.current.addIceCandidate(candidate);
          }
        });
      });

      // Optional: Monitor ICE connection state
      pc.current.oniceconnectionstatechange = () => {
        console.log("ICE State:", pc.current.iceConnectionState);
      };
    };

    joinRoom();

    // Cleanup on unmount
    return () => {
      if (pc.current) {
        pc.current.close();
        pc.current = null;
      }
    };
  }, [id]);

  return (
    <main>
      <h1>Watching Stream</h1>
      <video
        ref={remoteVideo}
        autoPlay
        playsInline
        style={{ width: "600px", borderRadius: 8 }}
      />
    </main>
  );
}