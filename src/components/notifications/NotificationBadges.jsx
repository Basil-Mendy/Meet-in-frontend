/**
 * NotificationBadge - Small badge component showing unread count
 * Used on forum items in sidebar and on tabs
 */

export function NotificationBadge({ count, className = "" }) {
    if (!count || count === 0) {
        return null;
    }

    return (
        <div
            className={`
        bg-red-500 text-white text-xs font-bold 
        rounded-full w-6 h-6 flex items-center justify-center
        flex-shrink-0 ${className}
      `}
        >
            {count > 99 ? "99+" : count}
        </div>
    );
}

/**
 * NotificationDot - Small animated dot indicator
 * Used for subtle notification presence
 */
export function NotificationDot({ hasNotification = false, className = "" }) {
    if (!hasNotification) {
        return null;
    }

    return (
        <div
            className={`
        w-3 h-3 bg-red-500 rounded-full
        animate-pulse flex-shrink-0 ${className}
      `}
        />
    );
}

/**
 * NotificationIcon - Bell icon for global notifications
 */
export function NotificationIcon({ count = 0, onClick, className = "" }) {
    return (
        <button
            onClick={onClick}
            className={`
        relative p-2 hover:bg-gray-100 rounded-full transition
        ${className}
      `}
            title="Notifications"
        >
            {/* Bell Icon SVG */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
            </svg>

            {/* Badge */}
            {count > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {count > 99 ? "99+" : count}
                </span>
            )}
        </button>
    );
}
