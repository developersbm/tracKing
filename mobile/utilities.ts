// utilities.ts
import * as poseDetection from '@tensorflow-models/pose-detection';
import { CanvasRenderingContext2D } from 'react-native-canvas';

type Keypoint = poseDetection.Keypoint;

/**
 * Draws keypoints on a canvas.
 */
export function drawKeypoints(
  keypoints: Keypoint[],
  minConfidence: number,
  ctx: CanvasRenderingContext2D,
  scaleX = 1,
  scaleY = 1
) {
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i];

    if (keypoint.score && keypoint.score > minConfidence) {
      const { y, x } = keypoint;
      ctx.beginPath();
      ctx.arc(x * scaleX, y * scaleY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = 'aqua';
      ctx.fill();
    }
  }
}

// Find keypoint by name
function getKeypoint(keypoints: Keypoint[], part: string, minConfidence: number) {
  const keypoint = keypoints.find(k => k.name === part);
  return keypoint && keypoint.score && keypoint.score > minConfidence ? keypoint : null;
}

/**
 * Draws a line between two keypoints.
 */
function drawSegment(
  kp1: Keypoint,
  kp2: Keypoint,
  ctx: CanvasRenderingContext2D,
  scaleX: number,
  scaleY: number
) {
  ctx.beginPath();
  ctx.moveTo(kp1.x * scaleX, kp1.y * scaleY);
  ctx.lineTo(kp2.x * scaleX, kp2.y * scaleY);
  ctx.strokeStyle = 'aqua';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * Draws the skeleton on a canvas.
 */
export function drawSkeleton(
  keypoints: Keypoint[],
  minConfidence: number,
  ctx: CanvasRenderingContext2D,
  scaleX = 1,
  scaleY = 1
) {
  const adjacentPairs: [string, string][] = [
    ['left_shoulder', 'left_elbow'],
    ['left_elbow', 'left_wrist'],
    ['right_shoulder', 'right_elbow'],
    ['right_elbow', 'right_wrist'],
    ['left_hip', 'left_knee'],
    ['left_knee', 'left_ankle'],
    ['right_hip', 'right_knee'],
    ['right_knee', 'right_ankle'],
    ['left_shoulder', 'right_shoulder'],
    ['left_hip', 'right_hip'],
    ['left_shoulder', 'left_hip'],
    ['right_shoulder', 'right_hip']
  ];

  adjacentPairs.forEach(([partA, partB]) => {
    const kpA = getKeypoint(keypoints, partA, minConfidence);
    const kpB = getKeypoint(keypoints, partB, minConfidence);
    
    if (kpA && kpB) {
      drawSegment(kpA, kpB, ctx, scaleX, scaleY);
    }
  });

  // Draw face lines
  const nose = getKeypoint(keypoints, 'nose', minConfidence);
  const leftEye = getKeypoint(keypoints, 'left_eye', minConfidence);
  const rightEye = getKeypoint(keypoints, 'right_eye', minConfidence);
  const leftEar = getKeypoint(keypoints, 'left_ear', minConfidence);
  const rightEar = getKeypoint(keypoints, 'right_ear', minConfidence);

  if (nose && leftEye) {
    drawSegment(nose, leftEye, ctx, scaleX, scaleY);
  }
  if (nose && rightEye) {
    drawSegment(nose, rightEye, ctx, scaleX, scaleY);
  }
  if (leftEye && leftEar) {
    drawSegment(leftEye, leftEar, ctx, scaleX, scaleY);
  }
  if (rightEye && rightEar) {
    drawSegment(rightEye, rightEar, ctx, scaleX, scaleY);
  }
}
