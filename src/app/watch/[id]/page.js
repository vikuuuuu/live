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
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function WatchPage() {
  const { id } = useParams();
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const pc = useRef(null);

  useEffect(() => {
    const joinCall = async () => {
      pc.current = new RTCPeerConnection(iceServers);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      localVideo.current.srcObject = stream;
      stream.getTracks().forEach((t) =>
        pc.current.addTrack(t, stream)
      );

      pc.current.ontrack = (e) => {
        remoteVideo.current.srcObject = e.streams[0];
      };

      const roomRef = doc(db, "rooms", id);
      const snap = await getDoc(roomRef);
      const data = snap.data();

      await pc.current.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );

      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      await updateDoc(roomRef, {
        answer: { type: answer.type, sdp: answer.sdp },
      });

      pc.current.onicecandidate = (e) => {
        e.candidate &&
          addDoc(
            collection(db, "rooms", id, "calleeCandidates"),
            e.candidate.toJSON()
          );
      };

      onSnapshot(
        collection(db, "rooms", id, "callerCandidates"),
        (snap) =>
          snap.docChanges().forEach((c) => {
            if (c.type === "added") {
              pc.current.addIceCandidate(
                new RTCIceCandidate(c.doc.data())
              );
            }
          })
      );
    };

    joinCall();
    return () => pc.current?.close();
  }, [id]);

  return (
    <main style={{ textAlign: "center" }}>
      <h2>📞 Video Call (Receiver)</h2>

      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <video ref={localVideo} autoPlay muted playsInline width={300} />
        <video ref={remoteVideo} autoPlay playsInline width={300} />
      </div>
    </main>
  );
}
