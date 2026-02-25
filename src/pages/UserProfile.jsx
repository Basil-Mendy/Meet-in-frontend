import { useState, useEffect, useRef, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";

export default function UserProfile() {
    const navigate = useNavigate();
    const { userId } = useParams();
    const fileInputRef = useRef(null);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState(false);
    const [showVerify, setShowVerify] = useState(false);
    const [selfieFile, setSelfieFile] = useState(null);
    const [idFile, setIdFile] = useState(null);
    const [showImageViewer, setShowImageViewer] = useState(false);
    const [returnLocation, setReturnLocation] = useState(null);
    const doubleClickTimerRef = useRef(null);
    const lastClickTimeRef = useRef(0);

    const { isAuthenticated, loading: authLoading } = useContext(AuthContext);

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) return;

        // Check if this is a return location from forum members tab
        const storedReturn = sessionStorage.getItem('memberProfileReturnFrom');
        if (storedReturn) {
            setReturnLocation(storedReturn);
        }

        const fetchUserProfile = async () => {
            try {
                const res = await api.get("auth/profile/");
                setProfile(res.data);
                setUser(res.data);
            } catch (err) {
                setError("Failed to load profile");
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [isAuthenticated, authLoading]);

    const handleGoBack = () => {
        if (returnLocation && returnLocation.startsWith('forum-members:')) {
            const forumId = returnLocation.split(':')[1];
            sessionStorage.removeItem('memberProfileReturnFrom');
            navigate(`/forum/${forumId}?tab=members`);
        } else {
            navigate("/dashboard");
        }
    };

    const handleProfilePictureClick = () => {
        // Double-click detection
        const now = Date.now();
        const timeSinceLastClick = now - lastClickTimeRef.current;
        lastClickTimeRef.current = now;

        if (timeSinceLastClick < 300) {
            // Double click - open upload
            if (doubleClickTimerRef.current) {
                clearTimeout(doubleClickTimerRef.current);
            }
            fileInputRef.current?.click();
        } else {
            // Single click - open viewer
            if (profile?.photo) {
                setShowImageViewer(true);
            }

            // Set timer for potential double-click
            if (doubleClickTimerRef.current) {
                clearTimeout(doubleClickTimerRef.current);
            }
            doubleClickTimerRef.current = setTimeout(() => {
                doubleClickTimerRef.current = null;
            }, 300);
        }
    };

    const handleProfilePictureUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append("photo", file);

            await api.put("auth/profile/complete/", formData);

            // Refresh profile data
            const res = await api.get("auth/profile/");
            setProfile(res.data);
            setUser(res.data);
        } catch (err) {
            console.error("Failed to upload profile picture:", err);
            alert("Failed to upload profile picture");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Loading profile...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    return (
        <>
            <div className="h-full overflow-y-auto bg-white">
                <div className="max-w-2xl mx-auto p-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-secondary mb-2">My Profile</h1>
                        <p className="text-gray-600">View and manage your profile information</p>
                    </div>

                    {/* Profile Card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm mb-6">
                        {/* Profile Picture */}
                        <div className="flex flex-col items-center mb-6">
                            {/* Profile Picture with Camera Icon */}
                            <div
                                onClick={handleProfilePictureClick}
                                className={`relative w-32 h-32 rounded-full bg-primary flex items-center justify-center text-white text-5xl font-bold mb-4 overflow-hidden ${profile?.photo ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
                                    } hover:ring-2 hover:ring-secondary`}
                                title="Click to view, double-click to edit"
                            >
                                {profile?.photo ? (
                                    <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    "👤"
                                )}

                                {/* Upload Hint */}
                                {profile?.photo && (
                                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 flex items-center justify-center rounded-full transition-all">
                                        <span className="text-white text-xl opacity-0 hover:opacity-100">📷</span>
                                    </div>
                                )}
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleProfilePictureUpload}
                                className="hidden"
                                disabled={uploading}
                            />

                            <h2 className="text-xl font-semibold text-secondary">
                                {[user?.first_name, user?.middle_name, user?.last_name].filter(Boolean).join(" ") || "User"}
                            </h2>
                            <p className="text-gray-600 text-sm">{user?.email}</p>

                            {/* Back Arrow - shown below profile picture on all screen sizes */}
                            <button
                                onClick={handleGoBack}
                                className="mt-4 flex items-center gap-2 text-primary font-medium text-sm hover:underline"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.293 16.293a1 1 0 010 1.414l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L8.414 10l5.293 5.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                                {returnLocation?.startsWith('forum-members:') ? 'Back to Forum Members' : 'Back to Dashboard'}
                            </button>
                        </div>

                        {/* Profile Info */}
                        <div className="space-y-4 border-t pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                                    <p className="text-sm font-medium text-secondary">{user?.email || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
                                    <p className="text-sm font-medium text-secondary">{profile?.phone || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Date of Birth</p>
                                    <p className="text-sm font-medium text-secondary">
                                        {profile?.date_of_birth
                                            ? new Date(profile.date_of_birth).toLocaleDateString()
                                            : "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Gender</p>
                                    <p className="text-sm font-medium text-secondary capitalize">
                                        {profile?.gender || "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Nationality</p>
                                    <p className="text-sm font-medium text-secondary">{profile?.nationality || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">State/Province</p>
                                    <p className="text-sm font-medium text-secondary">{profile?.state || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">City</p>
                                    <p className="text-sm font-medium text-secondary">{profile?.city || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Middle Name</p>
                                    <p className="text-sm font-medium text-secondary">{profile?.middle_name || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                                    <p className={`text-sm font-medium ${profile?.is_verified ? "text-green-600" : "text-yellow-600"}`}>
                                        {profile?.is_verified ? "✓ Verified" : profile?.verification_status === "pending" ? "⏳ Pending" : profile?.verification_status === "approved" ? "✓ Approved" : "Not verified"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        {/* Edit Button */}
                        <button
                            onClick={() => navigate("/complete-profile")}
                            className="w-full bg-secondary text-white py-3 rounded-lg font-medium hover:bg-accent transition"
                        >
                            Edit Profile
                        </button>

                        {/* Verify Button */}
                        <button
                            onClick={() => setShowVerify(true)}
                            className="w-full bg-white border border-gray-200 text-secondary py-3 rounded-lg font-medium hover:bg-gray-50 transition"
                        >
                            Verify Profile
                        </button>
                    </div>

                    {/* Simple Verify Modal */}
                    {showVerify && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center">
                            <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowVerify(false)} />
                            <div className="bg-white rounded-lg p-6 z-10 w-11/12 max-w-lg">
                                <h3 className="text-lg font-semibold mb-3">Verify your account</h3>
                                <p className="text-sm text-gray-600 mb-4">Take a selfie and upload an official ID. These will be sent to the app managers for review.</p>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-gray-500">Selfie (camera or upload)</label>
                                        <input type="file" accept="image/*" onChange={(e) => setSelfieFile(e.target.files[0])} />
                                    </div>

                                    <div>
                                        <label className="text-xs text-gray-500">ID Document</label>
                                        <input type="file" accept="image/*,application/pdf" onChange={(e) => setIdFile(e.target.files[0])} />
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={async () => {
                                                if (!selfieFile || !idFile) return alert("Please provide both selfie and ID file");
                                                const fd = new FormData();
                                                fd.append("selfie", selfieFile);
                                                fd.append("id_document", idFile);
                                                // optional id_type
                                                fd.append("id_type", "national_id");
                                                try {
                                                    await api.post("auth/verify/", fd, { headers: { "Content-Type": "multipart/form-data" } });
                                                    alert("Verification request submitted.");
                                                    setShowVerify(false);
                                                } catch (err) {
                                                    console.error(err);
                                                    alert("Failed to submit verification request.");
                                                }
                                            }}
                                            className="bg-secondary text-white py-2 px-4 rounded"
                                        >
                                            Submit
                                        </button>
                                        <button onClick={() => setShowVerify(false)} className="px-4 py-2 border rounded">Cancel</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Image Viewer Modal */}
            {showImageViewer && profile?.photo && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
                    onClick={() => setShowImageViewer(false)}
                >
                    <div
                        className="relative max-w-2xl max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={profile.photo}
                            alt="Profile"
                            className="max-w-full max-h-[90vh] object-cover rounded-lg"
                        />
                        <button
                            onClick={() => setShowImageViewer(false)}
                            className="absolute top-4 right-4 bg-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-200 transition-colors"
                            title="Close"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
