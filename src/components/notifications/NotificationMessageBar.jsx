import { useEffect, useState } from "react";
import { useNotifications } from "../../context/NotificationContext";

/**
 * NotificationMessageBar - Displays notification messages at the top of tab content
 * Shows unread notifications for the current tab and allows dismissal
 * 
 * Props:
 * - forumId: UUID of the forum
 * - tab: Current tab name (feed, meetings, payments, etc.)
 */

export default function NotificationMessageBar({ forumId, tab }) {
    const { getTabNotifications, markAsRead } = useNotifications();
    const [messages, setMessages] = useState([]);
    const [dismissedIds, setDismissedIds] = useState(new Set());

    useEffect(() => {
        if (forumId && tab) {
            const tabNotifications = getTabNotifications(forumId, tab);

            // Filter out already dismissed ones
            const visibleMessages = tabNotifications.filter(
                notif => !dismissedIds.has(notif.id)
            );

            setMessages(visibleMessages);
        }
    }, [forumId, tab, getTabNotifications, dismissedIds]);

    const handleDismiss = async (notificationId) => {
        // Mark as read in backend
        await markAsRead([notificationId]);

        // Add to dismissed set to hide locally
        setDismissedIds(prev => new Set(prev).add(notificationId));

        // Remove from messages
        setMessages(prev => prev.filter(msg => msg.id !== notificationId));
    };

    const handleDismissAll = async () => {
        // Mark all as read
        const ids = messages.map(msg => msg.id);
        await markAsRead(ids);

        // Clear all messages
        setMessages([]);
    };

    if (messages.length === 0) {
        return null;
    }

    return (
        <div className="mb-4">
            {/* Multiple messages stacked */}
            <div className="space-y-2">
                {messages.map(message => (
                    <div
                        key={message.id}
                        className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded flex items-start justify-between gap-4 animate-in fade-in slide-in-from-top"
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                {/* Icon based on notification type */}
                                <span className={getNotificationIcon(message.notification_type)}>
                                    {getNotificationEmoji(message.notification_type)}
                                </span>
                                <p className="font-semibold text-blue-900">{message.title}</p>
                            </div>
                            <p className="text-sm text-blue-800 ml-6">{message.message}</p>
                            <p className="text-xs text-blue-600 ml-6 mt-1">
                                {formatTimestamp(message.created_at)}
                            </p>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => handleDismiss(message.id)}
                            className="text-blue-600 hover:text-blue-900 font-bold p-1 flex-shrink-0"
                            title="Dismiss"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            {/* Dismiss All Button */}
            {messages.length > 1 && (
                <button
                    onClick={handleDismissAll}
                    className="text-sm text-blue-600 hover:text-blue-900 mt-2 font-medium"
                >
                    Dismiss all in this tab
                </button>
            )}
        </div>
    );
}

/**
 * Helper function to get emoji for notification type
 */
function getNotificationEmoji(type) {
    const emojiMap = {
        FEED_NEW_POST: "📝",
        MEETING_CREATED: "📅",
        MEETING_LIVE: "🔴",
        MEETING_ENDED: "✅",
        PAYMENT_CREATED: "💳",
        DISBURSEMENT_CREATED: "💰",
        MEMBER_ADDED: "👤",
        MEMBER_REMOVED: "🚫",
        MEMBER_ROLE_ASSIGNED: "🎖️",
        MEMBER_ROLE_REMOVED: "➖",
        MEMBER_APPROVED: "✔️",
        FORUM_INFO_UPDATED: "🔄",
        ANNOUNCEMENT_CREATED: "📢",
        POLL_CREATED: "🗳️",
        POLL_ACTIVE: "🟢",
        POLL_CLOSED: "🔒",
    };
    return emojiMap[type] || "📬";
}

/**
 * Helper to get icon class
 */
function getNotificationIcon(type) {
    if (type.includes("MEETING")) return "text-blue-600";
    if (type.includes("PAYMENT") || type.includes("DISBURSEMENT")) return "text-green-600";
    if (type.includes("MEMBER") || type.includes("ROLE")) return "text-purple-600";
    if (type.includes("POLL")) return "text-orange-600";
    if (type.includes("ANNOUNCEMENT")) return "text-red-600";
    return "text-gray-600";
}

/**
 * Format timestamp to relative time
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}
