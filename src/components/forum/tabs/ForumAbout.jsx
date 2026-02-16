import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { useNotifications } from "../../../context/NotificationContext";
import NotificationMessageBar from "../../notifications/NotificationMessageBar";

export default function ForumAbout({ forum, userRole }) {
    const [aboutData, setAboutData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isAdmin = userRole && ["SA", "CP", "VC", "SEC", "FSEC"].includes(userRole);
    const { clearTabNotifications } = useNotifications();

    useEffect(() => {
        fetchAboutData();
        if (forum?.id) {
            clearTabNotifications(forum.id, "about");
        }
    }, [forum?.id, clearTabNotifications]);

    const fetchAboutData = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/forums/${forum.id}/about/`);
            setAboutData(response.data);
            setError(null);
        } catch (err) {
            setError("Failed to load forum information");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-white rounded-lg p-8 text-center">
                    <p className="text-gray-500">Loading forum information...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            <NotificationMessageBar forumId={forum?.id} tab="about" />

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
                    {error}
                </div>
            )}

            {aboutData && (
                <>
                    {/* SECTION 1: FORUM INFORMATION */}
                    <ForumInfoSection
                        forum={aboutData}
                        isAdmin={isAdmin}
                        onDataChange={fetchAboutData}
                    />

                    {/* SECTION 2: DOCUMENTS & UPLOADS */}
                    <ForumDocumentsSection
                        forum={aboutData}
                        isAdmin={isAdmin}
                        onDataChange={fetchAboutData}
                    />

                    {/* SECTION 3: FORUM WALLET */}
                    <ForumWalletSection
                        forum={aboutData}
                        isAdmin={isAdmin}
                        onDataChange={fetchAboutData}
                    />
                </>
            )}
        </div>
    );
}


function ForumInfoSection({ forum, isAdmin, onDataChange }) {
    const [editField, setEditField] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [saving, setSaving] = useState(false);

    const editableFields = [
        { key: "name", label: "Forum Name", type: "text" },
        { key: "slogan", label: "Slogan", type: "text" },
        { key: "motto", label: "Motto", type: "textarea" },
        { key: "description", label: "Description", type: "textarea" },
        { key: "address", label: "Address", type: "text" },
        { key: "email", label: "Email", type: "email" },
        { key: "phone", label: "Phone", type: "tel" },
        { key: "objectives_rules", label: "Objectives & Rules", type: "textarea" },
    ];

    const handleEditStart = (field) => {
        if (!isAdmin) return;
        setEditField(field);
        setEditValues({ [field]: forum[field] || "" });
    };

    const handleSaveField = async (field) => {
        try {
            setSaving(true);
            await api.patch(`/forums/${forum.id}/about/info/`, {
                [field]: editValues[field],
            }, {
                headers: { 'Content-Type': 'application/json' }
            });
            setEditField(null);
            onDataChange();
        } catch (err) {
            console.error("Failed to update field:", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/10 to-blue-50">
                <h2 className="text-2xl font-bold text-primary">📋 Forum Information</h2>
                <p className="text-gray-600 text-sm">Visible to all members</p>
            </div>

            <div className="p-6 space-y-6">
                {/* CONSTANT INFORMATION */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b">
                    <div>
                        <p className="text-sm text-gray-600 font-semibold">Forum ID</p>
                        <p className="text-lg text-gray-900">{forum.forum_id || forum.id.substring(0, 8)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 font-semibold">Verification Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${forum.is_verified
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                            }`}>
                            {forum.is_verified ? "✓ Verified" : "Pending Verification"}
                        </span>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 font-semibold">Date Created</p>
                        <p className="text-gray-900">{new Date(forum.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 font-semibold">Created By</p>
                        <p className="text-gray-900">{forum.created_by_name}</p>
                    </div>
                </div>

                {/* EDITABLE INFORMATION */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-primary">📝 Editable Information</h3>
                    {editableFields.map((field) => (
                        <EditableField
                            key={field.key}
                            field={field}
                            value={forum[field.key]}
                            isEditing={editField === field.key}
                            editValue={editValues[field.key]}
                            isAdmin={isAdmin}
                            saving={saving}
                            onEdit={() => handleEditStart(field.key)}
                            onSave={() => handleSaveField(field.key)}
                            onCancel={() => setEditField(null)}
                            onChangeValue={(val) => setEditValues({ ...editValues, [field.key]: val })}
                        />
                    ))}
                </div>

                {/* SETTINGS SECTION */}
                <ForumSettingsEditor forum={forum} isAdmin={isAdmin} onDataChange={onDataChange} />
            </div>
        </div>
    );
}


function EditableField({
    field,
    value,
    isEditing,
    editValue,
    isAdmin,
    saving,
    onEdit,
    onSave,
    onCancel,
    onChangeValue,
}) {
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">{field.label}</label>
                {isAdmin && !isEditing && (
                    <button
                        onClick={onEdit}
                        className="text-xs text-primary hover:text-blue-900 font-medium"
                    >
                        ✏️ Edit
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-2">
                    {field.type === "textarea" ? (
                        <textarea
                            value={editValue || ""}
                            onChange={(e) => onChangeValue(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            rows="4"
                        />
                    ) : (
                        <input
                            type={field.type}
                            value={editValue || ""}
                            onChange={(e) => onChangeValue(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={onSave}
                            disabled={saving}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-900 disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-gray-700 whitespace-pre-wrap">
                    {value || <span className="text-gray-400">Not set</span>}
                </p>
            )}
        </div>
    );
}


function ForumSettingsEditor({ forum, isAdmin, onDataChange }) {
    const [editMode, setEditMode] = useState(false);
    const [settings, setSettings] = useState(forum.settings || {});
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.patch(`/forums/${forum.id}/about/settings/`, settings);
            setEditMode(false);
            onDataChange();
        } catch (err) {
            console.error("Failed to save settings:", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-primary">⚙️ Forum Settings</h3>
                {isAdmin && !editMode && (
                    <button
                        onClick={() => setEditMode(true)}
                        className="text-xs text-primary hover:text-blue-900 font-medium"
                    >
                        ✏️ Edit Settings
                    </button>
                )}
            </div>

            {editMode ? (
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-semibold text-gray-700">Forum Visibility</label>
                        <select
                            value={settings.visibility || "PUBLIC"}
                            onChange={(e) => setSettings({ ...settings, visibility: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                        >
                            <option value="PUBLIC">Public</option>
                            <option value="PRIVATE">Private</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-gray-700">Join Mode</label>
                        <select
                            value={settings.join_mode || "OPEN"}
                            onChange={(e) => setSettings({ ...settings, join_mode: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                        >
                            <option value="OPEN">Open</option>
                            <option value="REQUEST">Request</option>
                            <option value="INVITE">Invite</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-gray-700">Payment Rules</label>
                        <textarea
                            value={settings.payment_rules || ""}
                            onChange={(e) => setSettings({ ...settings, payment_rules: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                            rows="3"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-gray-700">Rules & Regulations</label>
                        <textarea
                            value={settings.rules_regulations || ""}
                            onChange={(e) => setSettings({ ...settings, rules_regulations: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                            rows="3"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-gray-700">Objectives</label>
                        <textarea
                            value={settings.objectives || ""}
                            onChange={(e) => setSettings({ ...settings, objectives: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                            rows="3"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-900 disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Save Settings"}
                        </button>
                        <button
                            onClick={() => setEditMode(false)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-gray-600 font-semibold">Forum Visibility</p>
                        <p className="text-gray-900">{settings.visibility || "PUBLIC"}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-600 font-semibold">Join Mode</p>
                        <p className="text-gray-900">{settings.join_mode || "OPEN"}</p>
                    </div>
                </div>
            )}
        </div>
    );
}


function ForumDocumentsSection({ forum, isAdmin, onDataChange }) {
    const [documents, setDocuments] = useState(forum.documents || []);
    const [uploading, setUploading] = useState(false);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [uploadData, setUploadData] = useState({
        title: "",
        file: null,
    });

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadData.title || !uploadData.file) {
            alert("Please fill in all fields");
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append("title", uploadData.title);
            formData.append("file", uploadData.file);

            // Detect file type
            const fileExt = uploadData.file.name.split(".").pop().toLowerCase();
            let fileType = "DOCUMENT";
            if (fileExt === "pdf") fileType = "PDF";
            else if (["jpg", "jpeg", "png", "gif"].includes(fileExt)) fileType = "IMAGE";
            formData.append("file_type", fileType);

            await api.post(`/forums/${forum.id}/about/documents/`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setShowUploadForm(false);
            setUploadData({ title: "", file: null });
            onDataChange();
        } catch (err) {
            console.error("Upload failed:", err);
            alert("Failed to upload document");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (docId) => {
        if (!window.confirm("Are you sure you want to delete this document?")) return;

        try {
            await api.delete(`/forums/${forum.id}/about/documents/${docId}/`);
            onDataChange();
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/10 to-blue-50">
                <h2 className="text-2xl font-bold text-primary">📁 Documents & Files</h2>
                <p className="text-gray-600 text-sm">Visible to all members • Downloadable by all</p>
            </div>

            <div className="p-6">
                {isAdmin && (
                    <button
                        onClick={() => setShowUploadForm(!showUploadForm)}
                        className="mb-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-900"
                    >
                        + Upload Document
                    </button>
                )}

                {showUploadForm && isAdmin && (
                    <form onSubmit={handleUpload} className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Document Title"
                                value={uploadData.title}
                                onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <input
                                type="file"
                                onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-900 disabled:opacity-50"
                                >
                                    {uploading ? "Uploading..." : "Upload"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowUploadForm(false)}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {documents.map((doc) => (
                            <DocumentCard
                                key={doc.id}
                                doc={doc}
                                isAdmin={isAdmin}
                                onDelete={() => handleDelete(doc.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-8">No documents uploaded yet</p>
                )}
            </div>
        </div>
    );
}


function DocumentCard({ doc, isAdmin, onDelete }) {
    const getFileIcon = (fileType) => {
        switch (fileType) {
            case "PDF": return "📄";
            case "IMAGE": return "🖼️";
            default: return "📃";
        }
    };

    return (
        <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-lg font-semibold text-gray-900">{getFileIcon(doc.file_type)} {doc.title}</p>
                    <p className="text-xs text-gray-600 mt-1">
                        Uploaded by {doc.uploaded_by_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                </div>
                <div className="flex gap-2">
                    <a
                        href={doc.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-100 text-primary rounded text-xs font-medium hover:bg-blue-200"
                    >
                        View
                    </a>
                    {isAdmin && (
                        <button
                            onClick={onDelete}
                            className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs font-medium hover:bg-red-200"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}


function ForumWalletSection({ forum, isAdmin, onDataChange }) {
    const [walletData, setWalletData] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDepositForm, setShowDepositForm] = useState(false);
    const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
    const [bankAccount, setBankAccount] = useState(null);

    useEffect(() => {
        fetchWalletData();
    }, [forum?.id]);

    const fetchWalletData = async () => {
        try {
            setLoading(true);
            const walletRes = await api.get(`/payments/forums/${forum.id}/wallet/`);
            setWalletData(walletRes.data);

            if (walletRes.data?.transactions) {
                setTransactions(walletRes.data.transactions);
            }

            // Fetch bank account
            try {
                const bankRes = await api.get(`/forums/${forum.id}/about/bank-account/`);
                setBankAccount(bankRes.data);
            } catch {
                // Bank account not configured
            }
        } catch (err) {
            console.error("Failed to load wallet data:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-500">Loading wallet information...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-green-50 to-blue-50">
                <h2 className="text-2xl font-bold text-primary">💰 Forum Wallet</h2>
                <p className="text-gray-600 text-sm">
                    Transaction history visible to all • Balance & actions for admins only
                </p>
            </div>

            <div className="p-6 space-y-6">
                {/* WALLET DETAILS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border-l-4 border-primary pl-4">
                        <p className="text-xs text-gray-600 font-semibold uppercase">Wallet Name</p>
                        <p className="text-xl font-bold text-gray-900">{forum.name} Wallet</p>
                    </div>

                    <div className="border-l-4 border-primary pl-4">
                        <p className="text-xs text-gray-600 font-semibold uppercase">Wallet Number</p>
                        <p className="text-xl font-bold font-mono text-gray-900">
                            {walletData?.wallet_number || walletData?.number || walletData?.id?.substring(0, 12) || "N/A"}
                        </p>
                    </div>

                    {isAdmin && (
                        <div className="border-l-4 border-green-500 pl-4">
                            <p className="text-xs text-gray-600 font-semibold uppercase">Current Balance</p>
                            <p className="text-2xl font-bold text-green-600">
                                ₦{parseFloat(walletData?.balance || 0).toLocaleString("en-NG", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </p>
                        </div>
                    )}

                    <div className="border-l-4 border-blue-500 pl-4">
                        <p className="text-xs text-gray-600 font-semibold uppercase">Wallet Type</p>
                        <p className="text-lg font-semibold text-gray-900">Forum Wallet</p>
                    </div>
                </div>

                {/* ADMIN ACTIONS */}
                {isAdmin && (
                    <div className="border-t pt-6">
                        <h3 className="font-semibold text-primary mb-4">💳 Wallet Actions</h3>
                        <div className="flex gap-3 flex-wrap">
                            <button
                                onClick={() => setShowDepositForm(!showDepositForm)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                + Deposit Funds
                            </button>
                            <button
                                onClick={() => setShowWithdrawalForm(!showWithdrawalForm)}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                                disabled={!bankAccount}
                            >
                                💸 Withdraw Funds
                            </button>
                        </div>

                        {showDepositForm && <DepositForm forum={forum} onSuccess={fetchWalletData} />}
                        {showWithdrawalForm && (
                            <WithdrawalForm
                                forum={forum}
                                bankAccount={bankAccount}
                                onSuccess={fetchWalletData}
                            />
                        )}

                        {/* BANK ACCOUNT SECTION */}
                        <div className="mt-6 border-t pt-6">
                            <BankAccountSection
                                forum={forum}
                                bankAccount={bankAccount}
                                onSave={fetchWalletData}
                            />
                        </div>
                    </div>
                )}

                {/* TRANSACTION HISTORY */}
                <div className="border-t pt-6">
                    <h3 className="font-semibold text-primary mb-4">📊 Transaction History</h3>
                    {transactions.length > 0 ? (
                        <TransactionHistory transactions={transactions} />
                    ) : (
                        <p className="text-gray-500 text-center py-8">No transactions yet</p>
                    )}
                </div>
            </div>
        </div>
    );
}


function DepositForm({ forum, onSuccess }) {
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("CARD");
    const [saving, setSaving] = useState(false);

    const handleDeposit = async (e) => {
        e.preventDefault();
        if (!amount) {
            alert("Please enter an amount");
            return;
        }

        try {
            setSaving(true);
            // TODO: Implement actual deposit logic with payment gateway
            alert("Deposit feature to be integrated with payment gateway");
        } catch (err) {
            console.error("Deposit failed:", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleDeposit} className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="space-y-3">
                <div>
                    <label className="text-sm font-semibold text-gray-700">Amount (₦)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                        step="0.01"
                    />
                </div>

                <div>
                    <label className="text-sm font-semibold text-gray-700">Deposit Method</label>
                    <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    >
                        <option value="CARD">Card</option>
                        <option value="BANK">Bank Transfer</option>
                        <option value="OTHER">Other</option>
                    </select>
                </div>

                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        {saving ? "Processing..." : "Deposit"}
                    </button>
                </div>
            </div>
        </form>
    );
}


function WithdrawalForm({ forum, bankAccount, onSuccess }) {
    const [amount, setAmount] = useState("");
    const [saving, setSaving] = useState(false);

    const handleWithdrawal = async (e) => {
        e.preventDefault();
        if (!amount) {
            alert("Please enter an amount");
            return;
        }

        if (!bankAccount) {
            alert("Please configure a bank account first");
            return;
        }

        try {
            setSaving(true);
            // TODO: Implement actual withdrawal logic
            alert(
                `Withdrawal of ₦${amount} to ${bankAccount.account_holder_name}\n` +
                `Account: ${bankAccount.account_number}`
            );
        } catch (err) {
            console.error("Withdrawal failed:", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleWithdrawal} className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="space-y-3">
                <div>
                    <label className="text-sm font-semibold text-gray-700">Withdrawal Amount (₦)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                        step="0.01"
                    />
                </div>

                {bankAccount && (
                    <div className="p-3 bg-white rounded border border-orange-200 text-sm">
                        <p className="font-semibold">Withdrawal will be sent to:</p>
                        <p>{bankAccount.account_holder_name}</p>
                        <p className="text-gray-600">{bankAccount.account_number} • {bankAccount.bank_name}</p>
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={saving || !bankAccount}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                    >
                        {saving ? "Processing..." : "Request Withdrawal"}
                    </button>
                </div>
            </div>
        </form>
    );
}


function BankAccountSection({ forum, bankAccount, onSave }) {
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState(
        bankAccount || {
            account_holder_name: forum.name,
            account_number: "",
            bank_name: "",
            bank_code: "",
        }
    );
    const [saving, setSaving] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await api.post(`/forums/${forum.id}/about/bank-account/`, formData);
            setEditMode(false);
            onSave();
        } catch (err) {
            console.error("Failed to save bank account:", err);
            alert("Bank account holder name must match forum name");
        } finally {
            setSaving(false);
        }
    };

    if (editMode) {
        return (
            <form onSubmit={handleSave} className="space-y-3">
                <h4 className="font-semibold text-primary">🏦 Bank Account Configuration</h4>

                <div>
                    <label className="text-sm font-semibold text-gray-700">Account Holder Name</label>
                    <input
                        type="text"
                        value={formData.account_holder_name}
                        onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                        placeholder={forum.name}
                    />
                    <p className="text-xs text-gray-600 mt-1">Must match forum name</p>
                </div>

                <div>
                    <label className="text-sm font-semibold text-gray-700">Account Number</label>
                    <input
                        type="text"
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    />
                </div>

                <div>
                    <label className="text-sm font-semibold text-gray-700">Bank Name</label>
                    <input
                        type="text"
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    />
                </div>

                <div>
                    <label className="text-sm font-semibold text-gray-700">Bank Code</label>
                    <input
                        type="text"
                        value={formData.bank_code}
                        onChange={(e) => setFormData({ ...formData, bank_code: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-900 disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Bank Account"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setEditMode(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        );
    }

    return (
        <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-primary">🏦 Bank Account</h4>
                <button
                    onClick={() => setEditMode(true)}
                    className="text-xs text-primary font-medium hover:text-blue-900"
                >
                    ✏️ Edit
                </button>
            </div>

            {bankAccount ? (
                <div className="space-y-2 text-sm">
                    <p>
                        <span className="font-semibold">Account Holder:</span> {bankAccount.account_holder_name}
                    </p>
                    <p>
                        <span className="font-semibold">Account Number:</span> {bankAccount.account_number}
                    </p>
                    <p>
                        <span className="font-semibold">Bank:</span> {bankAccount.bank_name}
                    </p>
                    <p className="text-xs text-green-600">✓ Configured</p>
                </div>
            ) : (
                <p className="text-gray-500 text-sm">No bank account configured. Add one to enable withdrawals.</p>
            )}
        </div>
    );
}


function TransactionHistory({ transactions }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                    <tr>
                        <th className="px-4 py-3 text-left font-semibold">Date</th>
                        <th className="px-4 py-3 text-left font-semibold">Type</th>
                        <th className="px-4 py-3 text-left font-semibold">Amount</th>
                        <th className="px-4 py-3 text-left font-semibold">Description</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((tx) => (
                        <tr key={tx.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">{new Date(tx.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3 font-medium">{tx.type || tx.reason}</td>
                            <td className="px-4 py-3">₦{parseFloat(tx.amount).toLocaleString("en-NG")}</td>
                            <td className="px-4 py-3 text-gray-600 truncate">{tx.reference || tx.reason || "N/A"}</td>
                            <td className="px-4 py-3">
                                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                    Completed
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
