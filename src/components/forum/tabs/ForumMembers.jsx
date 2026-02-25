import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api/axios";
import { useNotifications } from "../../../context/NotificationContext";
import NotificationMessageBar from "../../notifications/NotificationMessageBar";

export default function ForumMembers({ forum, userRole }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { clearTabNotifications } = useNotifications();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMemberId, setSelectedMemberId] = useState(null);
    const [roleModal, setRoleModal] = useState(false);
    const [newRole, setNewRole] = useState("");
    const [openMenuId, setOpenMenuId] = useState(null);
    const menuRefs = useRef({});

    const executiveRoles = ["SA", "CP", "VC", "SEC", "FSEC"];
    const isAdmin = userRole && executiveRoles.includes(userRole);
    const [query, setQuery] = useState("");

    // Helper function to get ring color styling
    const getRingColorClasses = (ringColor) => {
        const colorMap = {
            'GRAY': { border: 'border-gray-400', bg: 'bg-gray-400', text: 'text-gray-700', label: 'Inactive' },
            'BRONZE': { border: 'border-orange-600', bg: 'bg-orange-500', text: 'text-orange-700', label: 'Bronze' },
            'SILVER': { border: 'border-gray-500', bg: 'bg-gray-400', text: 'text-gray-700', label: 'Silver' },
            'GOLD': { border: 'border-yellow-500', bg: 'bg-yellow-400', text: 'text-yellow-700', label: 'Gold' },
            'PLATINUM': { border: 'border-blue-500', bg: 'bg-blue-400', text: 'text-blue-700', label: 'Platinum' },
        };
        return colorMap[ringColor] || colorMap['GRAY'];
    };

    // Calculate activeness percentage (0-100)
    const getActivenessPercentage = (activity) => {
        if (!activity) return 0;
        const score = activity.activity_score || 0;
        // Simple formula: score / 100 * 100, capped at 100
        return Math.min(100, Math.floor((score / 100) * 100));
    };

    const getActivenessLabel = (percentage) => {
        if (percentage === 0) return 'Inactive';
        if (percentage < 25) return 'Low Activity';
        if (percentage < 50) return 'Moderate Activity';
        if (percentage < 75) return 'Active';
        return 'Very Active';
    };

    useEffect(() => {
        fetchMembers();
    }, [forum?.id]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (openMenuId && menuRefs.current[openMenuId] && !menuRefs.current[openMenuId].contains(e.target)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openMenuId]);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/forums/${forum.id}/members/`);
            // Normalize members so every member has a `role` (default to "MEMBER")
            const normalized = response.data.map((m) => ({ ...m, role: m.role || "MEMBER" }));
            setMembers(normalized);
            setError(null);
        } catch (err) {
            setError("Failed to load members");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignRole = (memberId) => {
        const cleanId = String(memberId).replace(/^:+/, "");
        setSelectedMemberId(cleanId);
        const member = members.find(m => String(m.id) === cleanId);
        setNewRole(member?.role || "member");
        setRoleModal(true);
        setOpenMenuId(null);
    };

    const handleUpdateRole = async () => {
        try {
            const cleanId = String(selectedMemberId).replace(/^:+/, "");
            await api.post(`/forums/${forum.id}/members/${cleanId}/assign-role/`, {
                role: newRole.toUpperCase()
            });
            fetchMembers();
            setRoleModal(false);
        } catch (err) {
            setError("Failed to update role");
            console.error(err);
        }
    };

    const handleRemoveFromRole = async (memberId) => {
        if (window.confirm("Are you sure you want to remove this member from their role?")) {
            try {
                const cleanId = String(memberId).replace(/^:+/, "");
                await api.post(`/forums/${forum.id}/members/${cleanId}/assign-role/`, {
                    role: "MEMBER"
                });
                fetchMembers();
                setOpenMenuId(null);
            } catch (err) {
                setError("Failed to remove from role");
                console.error(err);
            }
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (window.confirm("Are you sure you want to remove this member from the forum?")) {
            try {
                const cleanId = String(memberId).replace(/^:+/, "");
                await api.delete(`/forums/${forum.id}/members/${cleanId}/`);
                fetchMembers();
                setOpenMenuId(null);
            } catch (err) {
                setError("Failed to remove member");
                console.error(err);
            }
        }
    };

    // Filter members by search query, then separate executives from regular members
    const filteredMembers = members.filter((m) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        const first = (m.first_name || "").toLowerCase();
        const last = (m.last_name || "").toLowerCase();
        const username = (m.user_name || "").toLowerCase();
        const email = ((m.user_email || m.email) || "").toLowerCase();
        const phone = ((m.user_phone || m.phone) || "").toLowerCase();
        return (
            first.includes(q) ||
            last.includes(q) ||
            username.includes(q) ||
            email.includes(q) ||
            phone.includes(q)
        );
    });

    const membersWithRoles = filteredMembers.filter((m) => m.role && m.role !== "MEMBER");
    const regularMembers = filteredMembers.filter((m) => !m.role || m.role === "MEMBER");

    // Overall totals (unfiltered) for accurate counts when roles change
    const totalExecutives = members.filter((m) => m.role && m.role !== "MEMBER").length;
    const totalMembers = members.length;
    const totalRegular = totalMembers - totalExecutives;

    const handleMemberClick = (member) => {
        // Store the return location so we can navigate back to this forum's members tab
        sessionStorage.setItem('memberProfileReturnFrom', `forum-members:${forum.id}`);
        navigate(`/user-profile/${member.user_id || member.id}`);
    };

    const MemberCard = ({ member, isStaff = false }) => {
        const ringColorClasses = getRingColorClasses(member.ring_color || 'GRAY');
        const activenessPercentage = getActivenessPercentage(member.activity);
        const activenessLabel = getActivenessLabel(activenessPercentage);

        return (
            <div
                ref={(el) => (menuRefs.current[member.id] = el)}
                onClick={(e) => {
                    // Prevent click if admin menu button was clicked
                    if (!e.target.closest('button')) {
                        handleMemberClick(member);
                    }
                }}
                className={`relative rounded-lg overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer ${isStaff
                    ? "bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300"
                    : "bg-white border-2 border-gray-200"
                    }`}
                style={{
                    borderColor: isStaff ? undefined : ringColorClasses.border,
                }}
            >
                {/* Activeness Bar at the top */}
                <div className="h-1 bg-gray-200 w-full">
                    <div
                        className={`h-full ${ringColorClasses.bg} transition-all duration-300`}
                        style={{ width: `${activenessPercentage}%` }}
                    />
                </div>

                <div className="p-4">
                    {/* Three-dot Menu (Admin only) */}
                    {isAdmin && (
                        <div className="absolute top-3 right-3">
                            <button
                                onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                                className="text-gray-600 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-100 transition"
                            >
                                ⋮
                            </button>
                            {openMenuId === member.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                    <button
                                        onClick={() => handleAssignRole(member.id)}
                                        className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-700 text-sm border-b"
                                    >
                                        {member.role && member.role !== "MEMBER" ? "Update Role" : "Assign Role"}
                                    </button>
                                    {member.role && member.role !== "MEMBER" && (
                                        <button
                                            onClick={() => handleRemoveFromRole(member.id)}
                                            className="block w-full text-left px-4 py-2 hover:bg-yellow-50 text-gray-700 text-sm border-b"
                                        >
                                            Remove from Role
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleRemoveMember(member.id)}
                                        className="block w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm"
                                    >
                                        Remove from Forum
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Profile Photo */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`w-16 h-16 rounded-full ${ringColorClasses.bg} flex items-center justify-center text-white text-xl font-bold overflow-hidden flex-shrink-0 ring-2`}
                            style={{ ringColor: ringColorClasses.border }}
                        >
                            {member.profile?.profile_photo ? (
                                <img src={member.profile.profile_photo} alt={member.first_name} className="w-full h-full object-cover" />
                            ) : (
                                <span>{(member.first_name || member.user_name || "U")?.charAt(0).toUpperCase()}</span>
                            )}
                        </div>

                        {/* Name and Role */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900">
                                {member.first_name} {member.last_name || ""}
                            </h3>
                            {isStaff && (
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className={`inline-block text-xs font-semibold px-2 py-1 rounded ${member.role === "SA" ? "bg-red-200 text-red-800" :
                                        member.role === "CP" ? "bg-purple-200 text-purple-800" :
                                            member.role === "FSEC" ? "bg-blue-200 text-blue-800" :
                                                member.role === "SEC" ? "bg-green-200 text-green-800" :
                                                    member.role === "VC" ? "bg-orange-200 text-orange-800" :
                                                        "bg-gray-200 text-gray-800"
                                        }`}>
                                        {member.role}
                                    </span>
                                    {member.is_verified && (
                                        <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded font-medium">✓ Verified</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Activeness Info */}
                    <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-700">Activeness:</span>
                            <span className={`font-semibold ${ringColorClasses.text}`}>{activenessLabel}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full ${ringColorClasses.bg} transition-all`}
                                style={{ width: `${activenessPercentage}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-gray-600 text-xs mt-1">
                            <span>{activenessPercentage}%</span>
                            <span>Score: {member.activity?.activity_score || 0}</span>
                        </div>
                    </div>

                    {/* Activity Stats */}
                    {member.activity && (
                        <div className="mb-3 p-2 bg-blue-50 rounded text-xs space-y-1 border-l-2 border-blue-300">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">📅 Meetings:</span>
                                <span className="font-semibold text-gray-900">{member.activity.meetings_attended}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">💳 Payments:</span>
                                <span className="font-semibold text-gray-900">{member.activity.payments_completed}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">💬 Chats:</span>
                                <span className="font-semibold text-gray-900">{member.activity.chats_sent}</span>
                            </div>
                        </div>
                    )}

                    {/* Contact Information */}
                    <div className="space-y-2 text-sm text-gray-700 border-t pt-3">
                        <p className="truncate">
                            <span className="font-semibold text-gray-900">Email:</span> {member.user_email || member.email || "N/A"}
                        </p>
                        <p>
                            <span className="font-semibold text-gray-900">Phone:</span> {member.user_phone || member.phone || "N/A"}
                        </p>
                        {!isStaff && (
                            <div className="flex items-center gap-2 flex-wrap mt-2">
                                {member.is_verified && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">✓ Verified</span>
                                )}
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                    {member.role === "MEMBER" ? "Member" : member.role || "Member"}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6">
            <NotificationMessageBar forumId={forum?.id} tab="members" />

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4">
                    {error}
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-primary mb-1">Forum Members ({totalMembers})</h2>
                    <p className="text-gray-600 text-sm">
                        Executives: {totalExecutives} • Members: {totalRegular}
                    </p>
                </div>

                <div className="w-full md:w-1/3">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search members by name, email or phone"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
            </div>

            {loading ? (
                <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                    <p className="text-gray-500">Loading members...</p>
                </div>
            ) : totalMembers === 0 ? (
                <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                    <p className="text-gray-500">No members yet.</p>
                </div>
            ) : filteredMembers.length === 0 ? (
                <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                    <p className="text-gray-500">No members match your search.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Staff Members Section */}
                    {membersWithRoles.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-primary mb-4">👥 Forum Executives</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                {membersWithRoles.map((member) => (
                                    <MemberCard key={member.id} member={member} isStaff={true} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Regular Members Section */}
                    {regularMembers.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-primary mb-4">👤 Members</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                {regularMembers.map((member) => (
                                    <MemberCard key={member.id} member={member} isStaff={false} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Role Assignment Modal */}
            {roleModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-primary mb-4">Assign Role</h3>
                        <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-4"
                        >
                            <option value="MEMBER">Member (default)</option>
                            <option value="VC">Vice Chairperson (VC)</option>
                            <option value="SEC">Secretary (SEC)</option>
                            <option value="FSEC">Financial Secretary (FSEC)</option>
                            <option value="CP">Chairperson (CP)</option>
                            <option value="SA">Sole Admin (SA)</option>
                        </select>
                        <div className="flex gap-2">
                            <button
                                onClick={handleUpdateRole}
                                className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition font-medium"
                            >
                                Assign
                            </button>
                            <button
                                onClick={() => setRoleModal(false)}
                                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
