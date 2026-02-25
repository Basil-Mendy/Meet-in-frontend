import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";

export default function NotificationsCenter() {
    const navigate = useNavigate();
    const { isAuthenticated, loading: authLoading } = useContext(AuthContext);
    const { fetchUnreadCounts } = useNotifications();

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all"); // all, unread, read
    const [sortBy, setSortBy] = useState("recent"); // recent, oldest
    const [selectedNotifications, setSelectedNotifications] = useState(new Set());
    const [isSelecting, setIsSelecting] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            navigate("/login");
            return;
        }
        fetchNotifications();
    }, [isAuthenticated, authLoading]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await api.get("forums/notifications/");
            // Mark all as read when viewing
            const notifs = res.data.map(n => ({ ...n, is_read: true }));
            setNotifications(sortNotifications(notifs, "recent"));
            setError("");
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
            setError("Failed to load notifications");
        } finally {
            setLoading(false);
        }
    };

    const sortNotifications = (notifs, sortType) => {
        const sorted = [...notifs];
        if (sortType === "recent") {
            sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (sortType === "oldest") {
            sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }
        return sorted;
    };

    const getFilteredNotifications = () => {
        let filtered = notifications;
        if (filter === "unread") {
            filtered = filtered.filter(n => !n.is_read);
        } else if (filter === "read") {
            filtered = filtered.filter(n => n.is_read);
        }
        return filtered;
    };

    const handleNotificationClick = async (notification) => {
        try {
            // Mark as read
            if (!notification.is_read) {
                await api.post(`forums/notifications/${notification.id}/mark-read/`);
            }

            // Update local state
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
            );

            // Refresh counts
            await fetchUnreadCounts();

            // Navigate to the forum tab where the notification came from
            if (notification.forum_id) {
                const tab = notification.tab || "feed";
                navigate(`/forum/${notification.forum_id}?tab=${tab}`);
            }
        } catch (err) {
            console.error("Failed to handle notification:", err);
        }
    };

    const handleMarkAsReadSingle = async (notificationId, e) => {
        e.stopPropagation();
        try {
            await api.post(`forums/notifications/${notificationId}/mark-read/`);
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
            await fetchUnreadCounts();
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const unreadIds = getFilteredNotifications()
                .filter(n => !n.is_read)
                .map(n => n.id);

            if (unreadIds.length === 0) {
                alert("No unread notifications in current view");
                return;
            }

            // Mark all unread as read
            await Promise.all(
                unreadIds.map(id => api.post(`forums/notifications/${id}/mark-read/`))
            );

            setNotifications(prev =>
                prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: true } : n)
            );
            await fetchUnreadCounts();
        } catch (err) {
            console.error("Failed to mark all as read:", err);
        }
    };

    const handleSelectNotification = (notificationId) => {
        const newSelected = new Set(selectedNotifications);
        if (newSelected.has(notificationId)) {
            newSelected.delete(notificationId);
        } else {
            newSelected.add(notificationId);
        }
        setSelectedNotifications(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedNotifications.size === getFilteredNotifications().length) {
            setSelectedNotifications(new Set());
        } else {
            const allIds = new Set(getFilteredNotifications().map(n => n.id));
            setSelectedNotifications(allIds);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedNotifications.size === 0) {
            alert("Please select notifications to delete");
            return;
        }

        if (!window.confirm(`Delete ${selectedNotifications.size} notification(s)?`)) return;

        try {
            await Promise.all(
                Array.from(selectedNotifications).map(id =>
                    api.delete(`forums/notifications/${id}/`)
                )
            );

            setNotifications(prev => prev.filter(n => !selectedNotifications.has(n.id)));
            setSelectedNotifications(new Set());
            await fetchUnreadCounts();
        } catch (err) {
            console.error("Failed to delete notifications:", err);
            alert("Failed to delete notifications");
        }
    };

    const handleDeleteSingle = async (notificationId, e) => {
        e.stopPropagation();
        if (!window.confirm("Delete this notification?")) return;

        try {
            await api.delete(`forums/notifications/${notificationId}/`);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            await fetchUnreadCounts();
        } catch (err) {
            console.error("Failed to delete notification:", err);
            alert("Failed to delete notification");
        }
    };

    const filteredNotifications = getFilteredNotifications();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Loading notifications...</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-gray-50">
            <div className="max-w-4xl mx-auto p-4 md:p-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-secondary mb-2">Notifications</h1>
                            <p className="text-gray-600">
                                All your notifications from across forums
                            </p>
                        </div>
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="flex items-center gap-2 text-primary font-medium text-sm hover:underline"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M12.293 16.293a1 1 0 010 1.414l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L8.414 10l5.293 5.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            Back to Dashboard
                        </button>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter("all")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "all"
                                        ? "bg-primary text-white"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    }`}
                            >
                                All ({notifications.length})
                            </button>
                            <button
                                onClick={() => setFilter("unread")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "unread"
                                        ? "bg-primary text-white"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    }`}
                            >
                                Unread ({notifications.filter(n => !n.is_read).length})
                            </button>
                            <button
                                onClick={() => setFilter("read")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "read"
                                        ? "bg-primary text-white"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    }`}
                            >
                                Read ({notifications.filter(n => n.is_read).length})
                            </button>
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto">
                            <select
                                value={sortBy}
                                onChange={(e) => {
                                    setSortBy(e.target.value);
                                    setNotifications(sortNotifications(notifications, e.target.value));
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="recent">Most Recent</option>
                                <option value="oldest">Oldest First</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Bulk Actions */}
                {isSelecting && selectedNotifications.size > 0 && (
                    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                        <div>
                            <input
                                type="checkbox"
                                checked={selectedNotifications.size === filteredNotifications.length}
                                onChange={handleSelectAll}
                                className="mr-3 cursor-pointer"
                            />
                            <span className="text-sm font-medium text-blue-900">
                                {selectedNotifications.size} selected
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleMarkAllAsRead}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                            >
                                Mark as Read
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => {
                                    setIsSelecting(false);
                                    setSelectedNotifications(new Set());
                                }}
                                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Top Action Bar */}
                <div className="mb-4 flex gap-2">
                    <button
                        onClick={() => {
                            setIsSelecting(!isSelecting);
                            if (isSelecting) setSelectedNotifications(new Set());
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
                    >
                        {isSelecting ? "Done Selecting" : "Select"}
                    </button>
                    {!isSelecting && (
                        <>
                            <button
                                onClick={handleMarkAllAsRead}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
                            >
                                Mark All as Read
                            </button>
                        </>
                    )}
                </div>

                {/* Notifications List */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {filteredNotifications.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-lg mb-2">No notifications</p>
                        <p className="text-gray-400 text-sm">
                            {filter === "unread" ? "You're all caught up!" : "Check back later for updates"}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredNotifications.map((notification) => (
                            <div
                                key={notification.id}
                                onClick={() => !isSelecting && handleNotificationClick(notification)}
                                className={`relative p-4 rounded-lg border transition cursor-pointer ${notification.is_read
                                        ? "bg-white border-gray-200 hover:bg-gray-50"
                                        : "bg-blue-50 border-blue-300 hover:bg-blue-100"
                                    } ${selectedNotifications.has(notification.id) ? "ring-2 ring-primary" : ""}`}
                            >
                                {/* Checkbox for selection */}
                                {isSelecting && (
                                    <input
                                        type="checkbox"
                                        checked={selectedNotifications.has(notification.id)}
                                        onChange={() => handleSelectNotification(notification.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute left-4 top-4 cursor-pointer"
                                    />
                                )}

                                <div className={isSelecting ? "ml-8" : ""}>
                                    {/* Notification Header */}
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900">
                                                {notification.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {notification.message}
                                            </p>
                                        </div>
                                        {!notification.is_read && (
                                            <div className="ml-2 flex-shrink-0 w-3 h-3 bg-primary rounded-full mt-1" />
                                        )}
                                    </div>

                                    {/* Notification Meta */}
                                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 mt-3 pt-3 border-t border-gray-200">
                                        <span className="font-medium bg-gray-100 px-2 py-1 rounded">
                                            {notification.notification_type}
                                        </span>
                                        {notification.tab && (
                                            <span className="bg-primary bg-opacity-10 text-primary px-2 py-1 rounded">
                                                Tab: {notification.tab}
                                            </span>
                                        )}
                                        <span>
                                            {new Date(notification.created_at).toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                                        {!notification.is_read && (
                                            <button
                                                onClick={(e) => handleMarkAsReadSingle(notification.id, e)}
                                                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounds hover:bg-blue-200 transition rounded"
                                            >
                                                Mark as Read
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => handleDeleteSingle(notification.id, e)}
                                            className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
