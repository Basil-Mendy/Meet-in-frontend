import { useState, useEffect } from "react";
import api from "../../../api/axios";

export default function CreateMeetingModal({ forum, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        meeting_type: "VIRTUAL",
        venue: "",
        scheduled_start: "",
        scheduled_end: "",
        is_all_members_allowed: true,
        allowed_participant_ids: [],
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [forumMembers, setForumMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch forum members
    useEffect(() => {
        fetchForumMembers();
    }, [forum?.id]);

    const fetchForumMembers = async () => {
        try {
            setMembersLoading(true);
            const res = await api.get(`/forums/${forum.id}/members/`);
            setForumMembers(res.data || []);
        } catch (err) {
            console.error("Failed to fetch members:", err);
        } finally {
            setMembersLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
        setError("");
    };

    const handleParticipantToggle = (userId) => {
        setFormData((prev) => ({
            ...prev,
            allowed_participant_ids: prev.allowed_participant_ids.includes(userId)
                ? prev.allowed_participant_ids.filter(id => id !== userId)
                : [...prev.allowed_participant_ids, userId],
        }));
    };

    const validateForm = () => {
        if (!formData.title.trim()) {
            setError("Meeting title is required");
            return false;
        }
        if (!formData.scheduled_start) {
            setError("Start time is required");
            return false;
        }
        if (!formData.scheduled_end) {
            setError("End time is required");
            return false;
        }

        const start = new Date(formData.scheduled_start);
        const end = new Date(formData.scheduled_end);

        if (start >= end) {
            setError("End time must be after start time");
            return false;
        }

        if (formData.meeting_type === "PHYSICAL" && !formData.venue.trim()) {
            setError("Venue is required for physical meetings");
            return false;
        }

        // Enforce minimum lead time of 15 minutes
        const minLead = 15 * 60 * 1000; // 15 minutes in ms
        const now = new Date();
        if (start.getTime() < now.getTime() + minLead) {
            setError("Meeting must be at least 15 minutes in the future");
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        try {
            // Prepare payload: convert local datetime-local values to UTC ISO strings
            const submitData = { ...formData };
            if (submitData.scheduled_start) {
                // `datetime-local` value is local — create Date and send ISO (UTC)
                submitData.scheduled_start = new Date(submitData.scheduled_start).toISOString();
            }
            if (submitData.scheduled_end) {
                submitData.scheduled_end = new Date(submitData.scheduled_end).toISOString();
            }

            // Only send allowed_participant_ids if not allowing all members
            if (submitData.is_all_members_allowed) {
                delete submitData.allowed_participant_ids;
            }

            await api.post(`/forums/${forum.id}/meetings/`, submitData);
            setFormData({
                title: "",
                description: "",
                meeting_type: "VIRTUAL",
                venue: "",
                scheduled_start: "",
                scheduled_end: "",
                is_all_members_allowed: true,
                allowed_participant_ids: [],
            });
            onSuccess();
        } catch (err) {
            const respData = err.response?.data;
            console.error("Create meeting error response:", respData || err);
            // Try to pick a useful message from the response
            const msg = respData?.detail || respData?.error || respData || err.message || "Failed to create meeting";
            setError(typeof msg === "string" ? msg : JSON.stringify(msg));
        } finally {
            setLoading(false);
        }
    };

    // Get minimum datetime (now + 15 minutes) formatted for `datetime-local` (local time)
    const getMinDateTime = (offsetMinutes = 15) => {
        const now = new Date(Date.now() + offsetMinutes * 60 * 1000);

        const pad = (n) => String(n).padStart(2, "0");
        const year = now.getFullYear();
        const month = pad(now.getMonth() + 1);
        const day = pad(now.getDate());
        const hours = pad(now.getHours());
        const minutes = pad(now.getMinutes());

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const minDateTime = getMinDateTime(15);
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const filteredMembers = forumMembers.filter((member) => {
        if (!searchTerm.trim()) return true;
        const name = `${member.first_name || ""} ${member.last_name || ""}`.trim();
        const q = searchTerm.toLowerCase();
        return (
            (name && name.toLowerCase().includes(q)) ||
            (member.user_email && member.user_email.toLowerCase().includes(q))
        );
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
                    <h2 className="text-2xl font-bold text-secondary">Create Meeting</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Meeting Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g., Board Meeting, Team Sync"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={loading}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="What is this meeting about?"
                            rows="3"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={loading}
                        />
                    </div>

                    {/* Meeting Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Meeting Type <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4">
                            {["VIRTUAL", "PHYSICAL"].map((type) => (
                                <label
                                    key={type}
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <input
                                        type="radio"
                                        name="meeting_type"
                                        value={type}
                                        checked={formData.meeting_type === type}
                                        onChange={handleChange}
                                        disabled={loading}
                                    />
                                    <span>
                                        {type === "VIRTUAL" ? "🖥️ Virtual" : "📍 Physical"}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Venue */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {formData.meeting_type === "VIRTUAL"
                                ? "Virtual Link / Details"
                                : "Venue Address"}{" "}
                            {formData.meeting_type === "PHYSICAL" && (
                                <span className="text-red-500">*</span>
                            )}
                        </label>
                        <input
                            type="text"
                            name="venue"
                            value={formData.venue}
                            onChange={handleChange}
                            placeholder={
                                formData.meeting_type === "VIRTUAL"
                                    ? "Zoom/Google Meet link or instructions"
                                    : "Conference room address"
                            }
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={loading}
                        />
                    </div>

                    {/* Participant Selection */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                            Meeting Participants
                        </label>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name="participant_mode"
                                    checked={formData.is_all_members_allowed}
                                    onChange={() =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            is_all_members_allowed: true,
                                            allowed_participant_ids: [],
                                        }))
                                    }
                                    className="w-4 h-4"
                                    disabled={loading}
                                />
                                <span className="text-sm">All Forum Members</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name="participant_mode"
                                    checked={!formData.is_all_members_allowed}
                                    onChange={() =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            is_all_members_allowed: false,
                                        }))
                                    }
                                    className="w-4 h-4"
                                    disabled={loading}
                                />
                                <span className="text-sm">Select Specific Members</span>
                            </label>
                        </div>

                        {/* Participant List (show if not allowing all members) */}
                        {!formData.is_all_members_allowed && (
                            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50">
                                <div className="mb-2">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search members by name or email"
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none"
                                        disabled={membersLoading || loading}
                                    />
                                </div>

                                {membersLoading ? (
                                    <p className="text-sm text-gray-500">Loading members...</p>
                                ) : filteredMembers.length > 0 ? (
                                    <div className="space-y-2">
                                        {filteredMembers.map((member) => (
                                            <label key={member.id} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.allowed_participant_ids.includes(member.user_id)}
                                                    onChange={() => handleParticipantToggle(member.user_id)}
                                                    className="w-4 h-4"
                                                    disabled={loading}
                                                />
                                                <span className="text-sm">
                                                    {(member.first_name || member.last_name)
                                                        ? `${(member.first_name || "").trim()} ${(member.last_name || "").trim()}`.trim()
                                                        : member.user_email}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">No members match your search</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start Time <span className="text-red-500">*</span>
                                <span className="ml-2 text-xs text-gray-500">({userTimeZone})</span>
                            </label>
                            <input
                                type="datetime-local"
                                name="scheduled_start"
                                value={formData.scheduled_start}
                                onChange={handleChange}
                                min={minDateTime}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                disabled={loading}
                            />
                            <p className="text-xs text-gray-500 mt-1">Meetings must be scheduled at least 15 minutes before actual time.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                End Time <span className="text-red-500">*</span>
                                <span className="ml-2 text-xs text-gray-500">({userTimeZone})</span>
                            </label>
                            <input
                                type="datetime-local"
                                name="scheduled_end"
                                value={formData.scheduled_end}
                                onChange={handleChange}
                                min={formData.scheduled_start || minDateTime}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-900 transition disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? "Creating..." : "Create Meeting"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
