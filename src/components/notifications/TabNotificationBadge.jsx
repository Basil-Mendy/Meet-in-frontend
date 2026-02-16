/**
 * TabNotificationBadge
 * Shows unread notification count for a specific forum tab
 * Displays red badge with count number
 */

import React from 'react';
import { useNotifications } from '../../context/NotificationContext';

function TabNotificationBadge({ forumId, tab, className = '' }) {
    const { getTabUnreadCount } = useNotifications();
    const count = getTabUnreadCount(forumId, tab);

    if (count === 0) {
        return null;
    }

    return (
        <span
            className={`inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full ${className}`}
            title={`${count} unread in ${tab}`}
        >
            {count > 9 ? '9+' : count}
        </span>
    );
}

export default TabNotificationBadge;
