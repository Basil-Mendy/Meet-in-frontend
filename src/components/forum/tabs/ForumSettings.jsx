import { useState, useEffect } from "react";
import api from "../../../api/axios";
import { useNotifications } from "../../../context/NotificationContext";
import NotificationMessageBar from "../../notifications/NotificationMessageBar";

export default function ForumSettings({ forum, userRole }) {
    const [invitationCodes, setInvitationCodes] = useState([]);
    const [joinRequests, setJoinRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [showGenerateForm, setShowGenerateForm] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Form state
    const [usageType, setUsageType] = useState("MULTIPLE");
    const [maxUsageCount, setMaxUsageCount] = useState("");
    const [validityDays, setValidityDays] = useState(30);
    const [generatingCode, setGeneratingCode] = useState(false);

    // Email configuration state
    const [forumEmail, setForumEmail] = useState("");
    const [editingEmail, setEditingEmail] = useState(false);
    const [savingEmail, setSavingEmail] = useState(false);

    // Check if user is admin
    const isAdmin = userRole && ["SA", "CP"].includes(userRole);
    const { clearTabNotifications } = useNotifications();

    // Fetch invitation codes on mount
    useEffect(() => {
        if (forum?.id) {
            fetchJoinRequests();
            clearTabNotifications(forum.id, "settings");
            if (isAdmin) {
                fetchInvitationCodes();
            }
            // Initialize email from forum data
            if (forum?.email) {
                setForumEmail(forum.email);
            }
        }
    }, [forum?.id, isAdmin, clearTabNotifications]);

    const fetchInvitationCodes = async () => {
        setLoading(true);
        try {
            const response = await api.get(`forums/${forum.id}/invitation-codes/`);
            setInvitationCodes(response.data);
        } catch (err) {
            console.error("Failed to fetch invitation codes");
        } finally {
            setLoading(false);
        }
    };

    const fetchJoinRequests = async () => {
        setRequestsLoading(true);
        try {
            const response = await api.get(`forums/${forum.id}/join-requests/`);
            setJoinRequests(response.data);
        } catch (err) {
            console.error("Failed to fetch join requests");
        } finally {
            setRequestsLoading(false);
        }
    };

    const handleGenerateCode = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        if (usageType === "LIMITED" && (!maxUsageCount || maxUsageCount < 1)) {
            setError("Please enter a valid maximum usage count");
            return;
        }

        if (!validityDays || validityDays < 1) {
            setError("Please enter a valid validity period");
            return;
        }

        setGeneratingCode(true);
        try {
            const payload = {
                usage_type: usageType,
                validity_days: validityDays,
            };

            if (usageType === "LIMITED") {
                payload.max_usage_count = parseInt(maxUsageCount);
            }

            const response = await api.post(
                `forums/${forum.id}/invitation-codes/generate/`,
                payload
            );

            setSuccessMessage("Invitation code generated successfully!");
            setShowGenerateForm(false);
            setUsageType("MULTIPLE");
            setMaxUsageCount("");
            setValidityDays(30);
            fetchInvitationCodes();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Failed to generate invitation code"
            );
        } finally {
            setGeneratingCode(false);
        }
    };

    const handleApproveRequest = async (requestId) => {
        if (!window.confirm("Are you sure you want to approve this join request?")) {
            return;
        }

        try {
            setError("");
            setSuccessMessage("");

            await api.post(`forums/join-requests/${requestId}/review/`, {
                action: "approve"
            });

            setSuccessMessage("Join request approved successfully!");
            fetchJoinRequests();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Failed to approve join request"
            );
        }
    };

    const handleRejectRequest = async (requestId) => {
        if (!window.confirm("Are you sure you want to reject this join request?")) {
            return;
        }

        try {
            setError("");
            setSuccessMessage("");

            await api.post(`forums/join-requests/${requestId}/review/`, {
                action: "reject"
            });

            setSuccessMessage("Join request rejected successfully!");
            fetchJoinRequests();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Failed to reject join request"
            );
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setSuccessMessage("Copied to clipboard!");
        setTimeout(() => setSuccessMessage(""), 2000);
    };

    const getInvitationLink = () => {
        const baseUrl = window.location.origin;
        return `${baseUrl}/join-forum?forum_id=${forum?.forum_id}`;
    };

    const getRemainingUses = (code) => {
        if (code.usage_type === "SINGLE") {
            return code.current_usage_count >= 1 ? "Used" : "Available";
        } else if (code.usage_type === "MULTIPLE") {
            return "Unlimited";
        } else if (code.usage_type === "LIMITED") {
            return `${code.current_usage_count}/${code.max_usage_count}`;
        }
    };

    const isCodeExpired = (code) => {
        return new Date(code.valid_until) < new Date();
    };

    const deleteExpiredCodes = async () => {
        if (!window.confirm("Are you sure you want to delete all expired invitation codes?")) {
            return;
        }

        try {
            setError("");
            setSuccessMessage("");

            const expiredCodeIds = invitationCodes
                .filter(code => isCodeExpired(code))
                .map(code => code.id);

            if (expiredCodeIds.length === 0) {
                setError("No expired codes to delete");
                return;
            }

            // Delete each expired code
            for (const codeId of expiredCodeIds) {
                await api.delete(`forums/${forum.id}/invitation-codes/${codeId}/`);
            }

            setSuccessMessage(`✓ Deleted ${expiredCodeIds.length} expired code(s)`);
            fetchInvitationCodes();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                "Failed to delete expired codes"
            );
        }
    };

    const updateForumEmail = async () => {
        if (!forumEmail.trim()) {
            setError("Email cannot be empty");
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(forumEmail)) {
            setError("Please enter a valid email address");
            return;
        }

        try {
            setSavingEmail(true);
            setError("");
            setSuccessMessage("");

            await api.patch(`forums/${forum.id}/info/`, {
                email: forumEmail
            });

            setSuccessMessage("Forum email updated successfully!");
            setEditingEmail(false);
        } catch (err) {
            setError(
                err.response?.data?.email?.[0] ||
                err.response?.data?.error ||
                "Failed to update forum email"
            );
        } finally {
            setSavingEmail(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="p-6 max-w-4xl">
                <h2 className="text-2xl font-bold text-primary mb-6">Forum Join Requests</h2>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {/* Join Requests Section - Visible to all members */}
                <div className="mb-8">
                    <p className="text-sm text-gray-600 mb-4">
                        View pending join requests from users who want to join this forum.
                    </p>

                    {requestsLoading ? (
                        <p className="text-gray-500 text-center py-8">Loading requests...</p>
                    ) : joinRequests.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                            No pending join requests.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {joinRequests.map((request) => (
                                <div
                                    key={request.id}
                                    className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition"
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        {/* Profile Picture */}
                                        <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0 overflow-hidden">
                                            {request.user_profile_photo ? (
                                                <img
                                                    src={request.user_profile_photo}
                                                    alt={request.user_name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-primary-dark text-white font-semibold text-lg">
                                                    {request.user_first_name?.charAt(0)}{request.user_last_name?.charAt(0)}
                                                </div>
                                            )}
                                        </div>

                                        {/* User Info */}
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">
                                                {request.user_first_name} {request.user_last_name}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Requested {new Date(request.requested_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium px-3 py-1 rounded bg-yellow-100 text-yellow-800">
                                            {request.status}
                                        </span>
                                        <span className="text-xs text-gray-500 italic">
                                            (Admin only)
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl">
            {/* Header */}
            <h2 className="text-2xl font-bold text-primary mb-6">Forum Settings</h2>

            <NotificationMessageBar forumId={forum?.id} tab="settings" />

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
                    {successMessage}
                </div>
            )}

            {/* Invitation Link Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-primary mb-3">
                    Invitation Link
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                    Share this link with users to allow them to join your forum.
                </p>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={getInvitationLink()}
                        readOnly
                        className="flex-1 border border-blue-300 rounded-lg px-4 py-2 bg-white text-sm font-mono"
                    />
                    <button
                        onClick={() => copyToClipboard(getInvitationLink())}
                        className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-90 transition"
                    >
                        Copy
                    </button>
                </div>
            </div>

            {/* Invitation Codes Section */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-primary">
                        Invitation Codes
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={deleteExpiredCodes}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition text-sm"
                            title="Delete all expired codes"
                        >
                            🗑 Delete Expired
                        </button>
                        <button
                            onClick={() => setShowGenerateForm(!showGenerateForm)}
                            className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-90 transition"
                        >
                            {showGenerateForm ? "Cancel" : "+ Generate Code"}
                        </button>
                    </div>
                </div>

                {/* Generate Code Form */}
                {showGenerateForm && (
                    <form onSubmit={handleGenerateCode} className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Usage Type */}
                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Usage Type *
                                </label>
                                <select
                                    value={usageType}
                                    onChange={(e) => {
                                        setUsageType(e.target.value);
                                        setMaxUsageCount("");
                                    }}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="SINGLE">Single Use</option>
                                    <option value="MULTIPLE">Multiple Uses (Unlimited)</option>
                                    <option value="LIMITED">Limited Uses</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Choose how many times the code can be used
                                </p>
                            </div>

                            {/* Max Usage (if LIMITED) */}
                            {usageType === "LIMITED" && (
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Maximum Uses *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={maxUsageCount}
                                        onChange={(e) => setMaxUsageCount(e.target.value)}
                                        placeholder="e.g., 10"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                            )}

                            {/* Validity Period */}
                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Valid For (Days) *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={validityDays}
                                    onChange={(e) => setValidityDays(parseInt(e.target.value))}
                                    placeholder="e.g., 30"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Code expires after this period
                                </p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={generatingCode}
                            className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-opacity-90 transition disabled:opacity-50"
                        >
                            {generatingCode ? "Generating..." : "Generate Code"}
                        </button>
                    </form>
                )}

                {/* Codes List */}
                {loading ? (
                    <p className="text-gray-500 text-center py-8">Loading codes...</p>
                ) : invitationCodes.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                        No invitation codes yet. Create one to allow users to join.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {invitationCodes.map((code) => (
                            <div
                                key={code.id}
                                className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                            >
                                <div className="flex-1">
                                    {/* Code and Status */}
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-mono font-bold text-primary text-lg">
                                            {code.code}
                                        </span>
                                        <span
                                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${!code.is_active || isCodeExpired(code)
                                                ? "bg-gray-100 text-gray-700"
                                                : "bg-green-100 text-green-800"
                                                }`}
                                        >
                                            {!code.is_active
                                                ? "Inactive"
                                                : isCodeExpired(code)
                                                    ? "Expired"
                                                    : "Active"}
                                        </span>
                                    </div>

                                    {/* Details */}
                                    <div className="text-xs text-gray-600 space-y-1">
                                        <p>
                                            Type: <span className="font-semibold">{code.usage_type}</span>
                                        </p>
                                        <p>
                                            Usage: <span className="font-semibold">{getRemainingUses(code)}</span>
                                        </p>
                                        <p>
                                            Expires: {new Date(code.valid_until).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 ml-4">
                                    <button
                                        onClick={() => copyToClipboard(code.code)}
                                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm transition"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Join Requests Section */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-primary mb-4">
                    Join Requests
                </h3>

                {requestsLoading ? (
                    <p className="text-gray-500 text-center py-8">Loading requests...</p>
                ) : joinRequests.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                        No pending join requests.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {joinRequests.map((request) => (
                            <div
                                key={request.id}
                                className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition"
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    {/* Profile Picture */}
                                    <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0 overflow-hidden">
                                        {request.user_profile_photo ? (
                                            <img
                                                src={request.user_profile_photo}
                                                alt={request.user_name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-primary-dark text-white font-semibold text-lg">
                                                {request.user_first_name?.charAt(0)}{request.user_last_name?.charAt(0)}
                                            </div>
                                        )}
                                    </div>

                                    {/* User Info */}
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">
                                            {request.user_first_name} {request.user_last_name}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Requested {new Date(request.requested_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Status and Actions */}
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium px-3 py-1 rounded bg-yellow-100 text-yellow-800">
                                        {request.status}
                                    </span>
                                    {isAdmin && request.status === "PENDING" && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleApproveRequest(request.id)}
                                                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
                                            >
                                                ✓ Approve
                                            </button>
                                            <button
                                                onClick={() => handleRejectRequest(request.id)}
                                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
                                            >
                                                ✗ Reject
                                            </button>
                                        </div>
                                    )}
                                    {!isAdmin && (
                                        <span className="text-xs text-gray-500 italic">
                                            (Admin only)
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Additional Settings */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">
                    Email Configuration
                </h3>

                {isAdmin && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 mb-4">
                            Configure the email address from which announcement emails are sent to forum members.
                        </p>

                        {!editingEmail ? (
                            <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Current Forum Email:</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        {forumEmail || "Not configured"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEditingEmail(true)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                >
                                    Edit Email
                                </button>
                            </div>
                        ) : (
                            <div className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Email Address *</label>
                                    <input
                                        type="email"
                                        value={forumEmail}
                                        onChange={(e) => setForumEmail(e.target.value)}
                                        placeholder="forum@example.com"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        This email will be used as the sender for all announcement messages.
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={updateForumEmail}
                                        disabled={savingEmail}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                                    >
                                        {savingEmail ? "Saving..." : "✓ Save Email"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingEmail(false);
                                            setForumEmail(forum?.email || "");
                                        }}
                                        disabled={savingEmail}
                                        className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition disabled:opacity-50"
                                    >
                                        ✗ Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!isAdmin && (
                    <p className="text-sm text-gray-500 italic">
                        Only forum admins can configure the email address.
                    </p>
                )}
            </div>
        </div>
    );
}
