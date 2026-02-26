"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  const router = useRouter();

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const pc = useRef(null);
  const streamRef = useRef(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

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

      streamRef.current = stream;
      localVideo.current.srcObject = stream;
      stream.getTracks().forEach((t) => pc.current.addTrack(t, stream));

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

      onSnapshot(doc(db, "rooms", id), (snap) => {
        if (snap.data()?.status === "ended") {
          cleanupAndExit();
        }
      });

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
    return () => cleanupAndExit();
  }, [id]);

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

  const cleanupAndExit = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    pc.current?.close();
    router.push("/");
  };

  return (
    <main style={{ textAlign: "center" }}>
      <h2>📞 Video Call</h2>

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
          onClick={cleanupAndExit}
          style={{ marginLeft: 10, color: "red" }}
        >
          ❌ End Call
        </button>
      </div>
    </main>
  );
}
