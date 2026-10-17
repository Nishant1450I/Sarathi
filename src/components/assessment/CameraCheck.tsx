import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';

interface CameraCheckProps {
  enabled?: boolean;
}

export const CameraCheck: React.FC<CameraCheckProps> = ({
  enabled = import.meta.env.VITE_ASSESSMENT_CAMERA_ENABLED === 'true',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let mediaStream: MediaStream | null = null;

    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 320, height: 240, frameRate: 15 } })
      .then((stream) => {
        mediaStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreamActive(true);
        }
      })
      .catch((err) => {
        setPermissionError(err.message || 'Camera access unavailable');
      });

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [enabled]);

  if (!enabled) {
    return (
      <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 font-medium border border-slate-200 dark:border-slate-700">
        <CameraOff className="w-3.5 h-3.5 text-slate-400" />
        <span>Privacy Mode (Camera Disabled)</span>
      </div>
    );
  }

  return (
    <div className="relative w-36 h-24 rounded-xl overflow-hidden border-2 border-indigo-500 shadow-md bg-black">
      {streamActive ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover transform -scale-x-100"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-[10px] text-slate-400">
          <Camera className="w-4 h-4 mb-1 text-slate-500 animate-pulse" />
          <span>{permissionError ? 'Cam Blocked' : 'Connecting...'}</span>
        </div>
      )}
      <div className="absolute top-1 left-1 flex items-center space-x-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Local</span>
      </div>
    </div>
  );
};
