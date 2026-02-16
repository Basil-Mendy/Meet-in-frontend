import { useEffect, useState, useRef } from "react";
import api from "../api/axios";

export default function MobileProfilePanel({ isOpen, onClose }) {
    const fileInputRef = useRef(null);
    const [profile, setProfile] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showVerify, setShowVerify] = useState(false);
    const [selfieFile, setSelfieFile] = useState(null);
    const [idFile, setIdFile] = useState(null);

    useEffect(() => {
        if (!isOpen) return;

        const fetchProfile = async () => {
            try {
                const res = await api.get("auth/profile/");
                setProfile(res.data);
                setUser(res.data);
            } catch (err) {
                console.error("Failed to load profile");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [isOpen]);

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={onClose}
            />

            {/* Slide Panel */}
            <div className="absolute inset-y-0 right-0 w-80 bg-white shadow-lg overflow-y-auto transform transition-transform">
                {/* Header */}
                <div className="sticky top-0 bg-primary text-white p-4 flex items-center justify-between">
                    <h2 className="font-semibold">My Profile</h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-blue-900 p-2 rounded-full transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-gray-500">Loading...</p>
                    </div>
                ) : (
                    <div className="p-6 space-y-6">
                        {/* Profile Picture */}
                        <div className="flex flex-col items-center">
                            {/* Profile Picture with Camera Icon */}
                            <div className="relative w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-4xl font-bold mb-3 overflow-hidden group">
                                {profile?.photo ? (
                                    <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    "👤"
                                )}

                                {/* Camera Icon Overlay */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-50"
                                    title="Click to upload profile picture"
                                >
                                    <span className="text-white text-2xl">📷</span>
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleProfilePictureUpload}
                                    className="hidden"
                                />
                            </div>
                            <h3 className="text-lg font-semibold text-secondary">
                                {[user?.first_name, user?.middle_name, user?.last_name].filter(Boolean).join(" ") || "User"}
                            </h3>
                            <p className="text-sm text-gray-600">{user?.email}</p>
                        </div>

                        {/* Verify button */}
                        <div className="flex flex-col gap-2">
                            <button className="w-full bg-white border border-gray-200 text-secondary py-2 rounded-lg" onClick={() => setShowVerify(true)}>Verify Profile</button>
                        </div>

                        {/* Info */}
                        <div className="space-y-4 border-t pt-4">
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

                        {/* Edit Button */}
                        <button className="w-full bg-secondary text-white py-2 rounded-lg text-sm font-medium hover:bg-accent transition">
                            Edit Profile
                        </button>

                        {/* Verify Modal */}
                        {showVerify && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center">
                                <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowVerify(false)} />
                                <div className="bg-white rounded-lg p-6 z-10 w-11/12 max-w-lg">
                                    <h3 className="text-lg font-semibold mb-3">Verify your account</h3>
                                    <p className="text-sm text-gray-600 mb-4">Take a selfie and upload an official ID.</p>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-gray-500">Selfie</label>
                                            <input type="file" accept="image/*" onChange={(e) => setSelfieFile(e.target.files[0])} />
                                        </div>

                                        <div>
                                            <label className="text-xs text-gray-500">ID Document</label>
                                            <input type="file" accept="image/*,application/pdf" onChange={(e) => setIdFile(e.target.files[0])} />
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={async () => {
                                                    if (!selfieFile || !idFile) return alert("Please provide both selfie and ID");
                                                    const fd = new FormData();
                                                    fd.append("selfie", selfieFile);
                                                    fd.append("id_document", idFile);
                                                    fd.append("id_type", "national_id");
                                                    try {
                                                        await api.post("auth/verify/", fd, { headers: { "Content-Type": "multipart/form-data" } });
                                                        alert("Verification request submitted.");
                                                        setShowVerify(false);
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert("Failed.");
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
                )}
            </div>
        </div>
    );
}

