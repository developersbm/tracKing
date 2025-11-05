import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import * as posenet from "@tensorflow-models/posenet";
import { drawKeypoints, drawSkeleton } from "../utilities";

const MIN_PART_CONF = 0.5;

function LiveView({ onUpdateStats }) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [fullBodyVisible, setFullBodyVisible] = useState(true);

  // Local pose state via refs to avoid rerenders in loop
  const counterRef = useRef(0);
  const stageRef = useRef(null); // 'up' | 'down' | null

  // Helper: elbow angle in degrees at point b
  const calculateAngle = (a, b, c) => {
    if (!a || !b || !c) return null;
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const magAB = Math.hypot(ab.x, ab.y);
    const magCB = Math.hypot(cb.x, cb.y);
    const denom = magAB * magCB;
    if (!denom || !isFinite(denom)) return null;
    let cos = dot / denom;
    cos = Math.min(1, Math.max(-1, cos));
    return (Math.acos(cos) * 180) / Math.PI;
  };

  // Determine if "full body" is reasonably visible
  const isFullBodyVisible = (keypoints) => {
    if (!keypoints || keypoints.length === 0) return false;
    const need = [
      "leftShoulder",
      "rightShoulder",
      "leftElbow",
      "rightElbow",
      "leftWrist",
      "rightWrist",
    ];
    return need.every((part) => {
      const kp = keypoints.find((k) => k.part === part);
      return kp && kp.score >= 0.4;
    });
  };

  useEffect(() => {
    let intervalId = null;
    let cancelled = false;

    const run = async () => {
      await tf.ready();
      const net = await posenet.load({
        inputResolution: { width: 640, height: 480 },
        scale: 0.8,
      });
      console.log("PoseNet loaded");

      const detect = async () => {
        const cam = webcamRef.current;
        const canvas = canvasRef.current;
        if (!cam || !canvas) return;
        const video = cam.video;
        if (!video || video.readyState !== 4) return;

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        video.width = videoWidth;
        video.height = videoHeight;

        const pose = await net.estimateSinglePose(video);
        const keypoints = pose && pose.keypoints ? pose.keypoints : [];

        // Extract left arm joints
        const leftShoulder = keypoints.find((k) => k.part === "leftShoulder");
        const leftElbow = keypoints.find((k) => k.part === "leftElbow");
        const leftWrist = keypoints.find((k) => k.part === "leftWrist");

        let angle = null;
        if (
          leftShoulder && leftShoulder.score >= MIN_PART_CONF &&
          leftElbow && leftElbow.score >= MIN_PART_CONF &&
          leftWrist && leftWrist.score >= MIN_PART_CONF
        ) {
          const shoulder = { x: leftShoulder.position.x, y: leftShoulder.position.y };
          const elbow = { x: leftElbow.position.x, y: leftElbow.position.y };
          const wrist = { x: leftWrist.position.x, y: leftWrist.position.y };
          const computed = calculateAngle(shoulder, elbow, wrist);
          if (computed !== null && isFinite(computed)) {
            angle = computed;
            // Rep logic
            if (angle > 160) {
              if (stageRef.current !== "down") stageRef.current = "down";
            }
            if (angle < 30 && stageRef.current === "down") {
              stageRef.current = "up";
              counterRef.current = counterRef.current + 1;
            }
          }
        }

        // Draw on canvas
        const ctx = canvas.getContext("2d");
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        drawKeypoints(keypoints, 0.6, ctx);
        // drawSkeleton(keypoints, 0.7, ctx);

        // Angle label near elbow
        if (angle !== null && leftElbow && leftElbow.score >= MIN_PART_CONF) {
          const ex = leftElbow.position.x;
          const ey = leftElbow.position.y;
          ctx.font = "16px Arial";
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 3;
          const label = `${Math.round(angle)}°`;
          ctx.strokeText(label, ex + 6, ey - 6);
          ctx.fillText(label, ex + 6, ey - 6);
        }


        const bodyOk = isFullBodyVisible(keypoints);
        if (fullBodyVisible !== bodyOk) setFullBodyVisible(bodyOk);

        // Session stats up to parent
        if (onUpdateStats) {
          onUpdateStats({
            reps: counterRef.current,
            stage: stageRef.current,
            angle: angle !== null ? Math.round(angle) : null,
            fullBodyVisible: bodyOk,
          });
        }
      };

      intervalId = setInterval(() => {
        if (!cancelled) detect();
      }, 100);
    };

    run();
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [onUpdateStats]);

  const isBlurred = !fullBodyVisible;

  return (
    <div className="video-wrapper">
      <Webcam
        ref={webcamRef}
        className={`video${isBlurred ? " blurred" : ""}`}
        audio={false}
        style={{ width: 640, height: 480 }}
      />
      <canvas
        ref={canvasRef}
        className={`overlay detection-layer${isBlurred ? " blurred" : ""}`}
        style={{ width: 640, height: 480 }}
      />
      {isBlurred && (
        <div className="overlay message-layer" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", padding: 12, borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Move into view</div>
            <div style={{ color: "#eab308" }}>Make sure your upper body is visible.</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveView;
