import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";

export default function JoinForum() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [forumIdInput, setForumIdInput] = useState("");
    const [invitationCode, setInvitationCode] = useState("");
    const [forumPreview, setForumPreview] = useState(null);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [activeTab, setActiveTab] = useState("join"); // "join" or "pending"

    // Check for forum_id in URL query params on mount
    useEffect(() => {
        const forumIdFromUrl = searchParams.get("forum_id");
        if (forumIdFromUrl) {
            setForumIdInput(forumIdFromUrl.toUpperCase());
            // Auto-load preview
            loadForumPreview(forumIdFromUrl);
        }
        fetchPendingRequests();
    }, [searchParams]);

    const fetchPendingRequests = async () => {
        try {
            const response = await api.get("forums/my-join-requests/");
            setPendingRequests(response.data);
        } catch (err) {
            console.error("Failed to fetch pending requests");
        }
    };

    // Preview forum by forum_id
    const loadForumPreview = async (forumId) => {
        if (!forumId || !forumId.trim()) {
            setError("Please enter a Forum ID");
            return;
        }

        setError("");
        setSuccessMessage("");
        setPreviewLoading(true);

        try {
            const response = await api.get(`forums/preview/${forumId}/`);
            setForumPreview(response.data);
            setInvitationCode(""); // Reset code when viewing new forum
        } catch (err) {
            setError(
                err.response?.data?.detail ||
                "Forum not found. Please check the ID."
            );
            setForumPreview(null);
        } finally {
            setPreviewLoading(false);
        }
    };

    // Preview forum by forum_id
    const handlePreviewForum = async () => {
        await loadForumPreview(forumIdInput);
    };

    // Submit join request with invitation code
    const handleJoinRequest = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        if (!forumIdInput || !invitationCode) {
            setError("Please enter both Forum ID and Invitation Code");
            return;
        }

        setLoading(true);
        try {
            const response = await api.post("forums/join/", {
                forum_id: forumIdInput,
                invitation_code: invitationCode,
            });

            setSuccessMessage(
                "Join request sent! The forum admin will review your request."
            );
            setForumIdInput("");
            setInvitationCode("");
            setForumPreview(null);

            // Refresh pending requests
            setTimeout(() => {
                fetchPendingRequests();
                setActiveTab("pending");
            }, 1000);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to send join request."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-primary mb-2">Join a Forum</h1>
                    <p className="text-gray-600">
                        Search for forums using their Forum ID and enter an invitation code to join.
                    </p>
                </div>

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

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab("join")}
                        className={`px-4 py-3 font-medium transition border-b-2 ${activeTab === "join"
                                ? "border-primary text-primary"
                                : "border-transparent text-gray-600 hover:text-primary"
                            }`}
                    >
                        Join Forum
                    </button>
                    <button
                        onClick={() => setActiveTab("pending")}
                        className={`px-4 py-3 font-medium transition border-b-2 relative ${activeTab === "pending"
                                ? "border-primary text-primary"
                                : "border-transparent text-gray-600 hover:text-primary"
                            }`}
                    >
                        Pending Requests
                        {pendingRequests.length > 0 && (
                            <span className="absolute top-1 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {pendingRequests.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Join Forum Tab */}
                {activeTab === "join" && (
                    <div className="bg-white rounded-lg shadow p-6">
                        {/* Search by Forum ID */}
                        {!forumPreview && (
                            <div className="mb-8">
                                <h2 className="text-lg font-semibold text-primary mb-4">
                                    Find Forum by ID
                                </h2>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={forumIdInput}
                                        onChange={(e) => setForumIdInput(e.target.value.toUpperCase())}
                                        placeholder="Enter Forum ID (e.g., ABC12345)"
                                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <button
                                        onClick={handlePreviewForum}
                                        disabled={previewLoading || !forumIdInput.trim()}
                                        className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-opacity-90 transition disabled:opacity-50"
                                    >
                                        {previewLoading ? "Loading..." : "Search"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Forum Preview */}
                        {forumPreview && (
                            <div className="mb-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-primary">
                                        Forum Preview
                                    </h2>
                                    <button
                                        onClick={() => {
                                            setForumIdInput("");
                                            setInvitationCode("");
                                            setForumPreview(null);
                                            setError("");
                                        }}
                                        className="text-sm text-gray-600 hover:text-primary underline"
                                    >
                                        Change Forum
                                    </button>
                                </div>
                                <div className="flex gap-4">
                                    {/* Forum Picture */}
                                    <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {forumPreview.profile_picture ? (
                                            <img
                                                src={forumPreview.profile_picture}
                                                alt={forumPreview.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-2xl font-bold text-primary">
                                                {forumPreview.name?.charAt(0)?.toUpperCase()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Forum Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-xl font-bold text-primary">
                                                {forumPreview.name}
                                            </h3>
                                            {forumPreview.is_verified && (
                                                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                                                    ✓
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">
                                            ID: <span className="font-mono font-semibold">{forumPreview.forum_id}</span>
                                        </p>
                                        <p className="text-sm text-gray-700 line-clamp-2">
                                            {forumPreview.description || "No description"}
                                        </p>
                                        {forumPreview.address && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                📍 {forumPreview.address}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Join Form */}
                        {forumPreview && (
                            <form onSubmit={handleJoinRequest} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Invitation Code *
                                    </label>
                                    <input
                                        type="text"
                                        value={invitationCode}
                                        onChange={(e) => setInvitationCode(e.target.value)}
                                        placeholder="Enter the invitation code provided by the forum"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        You need an invitation code to join this forum. Ask the forum admin or use an invitation link.
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading || !forumPreview}
                                        className="flex-1 bg-primary text-white py-2 rounded-lg font-medium hover:bg-opacity-90 transition disabled:opacity-50"
                                    >
                                        {loading ? "Sending Request..." : "Send Join Request"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setForumIdInput("");
                                            setInvitationCode("");
                                            setForumPreview(null);
                                            setError("");
                                        }}
                                        className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {/* Pending Requests Tab */}
                {activeTab === "pending" && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-primary mb-4">
                            Your Pending Join Requests
                        </h2>
                        {pendingRequests.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                                No pending join requests. Use the "Join Forum" tab to request to join a forum.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {pendingRequests.map((request) => (
                                    <div
                                        key={request.id}
                                        className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                                    >
                                        <div>
                                            <h3 className="font-semibold text-primary">
                                                {request.forum_name}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                Forum ID: <span className="font-mono">{request.forum_id}</span>
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Requested: {new Date(request.requested_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span
                                                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${request.status === "PENDING"
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : request.status === "APPROVED"
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-red-100 text-red-800"
                                                    }`}
                                            >
                                                {request.status}
                                            </span>
                                            {request.status === "APPROVED" && (
                                                <button
                                                    onClick={() => navigate("/dashboard")}
                                                    className="block text-xs text-primary hover:underline mt-2"
                                                >
                                                    Go to Forum
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Back Button */}
                <div className="mt-6">
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="text-primary hover:underline font-medium"
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
