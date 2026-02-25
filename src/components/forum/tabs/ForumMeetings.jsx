import { useState, useEffect } from "react";
import api from "../../../api/axios";
import { useNotifications } from "../../../context/NotificationContext";
import NotificationMessageBar from "../../notifications/NotificationMessageBar";
import CreateMeetingModal from "../modals/CreateMeetingModal";
import MeetingDetailView from "../views/MeetingDetailView";

export default function ForumMeetings({ forum, userRole, userEmail }) {
    const [meetings, setMeetings] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all"); // all, live, upcoming, past

    useEffect(() => {
        fetchMeetings();
    }, [forum?.id]);

    const fetchMeetings = async () => {
        try {
            if (!forum?.id) return;
            const res = await api.get(`/forums/${forum.id}/meetings/`);
            setMeetings(res.data);
            setError("");
        } catch (err) {
            setError("Failed to load meetings");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinMeeting = async (meeting) => {
        try {
            // Call join endpoint - this will validate access on backend
            await api.post(`/forums/${forum.id}/meetings/${meeting.id}/join/`);
            // Show meeting detail view which will route to room
            setSelectedMeeting(meeting);
        } catch (err) {
            if (err.response?.status === 403) {
                setError("You are not invited to this meeting");
            } else {
                setError("Failed to join meeting");
            }
            console.error(err);
        }
    };

    const isForumAdmin = userRole === "SA" || userRole === "CP";

    const getMeetingStatus = (meeting) => {
        const now = new Date();
        const start = new Date(meeting.scheduled_start);
        const end = new Date(meeting.scheduled_end);

        if (meeting.is_cancelled) return "cancelled";
        if (now >= end) return "past";
        if (now >= start && now < end) return "live";
        return "upcoming";
    };

    // Filter and sort meetings
    const sortedMeetings = [...meetings].sort((a, b) => {
        const statusOrder = { live: 0, upcoming: 1, past: 2, cancelled: 3 };
        const statusA = getMeetingStatus(a);
        const statusB = getMeetingStatus(b);

        if (statusOrder[statusA] !== statusOrder[statusB]) {
            return statusOrder[statusA] - statusOrder[statusB];
        }

        // For past meetings, sort by meeting end time (most recently held first)
        if (statusA === "past") {
            const endTimeA = new Date(a.actual_end || a.scheduled_end).getTime();
            const endTimeB = new Date(b.actual_end || b.scheduled_end).getTime();
            return endTimeB - endTimeA;
        }

        // For upcoming/live, sort by created time (most recently created first)
        const createdA = new Date(a.created_at).getTime();
        const createdB = new Date(b.created_at).getTime();
        return createdB - createdA;
    });

    const filteredMeetings = sortedMeetings.filter((m) => {
        if (filter === "all") return true;
        return getMeetingStatus(m) === filter;
    });

    if (selectedMeeting) {
        return (
            <MeetingDetailView
                meeting={selectedMeeting}
                forum={forum}
                userRole={userRole}
                onClose={() => setSelectedMeeting(null)}
                onUpdate={fetchMeetings}
            />
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <p className="text-gray-500">Loading meetings...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6">
            {/* Notification Message Bar */}
            <NotificationMessageBar forumId={forum?.id} tab="meetings" />

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {/* Header with Create Button */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-secondary">Meetings</h2>
                {isForumAdmin && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition flex items-center gap-2"
                    >
                        <span>+</span> Create Meeting
                    </button>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
                {["all", "live", "upcoming", "past"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${filter === tab
                            ? "bg-primary text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {tab === "live" && meetings.some((m) => getMeetingStatus(m) === "live") && (
                            <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        )}
                    </button>
                ))}
            </div>

            {/* Meeting List */}
            {filteredMeetings.length > 0 ? (
                <div className="space-y-3">
                    {filteredMeetings.map((meeting) => {
                        const status = getMeetingStatus(meeting);
                        const startTime = new Date(meeting.scheduled_start);
                        const endTime = new Date(meeting.scheduled_end);

                        return (
                            <div
                                key={meeting.id}
                                onClick={() => setSelectedMeeting(meeting)}
                                className={`rounded-lg p-4 border cursor-pointer transition hover:shadow-md ${status === "past"
                                    ? "bg-gray-50 border-gray-200 opacity-75"
                                    : "bg-white border-gray-200 hover:border-primary"
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-secondary">
                                                {meeting.title}
                                            </h3>
                                            {status === "live" && (
                                                <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                                                    <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                                    LIVE
                                                </span>
                                            )}
                                            {status === "cancelled" && (
                                                <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded-full">
                                                    CANCELLED
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-1 text-sm text-gray-600 mb-2">
                                            {/* Meeting Type and Venue */}
                                            <div className="flex items-center gap-2">
                                                {meeting.meeting_type === "VIRTUAL" ? (
                                                    <span>🖥️ Virtual Meeting</span>
                                                ) : (
                                                    <span>📍 Physical Meeting</span>
                                                )}
                                                {meeting.venue && (
                                                    <span className="text-gray-500">{meeting.venue}</span>
                                                )}
                                            </div>

                                            {/* Date and Time */}
                                            <div className="flex items-center gap-2">
                                                <span>📅</span>
                                                <span>
                                                    {startTime.toLocaleDateString("en-US", {
                                                        weekday: "short",
                                                        month: "short",
                                                        day: "numeric",
                                                    })}{" "}
                                                    {startTime.toLocaleTimeString("en-US", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}{" "}
                                                    -{" "}
                                                    {endTime.toLocaleTimeString("en-US", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                            </div>

                                            {/* Participants Count */}
                                            <div className="flex items-center gap-2">
                                                <span>👥</span>
                                                <span>
                                                    {meeting.participant_count}{" "}
                                                    {meeting.participant_count === 1
                                                        ? "participant"
                                                        : "participants"}
                                                </span>
                                            </div>
                                        </div>

                                        {meeting.description && (
                                            <p className="text-sm text-gray-700 line-clamp-2">
                                                {meeting.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Join Button for Live Meetings */}
                                    {status === "live" && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleJoinMeeting(meeting);
                                            }}
                                            className="ml-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition font-semibold whitespace-nowrap"
                                        >
                                            Join Now
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                    <p className="text-gray-500">
                        {filter === "all"
                            ? "No meetings yet."
                            : `No ${filter} meetings.`}
                    </p>
                </div>
            )}

            {/* Meeting Detail View */}
            {selectedMeeting && (
                <MeetingDetailView
                    meeting={selectedMeeting}
                    forum={forum}
                    userRole={userRole}
                    onClose={() => setSelectedMeeting(null)}
                    onUpdate={() => {
                        fetchMeetings();
                        setSelectedMeeting(null);
                    }}
                />
            )}

            {/* Create Meeting Modal */}
            {showCreateModal && (
                <CreateMeetingModal
                    forum={forum}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        fetchMeetings();
                        setShowCreateModal(false);
                    }}
                />
            )}
        </div>
    );
}
