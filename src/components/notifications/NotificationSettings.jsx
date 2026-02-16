import { useState, useEffect } from "react";
import api from "../../api/axios";

/**
 * NotificationSettings - Allows users to control how they receive notifications
 * Grouped by category with toggles for in-app, push, and email channels
 */

export default function NotificationSettings() {
    const [preferences, setPreferences] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        fetchPreferences();
    }, []);

    const fetchPreferences = async () => {
        try {
            setLoading(true);
            const res = await api.get("forums/notification-preferences/");
            setPreferences(res.data);
            setError("");
        } catch (err) {
            console.error("Failed to fetch preferences:", err);
            setError("Failed to load notification settings");
        } finally {
            setLoading(false);
        }
    };

    const savePreferences = async () => {
        try {
            setSaving(true);
            await api.put("forums/notification-preferences/", preferences);
            setSuccessMessage("Notification settings saved successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
            console.error("Failed to save preferences:", err);
            setError("Failed to save notification settings");
        } finally {
            setSaving(false);
        }
    };

    const updatePreference = (key, value) => {
        setPreferences(prev => ({
            ...prev,
            [key]: value
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <p className="text-gray-500">Loading notification settings...</p>
            </div>
        );
    }

    if (!preferences) {
        return null;
    }

    const notificationCategories = [
        {
            title: "Feed Posts",
            description: "Get notified about new posts in forums",
            keys: ["feed"]
        },
        {
            title: "Meetings",
            description: "Get notified about meetings",
            keys: ["meetings"]
        },
        {
            title: "Payments",
            description: "Get notified about payment activities",
            keys: ["payments"]
        },
        {
            title: "Disbursements",
            description: "Get notified about disbursements",
            keys: ["disbursements"]
        },
        {
            title: "Members",
            description: "Get notified about member activities",
            keys: ["members"]
        },
        {
            title: "Forum Information",
            description: "Get notified about forum updates",
            keys: ["forum_info"]
        },
        {
            title: "Announcements",
            description: "Get notified about forum announcements",
            keys: ["announcements"]
        },
        {
            title: "Polls",
            description: "Get notified about polls",
            keys: ["polls"]
        },
    ];

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Notification Settings
            </h2>
            <p className="text-gray-600 mb-6">
                Control how and when you receive notifications from forums
            </p>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-6">
                    {successMessage}
                </div>
            )}

            <div className="space-y-6">
                {notificationCategories.map(category => (
                    <NotificationCategory
                        key={category.title}
                        category={category}
                        preferences={preferences}
                        onUpdate={updatePreference}
                    />
                ))}
            </div>

            {/* Save Button */}
            <div className="mt-8 border-t pt-6 flex gap-3">
                <button
                    onClick={savePreferences}
                    disabled={saving}
                    className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-900 transition disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save Settings"}
                </button>
                <button
                    onClick={fetchPreferences}
                    className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

/**
 * NotificationCategory - Render a single notification category with channel toggles
 */
function NotificationCategory({ category, preferences, onUpdate }) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="border border-gray-200 rounded-lg p-4">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between cursor-pointer"
            >
                <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{category.title}</h3>
                    <p className="text-sm text-gray-600">{category.description}</p>
                </div>
                <span className={`transition ${isExpanded ? "rotate-180" : ""}`}>
                    ▼
                </span>
            </button>

            {/* Content */}
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-4">
                        {/* In-App Toggle */}
                        <ChannelToggle
                            label="In-App"
                            icon="🔔"
                            enabled={preferences[`${category.keys[0]}_in_app`]}
                            onChange={(value) =>
                                onUpdate(`${category.keys[0]}_in_app`, value)
                            }
                        />

                        {/* Push Toggle */}
                        <ChannelToggle
                            label="Push Notifications"
                            icon="📱"
                            enabled={preferences[`${category.keys[0]}_push`]}
                            onChange={(value) =>
                                onUpdate(`${category.keys[0]}_push`, value)
                            }
                        />

                        {/* Email Toggle */}
                        <ChannelToggle
                            label="Email"
                            icon="✉️"
                            enabled={preferences[`${category.keys[0]}_email`]}
                            onChange={(value) =>
                                onUpdate(`${category.keys[0]}_email`, value)
                            }
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * ChannelToggle - Individual toggle for a notification channel
 */
function ChannelToggle({ label, icon, enabled, onChange }) {
    return (
        <div className="flex items-center gap-3">
            <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => onChange(e.target.checked)}
                className="w-5 h-5 text-primary rounded cursor-pointer"
            />
            <label className="cursor-pointer">
                <span className="text-lg">{icon}</span>
                <span className="text-sm text-gray-700">{label}</span>
            </label>
        </div>
    );
}
