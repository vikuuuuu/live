"use client";

import { useRef, useState } from "react";
import { collection, addDoc, setDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

const iceServers = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function StreamPage() {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const pc = useRef(null);
  const streamRef = useRef(null);

  const [roomId, setRoomId] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const router = useRouter();

  const startCall = async () => {
    pc.current = new RTCPeerConnection(iceServers);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    streamRef.current = stream;
    localVideo.current.srcObject = stream;

    stream.getTracks().forEach((t) => pc.current.addTrack(t, stream));

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

  const toggleMic = () => {
    const track = streamRef.current.getAudioTracks()[0];
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  const toggleCamera = () => {
    const track = streamRef.current.getVideoTracks()[0];
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  };

  const endCall = async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    pc.current?.close();

    if (roomId) {
      await setDoc(
        doc(db, "rooms", roomId),
        { status: "ended" },
        { merge: true }
      );
    }

    router.push("/");
  };

  return (
    <main style={{ textAlign: "center" }}>
      <h2>📞 Video Call (Caller)</h2>

      <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
        <video ref={localVideo} autoPlay muted playsInline width={280} />
        <video ref={remoteVideo} autoPlay playsInline width={280} />
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={toggleMic}>
          {micOn ? "🔇 Mute Mic" : "🎤 Unmute Mic"}
        </button>

        <button onClick={toggleCamera} style={{ marginLeft: 10 }}>
          {camOn ? "📷 Camera Off" : "📷 Camera On"}
        </button>

        <button
          onClick={endCall}
          style={{ marginLeft: 10, color: "red" }}
        >
          ❌ End Call
        </button>
      </div>

      {roomId && <p>Share link: /watch/{roomId}</p>}
    </main>
  );
}
