import { useState, useEffect, useRef } from "react";
import api from "../../../api/axios";

export default function MeetingRoom({ meeting, forum, userRole, onLeave }) {
    const [participants, setParticipants] = useState([]);
    const [cameraOn, setCameraOn] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [screenSharing, setScreenSharing] = useState(false);
    const [error, setError] = useState("");
    const [isLeaving, setIsLeaving] = useState(false);

    const videoGridRef = useRef(null);
    const localVideoRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const peerConnectionsRef = useRef({});

    // Initialize media and WebSocket
    useEffect(() => {
        initializeMedia();
        const interval = setInterval(fetchParticipants, 5000);

        return () => {
            clearInterval(interval);
            cleanupMedia();
            handleLeaveMeeting();
        };
    }, []);

    const initializeMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            mediaStreamRef.current = stream;

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // Apply audio/video constraints based on state
            updateMediaTracks(stream);
        } catch (err) {
            setError(
                "Camera/microphone access denied. Check browser permissions."
            );
            console.error("Media error:", err);
        }
    };

    const updateMediaTracks = (stream) => {
        stream.getAudioTracks().forEach((track) => {
            track.enabled = micOn;
        });
        stream.getVideoTracks().forEach((track) => {
            track.enabled = cameraOn;
        });
    };

    const fetchParticipants = async () => {
        try {
            const res = await api.get(
                `/forums/${forum.id}/meetings/${meeting.id}/participants/`
            );
            setParticipants(res.data);
        } catch (err) {
            console.error("Failed to fetch participants", err);
        }
    };

    const cleanupMedia = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => {
                track.stop();
            });
        }

        Object.values(peerConnectionsRef.current).forEach((pc) => {
            pc.close();
        });
        peerConnectionsRef.current = {};
    };

    const handleToggleCamera = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getVideoTracks().forEach((track) => {
                track.enabled = !cameraOn;
            });
            setCameraOn(!cameraOn);
        }
    };

    const handleToggleMic = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = !micOn;
            });
            setMicOn(!micOn);
        }
    };

    const handleToggleScreenShare = async () => {
        try {
            if (!screenSharing) {
                const screenStream =
                    await navigator.mediaDevices.getDisplayMedia({
                        video: true,
                    });

                const screenTrack = screenStream.getVideoTracks()[0];

                // Replace video track in all peer connections
                const videoTrack = mediaStreamRef.current?.getVideoTracks()[0];
                if (videoTrack) {
                    mediaStreamRef.current?.removeTrack(videoTrack);
                }

                mediaStreamRef.current?.addTrack(screenTrack);

                // Handle screen share stop
                screenTrack.onended = () => {
                    handleToggleScreenShare();
                };

                setScreenSharing(true);
            } else {
                const videoStream =
                    await navigator.mediaDevices.getUserMedia({
                        video: true,
                    });
                const videoTrack = videoStream.getVideoTracks()[0];

                const screenTrack =
                    mediaStreamRef.current?.getVideoTracks()[0];
                if (screenTrack) {
                    mediaStreamRef.current?.removeTrack(screenTrack);
                }

                mediaStreamRef.current?.addTrack(videoTrack);
                setScreenSharing(false);
            }
        } catch (err) {
            console.error("Screen share error:", err);
            setError("Failed to share screen");
        }
    };

    const handleLeaveMeeting = async () => {
        setIsLeaving(true);
        try {
            await api.post(
                `/forums/${forum.id}/meetings/${meeting.id}/leave/`
            );
        } catch (err) {
            console.error("Error leaving meeting:", err);
        } finally {
            cleanupMedia();
            onLeave();
        }
    };

    const handleExtendMeeting = async (minutes) => {
        try {
            await api.post(
                `/forums/${forum.id}/meetings/${meeting.id}/extend-meeting/`,
                { duration_minutes: minutes }
            );
            // Refresh meeting data
            const res = await api.get(`/forums/${forum.id}/meetings/${meeting.id}/`);
            // Update parent component's meeting data
            setError("");
        } catch (err) {
            setError("Failed to extend meeting");
            console.error(err);
        }
    };

    const endTime = new Date(meeting.scheduled_end);
    const timeRemaining = Math.max(
        0,
        Math.floor((endTime.getTime() - Date.now()) / 1000)
    );
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    return (
        <div className="fixed inset-0 bg-black flex flex-col z-50">
            {/* Header */}
            <div className="bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-white text-xl font-semibold">
                        {meeting.title}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {participants.length + 1} participant
                        {participants.length !== 0 ? "s" : ""}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Admin Controls */}
                    {(userRole === "SA" || userRole === "CP") && (
                        <div className="flex gap-2">
                            <div className="relative group">
                                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold">
                                    ⏱ Extend
                                </button>
                                <div className="absolute right-0 mt-2 w-40 bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-10">
                                    <button
                                        onClick={() => handleExtendMeeting(15)}
                                        className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 text-sm rounded-t-lg"
                                    >
                                        Extend +15 min
                                    </button>
                                    <button
                                        onClick={() => handleExtendMeeting(30)}
                                        className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 text-sm"
                                    >
                                        Extend +30 min
                                    </button>
                                    <button
                                        onClick={() => handleExtendMeeting(60)}
                                        className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 text-sm rounded-b-lg"
                                    >
                                        Extend +1 hour
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="text-white font-mono text-lg">
                        {String(minutes).padStart(2, "0")}:
                        {String(seconds).padStart(2, "0")}
                    </div>

                    <button
                        onClick={handleLeaveMeeting}
                        disabled={isLeaving}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-semibold"
                    >
                        {isLeaving ? "Leaving..." : "Leave"}
                    </button>
                </div>
            </div>

            {/* Video Grid */}
            <div
                ref={videoGridRef}
                className="flex-1 overflow-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
                {/* Local Video */}
                <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                        You
                    </div>

                    {/* Local Controls */}
                    <div className="absolute bottom-2 right-2 flex gap-2">
                        <button
                            onClick={handleToggleMic}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition ${micOn
                                ? "bg-gray-600 hover:bg-gray-700 text-white"
                                : "bg-red-600 hover:bg-red-700 text-white"
                                }`}
                            title={micOn ? "Mute" : "Unmute"}
                        >
                            {micOn ? "🎤" : "🔇"}
                        </button>
                        <button
                            onClick={handleToggleCamera}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition ${cameraOn
                                ? "bg-gray-600 hover:bg-gray-700 text-white"
                                : "bg-red-600 hover:bg-red-700 text-white"
                                }`}
                            title={cameraOn ? "Turn off" : "Turn on"}
                        >
                            {cameraOn ? "📹" : "📷"}
                        </button>
                        <button
                            onClick={handleToggleScreenShare}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition ${screenSharing
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-gray-600 hover:bg-gray-700 text-white"
                                }`}
                            title={
                                screenSharing ? "Stop sharing" : "Share screen"
                            }
                        >
                            🖥️
                        </button>
                    </div>
                </div>

                {/* Participant Videos */}
                {participants.map((participant) => (
                    <div
                        key={participant.id}
                        className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video flex items-center justify-center"
                    >
                        <div className="text-gray-400 text-center">
                            {participant.user_profile?.profile_photo ? (
                                <img
                                    src={
                                        participant.user_profile.profile_photo
                                    }
                                    alt={participant.user_name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 rounded-full bg-gray-600"></div>
                                    <p className="text-xs">
                                        {participant.user_name ||
                                            participant.user_email}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                            {participant.user_name ||
                                participant.user_email}
                        </div>
                        {!participant.is_currently_active && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                <span className="text-white text-xs">
                                    Offline
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-900 border-t border-red-700 text-red-200 px-6 py-3">
                    {error}
                </div>
            )}

            {/* Controls Bar (Mobile) */}
            <div className="bg-gray-900 border-t border-gray-700 px-6 py-4 md:hidden flex justify-center gap-4">
                <button
                    onClick={handleToggleMic}
                    className={`px-4 py-2 rounded-lg transition ${micOn
                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white"
                        }`}
                >
                    {micOn ? "🎤" : "🔇"} Mic
                </button>
                <button
                    onClick={handleToggleCamera}
                    className={`px-4 py-2 rounded-lg transition ${cameraOn
                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white"
                        }`}
                >
                    {cameraOn ? "📹" : "📷"} Camera
                </button>
                <button
                    onClick={handleToggleScreenShare}
                    className={`px-4 py-2 rounded-lg transition ${screenSharing
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gray-700 hover:bg-gray-600 text-white"
                        }`}
                >
                    🖥️ {screenSharing ? "Stop" : "Share"}
                </button>
            </div>
        </div>
    );
}
