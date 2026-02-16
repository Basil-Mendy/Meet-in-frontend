/**
 * NotificationToast
 * Displays toast notifications for incoming messages
 * Shows at top-right of screen with auto-dismiss
 */

import React, { useEffect, useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';

function NotificationToast() {
    const { toasts, removeToast } = useNotifications();

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
            ))}
        </div>
    );
}

function ToastItem({ toast, onClose }) {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        // Auto-close after 5 seconds
        const timer = setTimeout(() => {
            handleClose();
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose(toast.id);
        }, 300);
    };

    return (
        <div
            className={`
                bg-white rounded-lg shadow-lg border-l-4 border-blue-500
                p-4 flex items-start gap-3
                transform transition-all duration-300
                ${isClosing ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
            `}
        >
            <div className="flex-shrink-0 text-xl mt-1">
                {getToastIcon(toast.type)}
            </div>

            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 break-words">
                    {toast.title}
                </h4>
                <p className="text-sm text-gray-600 mt-1 break-words">
                    {toast.message}
                </p>
                {toast.forumId && toast.tab && (
                    <a
                        href={`/forum/${toast.forumId}/${toast.tab}`}
                        className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block font-medium"
                    >
                        View in {toast.tab}
                    </a>
                )}
            </div>

            <button
                onClick={handleClose}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 font-bold"
                title="Dismiss"
            >
                ✕
            </button>
        </div>
    );
}

function getToastIcon(type) {
    if (type === 'notification') {
        return '🔔';
    }
    if (type === 'success') {
        return '✅';
    }
    if (type === 'error') {
        return '❌';
    }
    if (type === 'warning') {
        return '⚠️';
    }
    return '💬';
}

export default NotificationToast;
