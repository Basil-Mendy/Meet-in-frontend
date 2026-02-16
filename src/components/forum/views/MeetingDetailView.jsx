import { useState, useEffect } from "react";
import api from "../../../api/axios";
import MeetingRoom from "../room/MeetingRoom";

export default function MeetingDetailView({
    meeting,
    forum,
    userRole,
    onClose,
    onUpdate,
}) {
    const [showRoom, setShowRoom] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [loadingParticipants, setLoadingParticipants] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [meetingDetails, setMeetingDetails] = useState(meeting);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Fetch full meeting details on mount
    useEffect(() => {
        const fetchFullDetails = async () => {
            try {
                setLoadingDetails(true);
                const res = await api.get(
                    `/forums/${forum.id}/meetings/${meeting.id}/`
                );
                setMeetingDetails(res.data);
            } catch (err) {
                console.error("Failed to load meeting details", err);
                // Keep using the prop data if fetch fails
                setMeetingDetails(meeting);
            } finally {
                setLoadingDetails(false);
            }
        };

        if (meeting?.id && forum?.id) {
            fetchFullDetails();
        }
    }, [meeting?.id, forum?.id]);

    useEffect(() => {
        if (meetingDetails.status === "LIVE") {
            fetchParticipants();
            const interval = setInterval(fetchParticipants, 5000);
            return () => clearInterval(interval);
        } else if (meetingDetails.status === "PAST") {
            // For past meetings, fetch participants once to show attendance
            fetchParticipants();
        }
    }, [meetingDetails]);

    const fetchParticipants = async () => {
        try {
            setLoadingParticipants(true);
            const res = await api.get(
                `/forums/${forum.id}/meetings/${meetingDetails.id}/participants/`
            );
            setParticipants(res.data);
        } catch (err) {
            console.error("Failed to load participants", err);
        } finally {
            setLoadingParticipants(false);
        }
    };

    const getMeetingStatus = () => {
        const now = new Date();
        const start = new Date(meetingDetails.scheduled_start);
        const end = new Date(meetingDetails.scheduled_end);

        if (meetingDetails.is_cancelled) return "CANCELLED";
        if (now >= end) return "PAST";
        if (now >= start && now < end) return "LIVE";
        return "UPCOMING";
    };

    const handleUploadMinutes = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            setUploadError("Only PDF files are allowed");
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            // 50MB limit
            setUploadError("File size must be less than 50MB");
            return;
        }

        const formData = new FormData();
        formData.append("pdf_file", file);

        setUploading(true);
        setUploadError("");

        try {
            await api.post(
                `/forums/${forum.id}/meetings/${meetingDetails.id}/upload-minutes/`,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );
            onUpdate();
            setUploadError("");
        } catch (err) {
            setUploadError(
                err.response?.data?.error || "Failed to upload minutes"
            );
        } finally {
            setUploading(false);
        }
    };

    if (showRoom) {
        return (
            <MeetingRoom
                meeting={meetingDetails}
                forum={forum}
                userRole={userRole}
                onLeave={() => {
                    setShowRoom(false);
                    onUpdate();
                }}
            />
        );
    }

    const status = getMeetingStatus();
    const startTime = new Date(meetingDetails.scheduled_start);
    const endTime = new Date(meetingDetails.scheduled_end);

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6">
            {/* Back Button */}
            <button
                onClick={onClose}
                className="mb-6 flex items-center gap-2 text-primary hover:text-blue-900 transition"
            >
                <span>←</span> Back to Meetings
            </button>

            {/* Header */}
            <div className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-secondary">
                                {meetingDetails.title}
                            </h1>
                            {status === "LIVE" && (
                                <span className="bg-red-600 text-white text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                                    <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                    LIVE NOW
                                </span>
                            )}
                            {status === "PAST" && (
                                <span className="bg-gray-600 text-white text-xs px-3 py-1 rounded-full">
                                    PAST
                                </span>
                            )}
                            {status === "CANCELLED" && (
                                <span className="bg-red-900 text-white text-xs px-3 py-1 rounded-full">
                                    CANCELLED
                                </span>
                            )}
                        </div>

                        {meetingDetails.description && (
                            <p className="text-gray-700 mb-4">
                                {meetingDetails.description}
                            </p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="text-sm text-gray-600 mb-2">
                                    📅 Date & Time
                                </p>
                                <p className="font-semibold text-gray-800">
                                    {startTime.toLocaleDateString("en-US", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </p>
                                <p className="text-gray-700">
                                    {startTime.toLocaleTimeString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}{" "}
                                    -{" "}
                                    {endTime.toLocaleTimeString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-600 mb-2">
                                    {meetingDetails.meeting_type === "VIRTUAL"
                                        ? "🖥️ Virtual Meeting"
                                        : "📍 Physical Meeting"}
                                </p>
                                <p className="font-semibold text-gray-800">
                                    {meetingDetails.meeting_type === "VIRTUAL"
                                        ? "Virtual"
                                        : "In-Person"}
                                </p>
                                {meetingDetails.venue && (
                                    <p className="text-gray-700">
                                        {meetingDetails.venue}
                                    </p>
                                )}
                            </div>
                        </div>

                        <p className="text-sm text-gray-600">
                            👥 {meetingDetails.participant_count} participants
                        </p>
                    </div>

                    {status === "LIVE" && (
                        <button
                            onClick={() => setShowRoom(true)}
                            className="ml-4 bg-primary text-white px-6 py-3 rounded-lg hover:bg-blue-900 transition font-semibold whitespace-nowrap"
                        >
                            Join Meeting
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column - Details */}
                <div className="md:col-span-2 space-y-6">
                    {/* Meeting Info */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h2 className="text-xl font-semibold text-secondary mb-4">
                            Meeting Details
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-600">
                                    Created by
                                </p>
                                <p className="font-semibold text-gray-800">
                                    {meetingDetails.created_by_name}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Created At</p>
                                <p className="font-semibold text-gray-800">
                                    {meetingDetails.created_at_display}
                                </p>
                            </div>
                            {meetingDetails.is_cancelled && (
                                <div className="bg-red-50 border border-red-200 p-3 rounded">
                                    <p className="text-sm text-red-800">
                                        <strong>Cancelled:</strong>{" "}
                                        {meetingDetails.cancelled_reason}
                                    </p>
                                </div>
                            )}

                            {/* Show Allowed Participants if restricted */}
                            {!meetingDetails.is_all_members_allowed && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-2">
                                        Allowed Participants
                                    </p>
                                    <div className="space-y-1">
                                        {meetingDetails.allowed_participants_data?.length > 0 ? (
                                            meetingDetails.allowed_participants_data.map((p) => (
                                                <p key={p.id} className="text-sm text-gray-700">
                                                    • {p.user_full_name || p.email}
                                                </p>
                                            ))
                                        ) : (
                                            <p className="text-sm text-gray-500">No participants selected</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Meeting Minutes */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h2 className="text-xl font-semibold text-secondary mb-4">
                            Meeting Minutes
                        </h2>

                        {meetingDetails.minute ? (
                            <div className="space-y-3">
                                <p className="text-sm text-gray-600">
                                    Minutes uploaded by{" "}
                                    <strong>
                                        {meetingDetails.minute
                                            .uploaded_by_name ||
                                            "Unknown"}
                                    </strong>{" "}
                                    on{" "}
                                    {new Date(
                                        meetingDetails.minute.uploaded_at
                                    ).toLocaleDateString()}
                                </p>
                                <a
                                    href={meetingDetails.minute.pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block bg-blue-100 text-primary px-4 py-2 rounded-lg hover:bg-blue-200 transition font-semibold"
                                >
                                    📄 Download Minutes
                                </a>
                            </div>
                        ) : (
                            <div className="text-gray-600">
                                {(userRole === "SA" || userRole === "CP") ? (
                                    <>
                                        <p className="mb-4">
                                            No minutes uploaded yet.
                                        </p>
                                        <label className="inline-block">
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={handleUploadMinutes}
                                                disabled={uploading}
                                                className="hidden"
                                            />
                                            <button
                                                onClick={(e) => {
                                                    e.currentTarget.parentElement?.querySelector(
                                                        'input[type="file"]'
                                                    )?.click();
                                                }}
                                                disabled={uploading}
                                                className="bg-blue-100 text-primary px-4 py-2 rounded-lg hover:bg-blue-200 transition disabled:opacity-50"
                                            >
                                                {uploading
                                                    ? "Uploading..."
                                                    : "📤 Upload Minutes"}
                                            </button>
                                        </label>
                                        {uploadError && (
                                            <p className="text-red-600 text-sm mt-2">
                                                {uploadError}
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p>
                                        Minutes will be available once uploaded
                                        by the organizer.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Participants */}
                <div className="bg-white rounded-lg p-6 border border-gray-200 h-fit">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-secondary">
                            Participants
                        </h2>
                        {status === "LIVE" && loadingParticipants && (
                            <span className="inline-block w-3 h-3 bg-primary rounded-full animate-pulse"></span>
                        )}
                    </div>

                    <p className="text-sm text-gray-600 mb-4">
                        {status === "LIVE"
                            ? `${meetingDetails.participant_count} currently active`
                            : `${meetingDetails.attended_count || 0} attended (${participants.length} total)`}
                    </p>

                    {participants.length > 0 ? (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {participants.map((participant) => (
                                <div
                                    key={participant.id}
                                    className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                                >
                                    {participant.user_profile?.profile_photo ? (
                                        <img
                                            src={
                                                participant.user_profile
                                                    .profile_photo
                                            }
                                            alt={participant.user_name}
                                            className="w-8 h-8 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gray-300"></div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">
                                            {participant.user_name ||
                                                participant.user_email}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            {participant.is_currently_active && (
                                                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                                            )}
                                            {participant.is_marked_present && (
                                                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full" title="Marked present"></span>
                                            )}
                                            {participant.presence_percentage !== undefined && (
                                                <span className="text-xs text-gray-600">
                                                    {participant.presence_percentage.toFixed(0)}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            {status === "LIVE" ? (
                                <>
                                    <p className="text-sm mb-2">
                                        No participants yet
                                    </p>
                                    <p className="text-xs">
                                        Participants will appear here when they
                                        join
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm">
                                    No participants in this meeting
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
