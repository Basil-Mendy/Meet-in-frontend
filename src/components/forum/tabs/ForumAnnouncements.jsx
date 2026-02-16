import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { useNotifications } from "../../../context/NotificationContext";
import NotificationMessageBar from "../../notifications/NotificationMessageBar";

function CreateAnnouncementModal({ forumId, isAdmin, onSuccess, onClose }) {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState("FORUM");
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [allMembers, setAllMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showRecipients, setShowRecipients] = useState(false);

    useEffect(() => {
        if (type === "EMAIL" && allMembers.length === 0) {
            fetchMembers();
        }
    }, [type]);

    const fetchMembers = async () => {
        try {
            const res = await api.get(`forums/${forumId}/announcements/recipients/`);
            setAllMembers(res.data.members || []);
        } catch (err) {
            console.error("Failed to load members", err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) {
            return alert("Title and message are required");
        }

        try {
            setLoading(true);
            const payload = {
                title,
                message,
                announcement_type: type,
                save_to_forum_feed: type === "EMAIL" ? true : true,
            };

            if (type === "EMAIL" && selectedRecipients.length > 0) {
                payload.recipient_ids = selectedRecipients;
            }

            const res = await api.post(`forums/${forumId}/announcements/`, payload);
            if ([200, 201].includes(res.status)) {
                onSuccess();
                onClose();
            }
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "Failed to create announcement");
        } finally {
            setLoading(false);
        }
    };

    const toggleRecipient = (userId) => {
        setSelectedRecipients((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
    };

    const selectAll = () => {
        setSelectedRecipients(allMembers.map((m) => m.id));
    };

    const clearAll = () => {
        setSelectedRecipients([]);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">Create Announcement</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Announcement title"
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">Message *</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Announcement message"
                            rows="6"
                            className="w-full px-3 py-2 border rounded-lg"
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">Announcement Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="FORUM">Forum Announcement (Pinned)</option>
                            <option value="EMAIL">Email Announcement</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            {type === "FORUM"
                                ? "Visible to all members in the Announcements tab"
                                : "Sent via email to selected members"}
                        </p>
                    </div>

                    {type === "EMAIL" && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-semibold">Recipients</label>
                                <button
                                    type="button"
                                    onClick={() => setShowRecipients(!showRecipients)}
                                    className="text-sm text-blue-600 hover:underline"
                                >
                                    {showRecipients ? "Hide" : "Show"} Recipients
                                </button>
                            </div>

                            {showRecipients && (
                                <div className="border rounded-lg p-3 bg-gray-50 max-h-48 overflow-y-auto">
                                    <div className="flex gap-2 mb-3">
                                        <button
                                            type="button"
                                            onClick={selectAll}
                                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded"
                                        >
                                            Select All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={clearAll}
                                            className="text-xs px-2 py-1 bg-gray-600 text-white rounded"
                                        >
                                            Clear All
                                        </button>
                                        <span className="text-xs text-gray-600 ml-auto">
                                            {selectedRecipients.length} selected
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {allMembers.map((member) => (
                                            <label key={member.id} className="flex items-center text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRecipients.includes(member.id)}
                                                    onChange={() => toggleRecipient(member.id)}
                                                    className="mr-2"
                                                />
                                                <span>{member.name}</span>
                                                <span className="text-gray-500 text-xs ml-auto">{member.email}</span>
                                            </label>
                                        ))}
                                    </div>

                                    {allMembers.length === 0 && (
                                        <p className="text-sm text-gray-500">No members found</p>
                                    )}
                                </div>
                            )}

                            <p className="text-xs text-gray-500 mt-2">
                                Leave empty to send to all members
                            </p>
                        </div>
                    )}

                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-300 text-black rounded-lg hover:bg-gray-400"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? "Creating..." : "Create Announcement"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AnnouncementCard({ announcement, forumId, isAdmin, onMarkRead, onArchive }) {
    const [sending, setSending] = useState(false);

    const handleMarkRead = async () => {
        try {
            setSending(true);
            await api.post(`forums/${forumId}/announcements/${announcement.id}/mark_as_read/`);
            onMarkRead(announcement.id);
        } catch (err) {
            console.error("Failed to mark as read", err);
        } finally {
            setSending(false);
        }
    };

    const handleArchive = async () => {
        try {
            setSending(true);
            await api.patch(`forums/${forumId}/announcements/${announcement.id}/archive/`);
            onArchive(announcement.id);
        } catch (err) {
            console.error("Failed to archive", err);
        } finally {
            setSending(false);
        }
    };

    const badgeColor = announcement.announcement_type === "EMAIL" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800";
    const statusBadge = announcement.is_archived ? "bg-gray-100 text-gray-800" : "bg-green-100 text-green-800";

    return (
        <div className="bg-white border rounded-lg p-4 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold">{announcement.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${badgeColor}`}>
                            {announcement.announcement_type === "EMAIL" ? "Email" : "Forum"}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${statusBadge}`}>
                            {announcement.is_archived ? "Archived" : "Active"}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600">
                        Posted by <span className="font-semibold">{announcement.created_by_name}</span> on{" "}
                        {new Date(announcement.created_at).toLocaleString()}
                    </p>
                </div>
            </div>

            <p className="text-sm mb-4 text-gray-700 whitespace-pre-wrap">{announcement.message}</p>

            <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex gap-4">
                    <span>{announcement.read_count} people read this</span>
                </div>

                <div className="flex gap-2">
                    {!announcement.is_read && (
                        <button
                            onClick={handleMarkRead}
                            disabled={sending}
                            className="text-blue-600 hover:underline text-xs"
                        >
                            {sending ? "..." : "Mark as Read"}
                        </button>
                    )}
                    {isAdmin && (
                        <button
                            onClick={handleArchive}
                            disabled={sending}
                            className="text-gray-600 hover:underline text-xs"
                        >
                            {sending ? "..." : announcement.is_archived ? "Unarchive" : "Archive"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ForumAnnouncements({ forum, userRole }) {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    const isAdmin = userRole && ["SA", "CP", "VC", "SEC", "FSEC"].includes(userRole.toUpperCase());
    const forumId = forum?.id;
    const { clearTabNotifications } = useNotifications();

    useEffect(() => {
        if (forumId) {
            fetchAnnouncements();
            clearTabNotifications(forumId, "announcements");
        }
    }, [forumId, showArchived, clearTabNotifications]);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const res = await api.get(`forums/${forumId}/announcements/`, {
                params: { archived: showArchived },
            });
            const data = Array.isArray(res.data) ? res.data : res.data.results || res.data;
            setAnnouncements(data);
        } catch (err) {
            console.error("Failed to load announcements", err);
            setAnnouncements([]);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkRead = (announcementId) => {
        setAnnouncements((prev) =>
            prev.map((a) => (a.id === announcementId ? { ...a, is_read: true, read_count: a.read_count + 1 } : a))
        );
    };

    const handleArchive = (announcementId) => {
        fetchAnnouncements();
    };

    const handleCreate = () => {
        fetchAnnouncements();
        setShowCreateModal(false);
    };

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6">
            <NotificationMessageBar forumId={forum?.id} tab="announcements" />

            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Announcements</h2>
                    {isAdmin && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            + Create Announcement
                        </button>
                    )}
                </div>

                {/* Toggle Archived */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowArchived(false)}
                        className={`px-3 py-1 rounded text-sm ${!showArchived ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                            }`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setShowArchived(true)}
                        className={`px-3 py-1 rounded text-sm ${showArchived ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                            }`}
                    >
                        Archived
                    </button>
                </div>

                {/* Announcements List */}
                {loading ? (
                    <div className="text-center py-6 text-gray-500">Loading announcements...</div>
                ) : announcements.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                        {showArchived ? "No archived announcements" : "No announcements yet"}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {announcements.map((announcement) => (
                            <AnnouncementCard
                                key={announcement.id}
                                announcement={announcement}
                                forumId={forumId}
                                isAdmin={isAdmin}
                                onMarkRead={handleMarkRead}
                                onArchive={handleArchive}
                            />
                        ))}
                    </div>
                )}

                {/* Create Modal */}
                {showCreateModal && (
                    <CreateAnnouncementModal
                        forumId={forumId}
                        isAdmin={isAdmin}
                        onSuccess={handleCreate}
                        onClose={() => setShowCreateModal(false)}
                    />
                )}
            </div>
        </div>
    );
}
