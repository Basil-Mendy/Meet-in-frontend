/**
 * ForumNotificationBadge
 * Shows total unread notification count for a forum on the dashboard
 * Aggregates unread count from all tabs
 */

import React from 'react';
import { useNotifications } from '../../context/NotificationContext';

function ForumNotificationBadge({ forumId, className = '' }) {
    const { getForumUnreadCount } = useNotifications();
    const count = getForumUnreadCount(forumId);

    if (count === 0) {
        return null;
    }

    return (
        <span
            className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full ${className}`}
            title={`${count} unread notifications`}
        >
            {count > 99 ? '99+' : count}
        </span>
    );
}

export default ForumNotificationBadge;
