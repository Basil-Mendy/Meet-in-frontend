import { useState, useEffect, useRef } from "react";
import api from "../../../api/axios";
import { useNotifications } from "../../../context/NotificationContext";
import NotificationMessageBar from "../../notifications/NotificationMessageBar";

export default function ForumDisbursement({ forum, userRole }) {
    const [disbursements, setDisbursements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [showCreateDisbursement, setShowCreateDisbursement] = useState(false);
    const [myDisbursements, setMyDisbursements] = useState([]);
    const [memberDisbLoading, setMemberDisbLoading] = useState(false);

    const [disbursementForm, setDisbursementForm] = useState({
        title: "",
        type: "PAY_ALL",
        disbursement_date: "",
        categories: [],
        selected_member_ids: [],
        amount: "",
    });

    const [forumMembers, setForumMembers] = useState([]);
    const [forumWalletBalance, setForumWalletBalance] = useState(null);
    const [selectedDisbursement, setSelectedDisbursement] = useState(null);
    const [disbursementDetails, setDisbursementDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const isAdmin = userRole && ["SA", "CP", "VC", "SEC", "FSEC"].includes(userRole);
    const { notifications } = useNotifications();

    useEffect(() => {
        if (forum?.id) {
            fetchMyDisbursements();
            if (isAdmin) {
                fetchDisbursements();
                fetchForumMembers();
                fetchForumWallet();
            }
        }
    }, [forum?.id, isAdmin]);

    const fetchMyDisbursements = async () => {
        setMemberDisbLoading(true);
        try {
            const response = await api.get(`payments/forums/${forum.id}/my-disbursements/`);
            setMyDisbursements(response.data || []);
        } catch (err) {
            console.error("Failed to fetch my disbursements", err);
        } finally {
            setMemberDisbLoading(false);
        }
    };

    const fetchDisbursements = async () => {
        setLoading(true);
        try {
            const response = await api.get(`payments/forums/${forum.id}/disbursements/`);
            setDisbursements(response.data || []);
        } catch (err) {
            console.error("Failed to fetch disbursements", err);
            setError("Failed to load disbursements");
        } finally {
            setLoading(false);
        }
    };

    const fetchForumMembers = async () => {
        try {
            const response = await api.get(`forums/${forum.id}/members/`);
            console.log('Forum members API response:', response.data); // DEBUG LOG
            const members = response.data.map(member => ({
                id: String(member.user_id),  // Keep id as string (UUID or string id)
                first_name: member.first_name,
                last_name: member.last_name,
                email: member.user_email,
                role: member.role,
            }));
            setForumMembers(members);
        } catch (err) {
            console.error("Failed to fetch forum members", err);
        }
    };

    const fetchForumWallet = async () => {
        try {
            const response = await api.get(`payments/forums/${forum.id}/wallet/`);
            setForumWalletBalance(response.data.balance || 0);
        } catch (err) {
            console.error("Failed to fetch forum wallet", err);
        }
    };

    const fetchDisbursementDetails = async (disbursementId) => {
        setDetailsLoading(true);
        try {
            const response = await api.get(`payments/forums/${forum.id}/disbursements/${disbursementId}/`);
            setDisbursementDetails(response.data);
        } catch (err) {
            console.error("Failed to fetch disbursement details", err);
            setError("Failed to load disbursement details");
        } finally {
            setDetailsLoading(false);
        }
    };

    const executeDisbursement = async (disbursementId) => {
        try {
            setError("");
            const response = await api.post(`payments/forums/${forum.id}/disbursements/${disbursementId}/execute/`);
            setSuccessMessage("Disbursement executed successfully!");
            fetchDisbursements();
            fetchForumWallet(); // Refresh wallet balance
            if (selectedDisbursement?.id === disbursementId) {
                fetchDisbursementDetails(disbursementId);
            }
        } catch (err) {
            setError(err.response?.data?.error || "Failed to execute disbursement");
        }
    };

    const handleFormChange = (field, value) => {
        setDisbursementForm(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const addCategory = () => {
        setDisbursementForm(prev => ({
            ...prev,
            categories: [
                ...prev.categories,
                { category_name: "", amount: "", member_ids: [] }
            ]
        }));
    };

    const updateCategory = (idx, field, value) => {
        setDisbursementForm(prev => {
            const updated = [...prev.categories];
            updated[idx] = { ...updated[idx], [field]: value };
            return { ...prev, categories: updated };
        });
    };

    const removeCategory = (idx) => {
        setDisbursementForm(prev => ({
            ...prev,
            categories: prev.categories.filter((_, i) => i !== idx)
        }));
    };

    const toggleCategoryMember = (categoryIdx, memberId) => {
        const memberIdStr = String(memberId); // Ensure it's a string
        console.log('toggleCategoryMember called with categoryIdx:', categoryIdx, 'memberId:', memberIdStr);
        setDisbursementForm(prev => {
            const updated = [...prev.categories];
            const currentMembers = (updated[categoryIdx].member_ids || []).map(id => String(id)); // Ensure all are strings
            console.log('currentMembers:', currentMembers);

            if (currentMembers.includes(memberIdStr)) {
                const newMembers = currentMembers.filter(id => id !== memberIdStr);
                updated[categoryIdx] = { ...updated[categoryIdx], member_ids: newMembers };
                console.log('Removed member');
            } else {
                // Check if member is already in another category
                let alreadyAssigned = false;
                for (let i = 0; i < updated.length; i++) {
                    if (i !== categoryIdx) {
                        const categoryMembers = (updated[i].member_ids || []).map(id => String(id));
                        if (categoryMembers.includes(memberIdStr)) {
                            alreadyAssigned = true;
                            break;
                        }
                    }
                }
                if (!alreadyAssigned) {
                    const newMembers = [...currentMembers, memberIdStr];
                    updated[categoryIdx] = { ...updated[categoryIdx], member_ids: newMembers };
                    console.log('Added member to category. New members:', updated[categoryIdx].member_ids);
                } else {
                    console.log('Member already assigned to another category');
                }
            }
            return { ...prev, categories: updated };
        });
    };

    // Add member to category (used by dropdown selection)
    const addCategoryMember = (categoryIdx, memberId) => {
        const memberIdStr = String(memberId);
        console.log('addCategoryMember called for category', categoryIdx, memberIdStr);
        setDisbursementForm(prev => {
            const updated = [...prev.categories];
            const currentMembers = (updated[categoryIdx].member_ids || []).map(id => String(id));

            // If already in this category, do nothing
            if (currentMembers.includes(memberIdStr)) {
                return prev;
            }

            // Check if member is assigned elsewhere
            for (let i = 0; i < updated.length; i++) {
                if (i !== categoryIdx) {
                    const catMembers = (updated[i].member_ids || []).map(id => String(id));
                    if (catMembers.includes(memberIdStr)) {
                        console.log('Member already in another category, not adding');
                        return prev;
                    }
                }
            }

            const newMembers = [...currentMembers, memberIdStr];
            updated[categoryIdx] = { ...updated[categoryIdx], member_ids: newMembers };
            console.log('Member added. New members:', updated[categoryIdx].member_ids);
            return { ...prev, categories: updated };
        });
    };

    // Remove member from category (explicit remove handler)
    const removeCategoryMember = (categoryIdx, memberId) => {
        const memberIdStr = String(memberId);
        console.log('removeCategoryMember called for category', categoryIdx, memberIdStr);
        setDisbursementForm(prev => {
            const updated = [...prev.categories];
            const currentMembers = (updated[categoryIdx].member_ids || []).map(id => String(id));
            if (!currentMembers.includes(memberIdStr)) return prev;
            const newMembers = currentMembers.filter(id => id !== memberIdStr);
            updated[categoryIdx] = { ...updated[categoryIdx], member_ids: newMembers };
            console.log('Member removed. New members:', updated[categoryIdx].member_ids);
            return { ...prev, categories: updated };
        });
    };

    const isMemberInCategory = (categoryIdx, memberId) => {
        const memberIdStr = String(memberId);
        const categoryMembers = (disbursementForm.categories[categoryIdx]?.member_ids || []).map(id => String(id));
        return categoryMembers.includes(memberIdStr);
    };

    const isMemberInAnyCategory = (memberId) => {
        const memberIdStr = String(memberId);
        return disbursementForm.categories.some(cat =>
            (cat.member_ids || []).map(id => String(id)).includes(memberIdStr)
        );
    };

    const toggleMemberSelection = (memberId) => {
        const id = String(memberId);
        setDisbursementForm(prev => {
            const ids = prev.selected_member_ids.includes(id)
                ? prev.selected_member_ids.filter(i => i !== id)
                : [...prev.selected_member_ids, id];
            // Force new array reference for React
            return { ...prev, selected_member_ids: [...ids] };
        });
    };

    const removeSelectedMember = (memberId) => {
        console.log('Remove button clicked for member:', memberId);
        // keep id as string (UUIDs) and toggle selection
        const id = String(memberId);
        toggleMemberSelection(id);
    };

    const handleCreateDisbursement = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        if (!disbursementForm.title) {
            setError("Disbursement title is required");
            return;
        }

        if (!disbursementForm.disbursement_date) {
            setError("Disbursement date is required");
            return;
        }

        if (disbursementForm.type === "PAY_ALL") {
            if (disbursementForm.categories.length === 0) {
                setError("At least one category is required");
                return;
            }
            // Validate each category
            for (let cat of disbursementForm.categories) {
                if (!cat.category_name || !cat.amount || cat.member_ids.length === 0) {
                    setError("All categories must have name, amount, and members");
                    return;
                }
            }
        } else if (disbursementForm.type === "PAY_SELECTED") {
            if (!disbursementForm.amount) {
                setError("Amount is required for selected members");
                return;
            }
            if (disbursementForm.selected_member_ids.length === 0) {
                setError("At least one member must be selected");
                return;
            }
        } else if (disbursementForm.type === "PAY_TO_ALL") {
            if (!disbursementForm.amount) {
                setError("Amount per member is required");
                return;
            }
            if (forumMembers.length === 0) {
                setError("No members available in this forum");
                return;
            }
        }

        try {
            const payload = {
                title: disbursementForm.title,
                type: disbursementForm.type,
                disbursement_date: disbursementForm.disbursement_date,
            };

            if (disbursementForm.type === "PAY_ALL") {
                payload.categories = disbursementForm.categories;
            } else if (disbursementForm.type === "PAY_SELECTED") {
                payload.selected_member_ids = disbursementForm.selected_member_ids;
                payload.amount = parseFloat(disbursementForm.amount);
            } else if (disbursementForm.type === "PAY_TO_ALL") {
                payload.amount = parseFloat(disbursementForm.amount);
            }

            const response = await api.post(`payments/forums/${forum.id}/disbursements/create/`, payload);
            const disbursementId = response.data.id;

            setSuccessMessage("Disbursement created! Executing now...");
            setDisbursementForm({
                title: "",
                type: "PAY_ALL",
                disbursement_date: "",
                categories: [],
                selected_member_ids: [],
                amount: "",
            });
            setShowCreateDisbursement(false);

            // Auto-execute the disbursement
            setTimeout(() => {
                executeDisbursement(disbursementId);
            }, 500);

            fetchDisbursements();
        } catch (err) {
            setError(err.response?.data?.error || "Failed to create disbursement");
        }
    };

    if (!isAdmin) {
        return (
            <div className="p-6">
                <h2 className="text-2xl font-bold text-primary mb-6">💰 My Disbursements</h2>
                {memberDisbLoading ? (
                    <p className="text-gray-500 text-center py-6">Loading...</p>
                ) : myDisbursements.length === 0 ? (
                    <p className="text-gray-500 text-center py-6">No disbursements received yet.</p>
                ) : (
                    <div className="space-y-3">
                        {myDisbursements.map((disb) => (
                            <div key={disb.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-gray-900">{disb.title}</p>
                                        <p className="text-sm text-gray-600">From forum</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-primary">₦{parseFloat(disb.amount_received).toFixed(2)}</p>
                                        <p className="text-xs text-gray-600">
                                            {disb.received_date ? new Date(disb.received_date).toLocaleDateString() : "Pending"}
                                        </p>
                                        <p className="text-xs font-medium text-green-700 mt-1">✓ {disb.status}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl">
            <h2 className="text-2xl font-bold text-primary mb-6">⚙️ Disbursement Management</h2>

            <NotificationMessageBar forumId={forum?.id} tab="disbursements" />

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

            {/* Forum Wallet Info */}
            {forumWalletBalance !== null && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-primary">
                        Forum Wallet Balance: <span className="text-lg font-bold">₦{parseFloat(forumWalletBalance).toFixed(2)}</span>
                    </p>
                </div>
            )}

            {/* Create Disbursement Section */}
            <div className="mb-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-primary">Create Disbursement</h3>
                    <button
                        onClick={() => setShowCreateDisbursement(!showCreateDisbursement)}
                        className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-90 transition"
                    >
                        {showCreateDisbursement ? "Cancel" : "+ Create Disbursement"}
                    </button>
                </div>

                {showCreateDisbursement && (
                    <form onSubmit={handleCreateDisbursement} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Title *</label>
                                <input
                                    type="text"
                                    value={disbursementForm.title}
                                    onChange={(e) => handleFormChange("title", e.target.value)}
                                    placeholder="e.g., Monthly Allowance"
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Date *</label>
                                <input
                                    type="date"
                                    value={disbursementForm.disbursement_date}
                                    onChange={(e) => handleFormChange("disbursement_date", e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Pay Mode *</label>
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="PAY_ALL"
                                        checked={disbursementForm.type === "PAY_ALL"}
                                        onChange={(e) => handleFormChange("type", e.target.value)}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">Pay to All (with Categories)</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="PAY_SELECTED"
                                        checked={disbursementForm.type === "PAY_SELECTED"}
                                        onChange={(e) => handleFormChange("type", e.target.value)}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">Pay to Selected Members</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="PAY_TO_ALL"
                                        checked={disbursementForm.type === "PAY_TO_ALL"}
                                        onChange={(e) => handleFormChange("type", e.target.value)}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">Pay to All Members (Fixed Amount)</span>
                                </label>
                            </div>
                        </div>

                        {/* PAY_ALL: Categories with Member Dropdowns */}
                        {disbursementForm.type === "PAY_ALL" && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-sm font-medium">Categories *</label>
                                    <button
                                        type="button"
                                        onClick={addCategory}
                                        className="text-xs bg-primary text-white px-2 py-1 rounded"
                                    >
                                        + Add Category
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {disbursementForm.categories.map((cat, idx) => (
                                        <div key={idx} className="border rounded-lg p-4 bg-white">
                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                <input
                                                    type="text"
                                                    placeholder="Category name"
                                                    value={cat.category_name}
                                                    onChange={(e) => updateCategory(idx, "category_name", e.target.value)}
                                                    className="border rounded px-2 py-1 text-sm"
                                                />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Amount"
                                                    value={cat.amount}
                                                    onChange={(e) => updateCategory(idx, "amount", e.target.value)}
                                                    className="border rounded px-2 py-1 text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeCategory(idx)}
                                                    className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded"
                                                >
                                                    Remove
                                                </button>
                                            </div>

                                            <label className="block text-xs font-medium mb-2">
                                                Select Members for this Category:
                                            </label>
                                            <div className="space-y-2">
                                                {/* Members already added to this category */}
                                                {cat.member_ids && cat.member_ids.length > 0 && (
                                                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                                                        <p className="text-xs font-medium text-blue-700 mb-1">Selected Members ({(cat.member_ids || []).length}):</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(cat.member_ids || []).map((memberId) => {
                                                                const memberIdStr = String(memberId);
                                                                const member = forumMembers.find(m => String(m.id) === memberIdStr);
                                                                return member ? (
                                                                    <span key={memberId} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                                                        {member.first_name} {member.last_name}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeCategoryMember(idx, memberId)}
                                                                            className="ml-1 font-bold hover:text-red-600"
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    </span>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Dropdown to add more members (show members not in this category) */}
                                                <select
                                                    value=""
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            const selectedMemberId = e.target.value;
                                                            console.log('Dropdown changed for category', idx, 'selected member:', selectedMemberId);
                                                            addCategoryMember(idx, selectedMemberId);
                                                            // Reset the dropdown
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                    className="w-full border rounded px-3 py-2 text-sm bg-white"
                                                >
                                                    <option value="">+ Add members to disburse...</option>
                                                    {forumMembers.map((member) => {
                                                        const isSelectedInCategory = isMemberInCategory(idx, member.id);
                                                        const isSelectedInAnyCategory = isMemberInAnyCategory(member.id);
                                                        const isDisabled = isSelectedInAnyCategory && !isSelectedInCategory;
                                                        return (
                                                            <option
                                                                key={member.id}
                                                                value={member.id}
                                                                disabled={isDisabled}
                                                                style={isSelectedInCategory ? { backgroundColor: '#d1fae5', color: '#047857', fontWeight: 'bold' } : isDisabled ? { backgroundColor: '#f3f4f6', color: '#9ca3af' } : {}}
                                                            >
                                                                {isSelectedInCategory ? '✓ ' : ''}{isDisabled ? '(assigned to another category) ' : ''}{member.first_name} {member.last_name}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* PAY_SELECTED: Members + Amount */}
                        {disbursementForm.type === "PAY_SELECTED" && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Amount per Member *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={disbursementForm.amount}
                                        onChange={(e) => handleFormChange("amount", e.target.value)}
                                        placeholder="0.00"
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Select Members *</label>
                                    <div className="space-y-2">
                                        {/* Display selected members as tags */}
                                        {disbursementForm.selected_member_ids.length > 0 && (
                                            <div className="bg-green-50 border border-green-200 rounded p-2">
                                                <p className="text-xs font-medium text-green-700 mb-1">Selected Members ({disbursementForm.selected_member_ids.length}):</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {disbursementForm.selected_member_ids.map((memberId) => {
                                                        const member = forumMembers.find(m => m.id === memberId);
                                                        return member ? (
                                                            <span key={memberId} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center gap-1 border border-green-400">
                                                                {member.first_name} {member.last_name}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeSelectedMember(memberId)}
                                                                    className="ml-1 font-bold text-xl text-red-600 hover:text-red-800"
                                                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", lineHeight: "1" }}
                                                                    aria-label="Remove member"
                                                                >
                                                                    ×
                                                                </button>
                                                            </span>
                                                        ) : null;
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Multi-select dropdown to add members */}
                                        <select
                                            value=""
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    toggleMemberSelection(e.target.value);
                                                }
                                            }}
                                            className="w-full border rounded px-3 py-2 text-sm bg-white"
                                        >
                                            <option value="">+ Add members to disburse...</option>
                                            {forumMembers.map((member) => {
                                                const isSelected = disbursementForm.selected_member_ids.includes(member.id);
                                                return (
                                                    <option
                                                        key={member.id}
                                                        value={member.id}
                                                        style={isSelected ? { backgroundColor: '#d1fae5', color: '#047857', fontWeight: 'bold' } : {}}
                                                    >
                                                        {isSelected ? '✓ ' : ''}{member.first_name} {member.last_name}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PAY_TO_ALL: Fixed Amount for All Members */}
                        {disbursementForm.type === "PAY_TO_ALL" && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Amount per Member *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={disbursementForm.amount}
                                        onChange={(e) => handleFormChange("amount", e.target.value)}
                                        placeholder="0.00"
                                        className="w-full border rounded px-3 py-2"
                                    />
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm font-medium text-blue-900">
                                        Total Members: <span className="font-bold text-lg">{forumMembers.length}</span>
                                    </p>
                                    {disbursementForm.amount && (
                                        <p className="text-sm font-medium text-blue-900 mt-2">
                                            Total Amount to Disburse: <span className="font-bold text-lg">₦{(parseFloat(disbursementForm.amount) * forumMembers.length).toFixed(2)}</span>
                                        </p>
                                    )}
                                    <p className="text-xs text-blue-700 mt-3">
                                        ℹ️ This will disburse the specified amount to ALL {forumMembers.length} forum members.
                                    </p>
                                </div>
                            </div>
                        )}
                        <button
                            type="submit"
                            className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-opacity-90 transition"
                        >
                            Create Disbursement
                        </button>
                    </form>
                )}
            </div>

            {/* Disbursements List */}
            {!selectedDisbursement ? (
                <div>
                    <h3 className="text-lg font-semibold text-primary mb-4">Recent Disbursements</h3>
                    {loading ? (
                        <p className="text-gray-500 text-center py-6">Loading...</p>
                    ) : disbursements.length === 0 ? (
                        <p className="text-gray-500 text-center py-6">No disbursements created yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {disbursements.map((disb) => {
                                const statusColor = disb.status === "SUCCESSFUL" ? "bg-green-100 border-green-300 text-green-800" :
                                    disb.status === "FAILED" ? "bg-red-100 border-red-300 text-red-800" :
                                        "bg-yellow-100 border-yellow-300 text-yellow-800";
                                return (
                                    <div
                                        key={disb.id}
                                        onClick={() => {
                                            setSelectedDisbursement(disb);
                                            fetchDisbursementDetails(disb.id);
                                        }}
                                        className={`border rounded-lg p-4 bg-white hover:shadow-md transition cursor-pointer ${statusColor}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold">{disb.title}</p>
                                                <p className="text-sm text-gray-600">{disb.type}</p>
                                                {disb.categories.length > 0 && (
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        {disb.categories.length} categories
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusColor}`}>
                                                    {disb.status}
                                                </span>
                                                <p className="text-xs text-gray-600 mt-1">{new Date(disb.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <button
                        onClick={() => {
                            setSelectedDisbursement(null);
                            setDisbursementDetails(null);
                        }}
                        className="mb-4 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition"
                    >
                        ← Back to Disbursements
                    </button>

                    {detailsLoading ? (
                        <p className="text-gray-500 text-center py-6">Loading details...</p>
                    ) : disbursementDetails ? (
                        <div className="bg-white border rounded-lg p-6 space-y-4">
                            <div className="pb-4 border-b">
                                <h2 className="text-2xl font-bold text-primary mb-2">{disbursementDetails.title}</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-600">Status</p>
                                        <span className={`inline-block px-2 py-1 rounded text-sm font-semibold ${disbursementDetails.status === "SUCCESSFUL" ? "bg-green-100 text-green-800" :
                                                disbursementDetails.status === "FAILED" ? "bg-red-100 text-red-800" :
                                                    "bg-yellow-100 text-yellow-800"
                                            }`}>
                                            {disbursementDetails.status}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600">Type</p>
                                        <p className="font-medium">{disbursementDetails.type}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600">Created By</p>
                                        <p className="font-medium">{disbursementDetails.created_by.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600">Date</p>
                                        <p className="font-medium">{new Date(disbursementDetails.disbursement_date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            {disbursementDetails.status === "PENDING" && (
                                <button
                                    onClick={() => executeDisbursement(disbursementDetails.id)}
                                    className="w-full bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600 transition"
                                >
                                    Execute Disbursement
                                </button>
                            )}

                            <div>
                                <h3 className="text-lg font-semibold text-primary mb-3">Recipients ({disbursementDetails.transactions.length})</h3>
                                {disbursementDetails.transactions.length > 0 ? (
                                    <div className="space-y-2">
                                        {disbursementDetails.transactions.map((tx, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                                                <div>
                                                    <p className="font-medium text-gray-900">{tx.user_name}</p>
                                                    <p className="text-xs text-gray-600">{new Date(tx.created_at).toLocaleString()}</p>
                                                </div>
                                                <p className="font-semibold text-primary">₦{parseFloat(tx.amount).toFixed(2)}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-4">No recipients yet</p>
                                )}
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-blue-900">
                                    Total Disbursed: <span className="text-lg font-bold">₦{parseFloat(disbursementDetails.total_amount_disbursed).toFixed(2)}</span>
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-6">Failed to load details</p>
                    )}
                </div>
            )}

            {/* ADMIN: My Disbursements Received */}
            {isAdmin && (
                <div className="mt-8 pt-8 border-t border-gray-300">
                    <h3 className="text-lg font-semibold text-primary mb-4">💰 My Disbursements Received</h3>
                    {memberDisbLoading ? (
                        <p className="text-gray-500 text-center py-6">Loading...</p>
                    ) : myDisbursements.length === 0 ? (
                        <p className="text-gray-500 text-center py-6">No disbursements received yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {myDisbursements.map((disb) => (
                                <div key={disb.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-gray-900">{disb.title}</p>
                                            <p className="text-sm text-gray-600">From forum</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-primary">₦{parseFloat(disb.amount_received).toFixed(2)}</p>
                                            <p className="text-xs text-gray-600">
                                                {disb.received_date ? new Date(disb.received_date).toLocaleDateString() : "Pending"}
                                            </p>
                                            <p className="text-xs font-medium text-green-700 mt-1">✓ {disb.status}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
