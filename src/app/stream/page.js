"use client";

import { useEffect, useRef, useState } from "react";
import { collection, addDoc, setDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const iceServers = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function StreamPage() {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const pc = useRef(null);
  const streamRef = useRef(null);
  const [roomId, setRoomId] = useState(null);

  const startCall = async () => {
    pc.current = new RTCPeerConnection(iceServers);

    // 🎥 local media
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    streamRef.current = stream;
    localVideo.current.srcObject = stream;

    stream.getTracks().forEach((track) =>
      pc.current.addTrack(track, stream)
    );

    // 👀 remote media
    pc.current.ontrack = (e) => {
      remoteVideo.current.srcObject = e.streams[0];
    };

    const roomRef = await addDoc(collection(db, "rooms"), {});
    setRoomId(roomRef.id);

    pc.current.onicecandidate = (e) => {
      e.candidate &&
        addDoc(
          collection(db, "rooms", roomRef.id, "callerCandidates"),
          e.candidate.toJSON()
        );
    };

    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);

    await setDoc(doc(db, "rooms", roomRef.id), {
      offer: { type: offer.type, sdp: offer.sdp },
    });

    // answer listen
    onSnapshot(doc(db, "rooms", roomRef.id), async (snap) => {
      const data = snap.data();
      if (data?.answer && !pc.current.currentRemoteDescription) {
        await pc.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      }
    });

    // callee ICE
    onSnapshot(
      collection(db, "rooms", roomRef.id, "calleeCandidates"),
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

  const endCall = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    pc.current?.close();
  };

  return (
    <main style={{ textAlign: "center" }}>
      <h2>📞 Video Call (Caller)</h2>

      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <video ref={localVideo} autoPlay muted playsInline width={300} />
        <video ref={remoteVideo} autoPlay playsInline width={300} />
      </div>

      <button onClick={startCall}>📞 Start Call</button>
      <button onClick={endCall}>❌ End Call</button>

      {roomId && <p>Share: /watch/{roomId}</p>}
    </main>
  );
}
