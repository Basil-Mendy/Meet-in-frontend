import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import api from "../api/axios";
import notificationService from "../services/notificationService";
import { AuthContext } from "./AuthContext";

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
    const [lastFetchedAt, setLastFetchedAt] = useState(null);

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

    const { isAuthenticated, loading: authLoading } = useContext(AuthContext);

    /**
     * Fetch all unread notifications for the user
     */
    const fetchNotifications = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            setIsLoading(true);
            const res = await api.get("forums/notifications/");
            // Normalize notifications to ensure consistent fields used by UI
            const normalized = (res.data || []).map(n => {
                // extract forum id robustly
                let fid = "";
                if (n.forum_id) fid = String(n.forum_id);
                else if (n.forum) {
                    if (typeof n.forum === 'string' || typeof n.forum === 'number') fid = String(n.forum);
                    else if (typeof n.forum === 'object') fid = String(n.forum.id || n.forum.pk || n.forum._id || n.forum.forum_id || "");
                }

                return {
                    id: n.id || n.pk || n.notification_id || n._id,
                    forum_id: fid,
                    tab: n.tab || n.section || "default",
                    is_read: !!n.is_read,
                    ...n,
                };
            });
            setNotifications(normalized);
            setError("");
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
            setError("Failed to load notifications");
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    /**
     * Fetch unread counts across forums
     */
    const fetchUnreadCounts = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const res = await api.get("forums/notifications/counts/");
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] Fetched unread counts:`, {
                global_count: res.data.global_count,
                forum_counts: res.data.forum_counts,
                tab_counts: res.data.tab_counts,
            });
            setUnreadCounts({
                global: res.data.global_count,
                forums: res.data.forum_counts,
                tabs: res.data.tab_counts || {}
            });
            setLastFetchedAt(new Date());
        } catch (err) {
            console.error("Failed to fetch notification counts:", err);
        }
    }, [isAuthenticated]);

    // Initialize WebSocket on mount once authenticated
    useEffect(() => {
        let unsubscribe;
        let pollInterval;
        let pollTimeoutId;

        // Wait until auth finished initializing
        if (authLoading) return;
        if (!isAuthenticated) return;

        // Run initialization
        (async () => {
            try {
                // Ensure we have a fresh token before connecting WebSocket
                // Make a simple API call to trigger token refresh if needed
                try {
                    await api.get("auth/profile/");
                } catch (err) {
                    console.warn("Could not fetch profile to refresh token:", err);
                    // Continue anyway, maybe the token is still valid
                }

                // Now get the (hopefully fresh) token
                const token = localStorage.getItem("access");
                if (!token) return;

                console.log("Attempting WebSocket connection with fresh token");

                // Connect WebSocket
                const wsConnectPromise = notificationService.connect(token).catch((err) => {
                    console.warn("WebSocket connection failed, will use HTTP polling:", err);
                    return null;
                });

                // Subscribe to notifications - unsubscribe is returned as a function
                unsubscribe = notificationService.subscribe((type, data) => {
                    if (type === "connected") {
                        setIsConnected(data);
                        // If connected, cancel polling timeout
                        if (data && pollTimeoutId) {
                            clearTimeout(pollTimeoutId);
                            if (pollInterval) {
                                clearInterval(pollInterval);
                                pollInterval = null;
                            }
                        }
                    } else if (type === "notification") {
                        handleNewNotification(data);
                    } else {
                        console.error("WebSocket error:", data);
                    }
                });

                // Fetch initial unread counts
                await fetchUnreadCounts();

                // Wait for WebSocket connection attempt
                await wsConnectPromise;

                // If WebSocket not connected after attempt, setup HTTP polling fallback (every 5 seconds)
                // But wait a bit to see if connection succeeds
                if (!notificationService.ws || notificationService.ws.readyState !== WebSocket.OPEN) {
                    console.warn("WebSocket not connected, setting up HTTP polling");
                    pollTimeoutId = setTimeout(() => {
                        pollInterval = setInterval(() => {
                            fetchUnreadCounts();
                            fetchNotifications();
                        }, 5000);
                    }, 2000); // Wait 2 seconds before starting polling
                }
            } catch (err) {
                console.error("Failed to initialize notifications:", err);
                // Setup polling as fallback
                pollTimeoutId = setTimeout(() => {
                    pollInterval = setInterval(() => {
                        fetchUnreadCounts();
                        fetchNotifications();
                    }, 5000);
                }, 2000);
            }
        })();

        // Cleanup when component unmounts
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
            if (pollTimeoutId) {
                clearTimeout(pollTimeoutId);
            }
            if (pollInterval) {
                clearInterval(pollInterval);
            }
            notificationService.disconnect();
        };
    }, [authLoading, isAuthenticated, fetchUnreadCounts, fetchNotifications]);

    // Track recently processed notifications to avoid duplicates (ref avoids stale closures)
    const processedNotificationIdsRef = useRef(new Set());
    const rapidSyncRef = useRef({ intervalId: null, timeoutId: null });

    /**
     * Handle new notification from WebSocket
     */
    const handleNewNotification = useCallback((data) => {
        // Normalize payload shapes from different server messages
        const payload = data || {};
        const type = payload.type || null;

        const extractNotification = (p) => {
            if (!p) return null;
            if (p.notification) return p.notification;
            if (p.data) return p.data;
            if (p.payload) return p.payload;
            // If payload itself looks like a notification
            if (p.id || p.pk || p.notification_id) return p;
            return null;
        };

        const notification = extractNotification(payload);

        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] Notification received:`, { type, notification });

        if (!notification) {
            console.warn(`[${timestamp}] No notification found in payload, returning`);
            return;
        }

        // Normalize a stable notification id string
        const nid = String(notification.id || notification.pk || notification.notification_id || notification._id || "");
        if (!nid) {
            console.warn(`[${timestamp}] Received notification without id, skipping dedupe.`, notification);
        } else {
            if (processedNotificationIdsRef.current.has(nid)) {
                console.warn(`[${timestamp}] ⚠️ DUPLICATE notification received (id=${nid}), skipping`);
                return;
            }

            // Mark as processed and schedule cleanup
            processedNotificationIdsRef.current.add(nid);
            setTimeout(() => {
                processedNotificationIdsRef.current.delete(nid);
            }, 2000);
        }

        // Robustly extract forum id whether server sends `forum_id`, `forum` as id, or `forum` as object
        let forumId = "";
        if (notification.forum_id) {
            forumId = String(notification.forum_id);
        } else if (notification.forum) {
            if (typeof notification.forum === 'string' || typeof notification.forum === 'number') {
                forumId = String(notification.forum);
            } else if (typeof notification.forum === 'object') {
                forumId = String(notification.forum.id || notification.forum.pk || notification.forum._id || notification.forum.forum_id || "");
            }
        }

        const tab = notification.tab || notification.section || "default";

        console.log(`[${timestamp}] ✓ Processing notification:`, {
            id: nid,
            forum_id: forumId,
            tab: tab,
            notification_type: notification.notification_type,
        });

        // Add to notifications list
        // Normalize incoming notification then add
        const normalizedNotif = {
            id: notification.id || notification.pk || notification.notification_id || notification._id,
            forum_id: forumId,
            tab: tab,
            is_read: !!notification.is_read,
            ...notification,
        };

        setNotifications(prev => [normalizedNotif, ...prev].slice(0, 100));

        // Update unread counts (use string keys for forum ids)
        setUnreadCounts(prev => {
            const updated = { global: prev.global || 0, forums: { ...(prev.forums || {}) }, tabs: { ...(prev.tabs || {}) } };

            updated.forums[forumId] = (updated.forums[forumId] || 0) + 1;
            updated.global = (updated.global || 0) + 1;

            if (!updated.tabs[forumId]) updated.tabs[forumId] = {};
            updated.tabs[forumId][tab] = (updated.tabs[forumId][tab] || 0) + 1;

            console.log(`[${timestamp}] Updated counts:`, {
                global: updated.global,
                forums: updated.forums,
                tabs: updated.tabs,
            });

            return updated;
        });

        // Show toast
        if (notification.is_push) {
            showToast(notification);
        }

        // Trigger a short period of rapid polling to make sure counts converge
        try {
            if (typeof triggerRapidSync === 'function') triggerRapidSync();
        } catch (e) {
            // swallow if trigger not yet defined
        }
    }, [showToast]);

    // Trigger a brief rapid polling phase (2s interval for 12s) to converge counts
    const triggerRapidSync = useCallback(() => {
        try {
            // Clear existing rapid sync
            if (rapidSyncRef.current.intervalId) {
                clearInterval(rapidSyncRef.current.intervalId);
                rapidSyncRef.current.intervalId = null;
            }
            if (rapidSyncRef.current.timeoutId) {
                clearTimeout(rapidSyncRef.current.timeoutId);
                rapidSyncRef.current.timeoutId = null;
            }

            // Do an immediate fetch
            fetchUnreadCounts();

            // Start short interval
            rapidSyncRef.current.intervalId = setInterval(() => {
                fetchUnreadCounts();
            }, 2000);

            // Stop after 12 seconds
            rapidSyncRef.current.timeoutId = setTimeout(() => {
                if (rapidSyncRef.current.intervalId) {
                    clearInterval(rapidSyncRef.current.intervalId);
                    rapidSyncRef.current.intervalId = null;
                }
                if (rapidSyncRef.current.timeoutId) {
                    clearTimeout(rapidSyncRef.current.timeoutId);
                    rapidSyncRef.current.timeoutId = null;
                }
            }, 12000);
        } catch (e) {
            console.error('triggerRapidSync error', e);
        }
    }, [fetchUnreadCounts]);

    // Optimistic increment to be called by UI after creating a resource
    const optimisticAddNotification = useCallback((forumId, tab, notificationObj = null, count = 1) => {
        const fid = String(forumId || "");

        // Add a lightweight notification to local list for UI (optional)
        if (notificationObj) {
            const n = {
                id: notificationObj.id || `local-${Date.now()}`,
                forum_id: fid,
                tab: tab || 'default',
                is_read: false,
                ...notificationObj,
            };
            setNotifications(prev => [n, ...prev].slice(0, 100));
        }

        // Update local counts immediately
        setUnreadCounts(prev => {
            const updated = { global: prev.global || 0, forums: { ...(prev.forums || {}) }, tabs: { ...(prev.tabs || {}) } };
            updated.forums[fid] = (updated.forums[fid] || 0) + count;
            updated.global = (updated.global || 0) + count;
            if (!updated.tabs[fid]) updated.tabs[fid] = {};
            updated.tabs[fid][tab] = (updated.tabs[fid][tab] || 0) + count;
            return updated;
        });

        // Trigger rapid sync to reconcile with server
        triggerRapidSync();
    }, [triggerRapidSync]);

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
                prev.filter(notif => String(notif.forum_id || notif.forum || "") !== String(forumId) || notif.is_read)
            );

            // Update counts
            setUnreadCounts(prev => {
                const updated = { ...prev };
                const fid = String(forumId || "");
                const count = updated.forums?.[fid] || 0;
                updated.global = Math.max(0, (updated.global || 0) - count);
                updated.forums = { ...(updated.forums || {}), [fid]: 0 };
                if (updated.tabs) delete updated.tabs[fid];
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
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] clearTabNotifications called for forum=${forumId}, tab=${tab}`);

            // ALWAYS use API for clear operations (most reliable)
            // WebSocket is for broadcast only, API is for actions
            await api.post("forums/notifications/clear-tab/", {
                forum_id: forumId,
                tab: tab
            });

            console.log(`[${timestamp}] API response received for clear-tab`);

            // Mark matching local notifications as read
            setNotifications(prev =>
                prev.map(notif => {
                    const notifForumId = String(notif.forum_id || notif.forum || "");
                    if (notifForumId === String(forumId) && notif.tab === tab) {
                        return { ...notif, is_read: true };
                    }
                    return notif;
                })
            );

            // Fetch fresh counts from server to ensure accuracy
            // This prevents stale counts and ensures dashboard updates
            console.log(`[${timestamp}] Fetching fresh counts after tab clear`);
            await fetchUnreadCounts();

        } catch (err) {
            console.error(`Failed to clear ${tab} notifications:`, err);
        }
    }, [fetchUnreadCounts]);

    /**
     * Get notifications for a specific forum
     */
    const getForumNotifications = useCallback((forumId) => {
        const fid = String(forumId || "");
        return notifications.filter(
            notif => String(notif.forum_id || notif.forum || "") === fid && !notif.is_read
        );
    }, [notifications]);

    /**
     * Get notifications for a specific tab in a forum
     */
    const getTabNotifications = useCallback((forumId, tab) => {
        const fid = String(forumId || "");
        return notifications.filter(
            notif => String(notif.forum_id || notif.forum || "") === fid && notif.tab === tab && !notif.is_read
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
        lastFetchedAt,
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
        optimisticAddNotification,
        triggerRapidSync,
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
        // Provide default values if context is unavailable (dev server issue)
        console.warn("useNotifications called outside NotificationProvider, returning defaults");
        return {
            notifications: [],
            unreadCounts: { global: 0, forums: {}, tabs: {} },
            isLoading: false,
            error: "",
            isConnected: false,
            toasts: [],
            lastFetchedAt: null,
            fetchNotifications: async () => { },
            fetchUnreadCounts: async () => { },
            markAsRead: async () => { },
            clearForumNotifications: async () => { },
            clearTabNotifications: async () => { },
            getForumNotifications: () => [],
            getTabNotifications: () => [],
            getForumUnreadCount: () => 0,
            getTabUnreadCount: () => 0,
            showToast: () => { },
            removeToast: () => { },
            optimisticAddNotification: () => { },
        };
    }

    return context;
}
