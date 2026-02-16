import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "../api/axios";
import notificationService from "../services/notificationService";

/**
 * NotificationContext - Centralized notification management for the entire app
 * 
 * Provides:
 * - WebSocket real-time notifications
 * - Fetching notifications from backend
 * - Tracking unread counts per forum and globally
 * - Marking notifications as read
 * - Clearing tab/forum notifications
 * - Subscribing to notification updates
 */

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({
        global: 0,
        forums: {},
        tabs: {}
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isConnected, setIsConnected] = useState(false);
    const [toasts, setToasts] = useState([]);

    /**
     * Remove toast
     */
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    /**
     * Show toast notification
     */
    const showToast = useCallback((notification) => {
        const id = Math.random().toString(36).substr(2, 9);
        const toast = {
            id,
            title: notification.title,
            message: notification.message,
            forumId: notification.forum_id,
            tab: notification.tab,
            objectId: notification.object_id,
            type: "notification",
        };

        setToasts(prev => [...prev, toast]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            removeToast(id);
        }, 5000);
    }, [removeToast]);

    // Initialize WebSocket on mount
    useEffect(() => {
        let unsubscribe;

        // Run initialization
        (async () => {
            try {
                const token = localStorage.getItem("access");
                if (!token) return;

                // Connect WebSocket
                await notificationService.connect(token);

                // Subscribe to notifications - unsubscribe is returned as a function
                unsubscribe = notificationService.subscribe((type, data) => {
                    if (type === "connected") {
                        setIsConnected(data);
                    } else if (type === "notification") {
                        handleNewNotification(data);
                    } else if (type === "error") {
                        console.error("WebSocket error:", data);
                    }
                });

                // Fetch initial unread counts
                await fetchUnreadCounts();
            } catch (err) {
                console.error("Failed to initialize notifications:", err);
            }
        })();

        // Cleanup when component unmounts
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
            notificationService.disconnect();
        };
    }, []);

    /**
     * Handle new notification from WebSocket
     */
    const handleNewNotification = useCallback((data) => {
        const { type, data: notificationData } = data;

        console.log("Notification received:", { type, data: notificationData });

        if (type === "notification" && notificationData) {
            const notification = notificationData;

            console.log("Processing notification:", {
                id: notification.id,
                forum_id: notification.forum_id,
                tab: notification.tab,
                type: notification.notification_type,
            });

            // Add to notifications list
            setNotifications(prev => [notification, ...prev].slice(0, 100));

            // Update unread counts
            setUnreadCounts(prev => {
                const updated = { ...prev };
                const forumId = notification.forum_id;

                if (!updated.forums[forumId]) {
                    updated.forums[forumId] = 0;
                }
                updated.forums[forumId]++;
                updated.global++;

                if (!updated.tabs[forumId]) {
                    updated.tabs[forumId] = {};
                }
                const tab = notification.tab;
                updated.tabs[forumId][tab] = (updated.tabs[forumId][tab] || 0) + 1;

                console.log("Updated unread counts:", { forums: updated.forums, tabs: updated.tabs });

                return updated;
            });

            // Show toast
            if (notification.is_push) {
                showToast(notification);
            }
        }
    }, [showToast]);



    /**
     * Fetch all unread notifications for the user
     */
    const fetchNotifications = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await api.get("forums/notifications/");
            setNotifications(res.data);
            setError("");
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
            setError("Failed to load notifications");
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Fetch unread counts across forums
     */
    const fetchUnreadCounts = useCallback(async () => {
        try {
            const res = await api.get("forums/notifications/counts/");
            setUnreadCounts({
                global: res.data.global_count,
                forums: res.data.forum_counts,
                tabs: res.data.tab_counts || {}
            });
        } catch (err) {
            console.error("Failed to fetch notification counts:", err);
        }
    }, []);

    /**
     * Mark specific notifications as read
     */
    const markAsRead = useCallback(async (notificationIds) => {
        try {
            // Send via WebSocket if connected, otherwise use API
            if (isConnected) {
                notificationService.markAsRead(notificationIds);
            } else {
                await api.post("forums/notifications/mark-as-read/", {
                    notification_ids: notificationIds
                });
            }

            // Update local state
            setNotifications(prev =>
                prev.map(notif =>
                    notificationIds.includes(notif.id)
                        ? { ...notif, is_read: true }
                        : notif
                )
            );

            // Refresh counts
            await fetchUnreadCounts();
        } catch (err) {
            console.error("Failed to mark notifications as read:", err);
        }
    }, [isConnected, fetchUnreadCounts]);

    /**
     * Clear all unread notifications for a specific forum
     */
    const clearForumNotifications = useCallback(async (forumId) => {
        try {
            await api.post("forums/notifications/clear-forum/", {
                forum_id: forumId
            });

            // Remove from local state
            setNotifications(prev =>
                prev.filter(notif => notif.forum !== forumId || notif.is_read)
            );

            // Update counts
            setUnreadCounts(prev => {
                const updated = { ...prev };
                const count = updated.forums[forumId] || 0;
                updated.global -= count;
                updated.forums[forumId] = 0;
                delete updated.tabs[forumId];
                return updated;
            });
        } catch (err) {
            console.error("Failed to clear forum notifications:", err);
        }
    }, []);

    /**
     * Clear all unread notifications for a specific tab in a forum
     */
    const clearTabNotifications = useCallback(async (forumId, tab) => {
        try {
            // Send via WebSocket if connected, otherwise use API
            if (isConnected) {
                notificationService.clearTabNotifications(forumId, tab);
            } else {
                await api.post("forums/notifications/clear-tab/", {
                    forum_id: forumId,
                    tab: tab
                });
            }

            // Mark matching local notifications as read instead of removing them
            setNotifications(prev =>
                prev.map(notif => {
                    const notifForumId = String(notif.forum_id || notif.forum || "");
                    if (notifForumId === String(forumId) && notif.tab === tab) {
                        return { ...notif, is_read: true };
                    }
                    return notif;
                })
            );

            // Update counts
            setUnreadCounts(prev => {
                const updated = { ...prev };
                const fId = String(forumId);
                const tabCount = updated.tabs[fId]?.[tab] || 0;

                if (tabCount > 0) {
                    updated.tabs[fId] = updated.tabs[fId] || {};
                    updated.tabs[fId][tab] = 0;

                    // Recalculate forum and global counts
                    let forumCount = 0;
                    Object.values(updated.tabs[fId] || {}).forEach(c => forumCount += c);
                    updated.forums = { ...updated.forums, [fId]: forumCount };

                    let globalCount = 0;
                    Object.values(updated.forums).forEach(c => globalCount += c);
                    updated.global = globalCount;
                }

                return updated;
            });
        } catch (err) {
            console.error(`Failed to clear ${tab} notifications:`, err);
        }
    }, [isConnected]);

    /**
     * Get notifications for a specific forum
     */
    const getForumNotifications = useCallback((forumId) => {
        return notifications.filter(
            notif => (notif.forum_id || notif.forum) === forumId && !notif.is_read
        );
    }, [notifications]);

    /**
     * Get notifications for a specific tab in a forum
     */
    const getTabNotifications = useCallback((forumId, tab) => {
        return notifications.filter(
            notif =>
                (notif.forum_id || notif.forum) === forumId && notif.tab === tab && !notif.is_read
        );
    }, [notifications]);

    /**
     * Get unread count for a specific forum
     */
    const getForumUnreadCount = useCallback((forumId) => {
        const id = String(forumId || "");
        return unreadCounts.forums?.[id] || 0;
    }, [unreadCounts]);

    /**
     * Get unread count for a specific tab in a forum
     */
    const getTabUnreadCount = useCallback((forumId, tab) => {
        const id = String(forumId || "");
        return unreadCounts.tabs?.[id]?.[tab] || 0;
    }, [unreadCounts]);

    const value = {
        notifications,
        unreadCounts,
        isLoading,
        error,
        isConnected,
        toasts,
        fetchNotifications,
        fetchUnreadCounts,
        markAsRead,
        clearForumNotifications,
        clearTabNotifications,
        getForumNotifications,
        getTabNotifications,
        getForumUnreadCount,
        getTabUnreadCount,
        showToast,
        removeToast,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

/**
 * Hook to use the NotificationContext
 */
export function useNotifications() {
    const context = useContext(NotificationContext);

    if (!context) {
        throw new Error(
            "useNotifications must be used within NotificationProvider"
        );
    }

    return context;
}
