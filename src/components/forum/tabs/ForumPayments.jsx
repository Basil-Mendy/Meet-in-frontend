import { useState, useEffect } from "react";
import api from "../../../api/axios";
import { useNotifications } from "../../../context/NotificationContext";
import NotificationMessageBar from "../../notifications/NotificationMessageBar";

export default function ForumPayments({ forum, userRole }) {
    const { clearTabNotifications } = useNotifications();
    // Payments state
    const [memberPayments, setMemberPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Admin section state
    const [showCreatePayment, setShowCreatePayment] = useState(false);
    const [allMemberPayments, setAllMemberPayments] = useState([]);
    const [paymentMatrix, setPaymentMatrix] = useState(null);
    const [adminLoading, setAdminLoading] = useState(false);

    // Payment creation form state
    const [paymentForm, setPaymentForm] = useState({
        title: "",
        type: "DUES",
        amount: "",
        min_amount: "",
        max_amount: "",
        deadline: "",
        categories: {}, // { category: amount }
    });

    const [contributionAmounts, setContributionAmounts] = useState({});

    const isAdmin = userRole && ["SA", "CP", "VC", "SEC", "FSEC"].includes(userRole);

    // Define levy categories
    const LEVY_CATEGORIES = [
        { key: "male", label: "Male" },
        { key: "female", label: "Female" },
        { key: "below_18", label: "Below 18" },
        { key: "age_18_plus", label: "18 and above" },
        { key: "youth", label: "Youth" },
        { key: "mothers", label: "Mothers" },
        { key: "fathers", label: "Fathers" },
        { key: "junior", label: "Junior" },
        { key: "senior", label: "Senior" },
    ];

    // Fetch member payments for current user
    useEffect(() => {
        if (forum?.id) {
            fetchMemberPayments();
            if (isAdmin) {
                fetchAllMemberPayments();
            }
            // Clear payments notifications when entering this tab
            clearTabNotifications(forum.id, "payments");
        }
    }, [forum?.id, isAdmin, clearTabNotifications]);

    const fetchMemberPayments = async () => {
        setLoading(true);
        try {
            const response = await api.get(`payments/forums/${forum.id}/payments/`);
            setMemberPayments(response.data);
        } catch (err) {
            console.error("Failed to fetch member payments", err);
            setError("Failed to load payments");
        } finally {
            setLoading(false);
        }
    };

    const handleContributionChange = (memberPaymentId, value) => {
        setContributionAmounts(prev => ({
            ...prev,
            [memberPaymentId]: value,
        }));
    };

    const fetchAllMemberPayments = async () => {
        setAdminLoading(true);
        try {
            const response = await api.get(`payments/forums/${forum.id}/payments/admin/`);
            setAllMemberPayments(response.data);
            // Also fetch matrix view for better visualization
            const matrixResponse = await api.get(`payments/forums/${forum.id}/payments/matrix/`);
            setPaymentMatrix(matrixResponse.data);
        } catch (err) {
            console.error("Failed to fetch all member payments", err);
        } finally {
            setAdminLoading(false);
        }
    };

    const handlePaymentFormChange = (field, value) => {
        setPaymentForm(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleCategoryAmountChange = (category, amount) => {
        setPaymentForm(prev => ({
            ...prev,
            categories: {
                ...prev.categories,
                [category]: amount || "",
            },
        }));
    };

    const handleCreatePayment = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        if (!paymentForm.title) {
            setError("Payment title is required");
            return;
        }

        if (paymentForm.type === "DUES" && !paymentForm.amount) {
            setError("Amount is required for Dues");
            return;
        }

        if (paymentForm.type === "CONTRIBUTION" && !paymentForm.min_amount) {
            setError("Minimum amount is required for Contribution");
            return;
        }

        if (paymentForm.type === "LEVY" && Object.keys(paymentForm.categories).length === 0) {
            setError("At least one category amount is required for Levy");
            return;
        }

        try {
            const payload = {
                title: paymentForm.title,
                type: paymentForm.type,
                deadline: paymentForm.deadline || null,
            };

            // Add type-specific fields
            if (paymentForm.type === "DUES") {
                payload.amount = parseFloat(paymentForm.amount);
            } else if (paymentForm.type === "CONTRIBUTION") {
                payload.min_amount = parseFloat(paymentForm.min_amount);
                payload.max_amount = paymentForm.max_amount ? parseFloat(paymentForm.max_amount) : null;
            } else if (paymentForm.type === "LEVY") {
                // Categories will be added separately
                payload.categories = Object.entries(paymentForm.categories)
                    .filter(([_, amount]) => amount)
                    .map(([category, amount]) => ({
                        category,
                        amount: parseFloat(amount),
                        is_active: true,
                    }));
            }

            const response = await api.post(`payments/forums/${forum.id}/payments/create/`, payload);
            setSuccessMessage("Payment created successfully!");
            setPaymentForm({
                title: "",
                type: "DUES",
                amount: "",
                min_amount: "",
                max_amount: "",
                deadline: "",
                categories: {},
            });
            setShowCreatePayment(false);
            fetchMemberPayments();
            fetchAllMemberPayments();
        } catch (err) {
            setError(err.response?.data?.error || "Failed to create payment");
        }
    };

    const handlePayPayment = async (memberPaymentId, amount) => {
        if (!window.confirm("Are you sure you want to pay this?")) {
            return;
        }

        try {
            setError("");
            setSuccessMessage("");
            const payload = amount !== undefined ? { amount: parseFloat(amount) } : {};
            const response = await api.post(`payments/member-payments/${memberPaymentId}/pay/`, payload);
            setSuccessMessage(response.data.message);
            fetchMemberPayments();
        } catch (err) {
            setError(err.response?.data?.error || "Payment failed");
        }
    };

    // Separate paid and pending payments
    const paidPayments = memberPayments.filter(p => p.status === "PAID");
    const pendingPayments = memberPayments.filter(p => p.status === "PENDING");

    return (
        <div className="p-6 max-w-6xl">
            <h2 className="text-2xl font-bold text-primary mb-6">Payments</h2>

            <NotificationMessageBar forumId={forum?.id} tab="payments" />

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

            {/* ADMIN SECTION: Create Payment */}
            {isAdmin && (
                <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-primary">Create Payment</h3>
                        <button
                            onClick={() => setShowCreatePayment(!showCreatePayment)}
                            className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-90 transition"
                        >
                            {showCreatePayment ? "Cancel" : "+ Create Payment"}
                        </button>
                    </div>

                    {showCreatePayment && (
                        <form onSubmit={handleCreatePayment} className="space-y-4">
                            {/* Payment Title */}
                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Payment Title *
                                </label>
                                <input
                                    type="text"
                                    value={paymentForm.title}
                                    onChange={(e) => handlePaymentFormChange("title", e.target.value)}
                                    placeholder="e.g., Monthly Dues"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>

                            {/* Payment Type */}
                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Payment Type *
                                </label>
                                <select
                                    value={paymentForm.type}
                                    onChange={(e) => handlePaymentFormChange("type", e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="DUES">Dues (Fixed amount)</option>
                                    <option value="CONTRIBUTION">Contribution (Flexible amount)</option>
                                    <option value="LEVY">Levy (Category-based)</option>
                                </select>
                            </div>

                            {/* DUES: Amount */}
                            {paymentForm.type === "DUES" && (
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Amount *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={paymentForm.amount}
                                        onChange={(e) => handlePaymentFormChange("amount", e.target.value)}
                                        placeholder="0.00"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                            )}

                            {/* CONTRIBUTION: Min & Max */}
                            {paymentForm.type === "CONTRIBUTION" && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-2">
                                            Minimum Amount *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={paymentForm.min_amount}
                                            onChange={(e) => handlePaymentFormChange("min_amount", e.target.value)}
                                            placeholder="0.00"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-2">
                                            Maximum Amount (Optional)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={paymentForm.max_amount}
                                            onChange={(e) => handlePaymentFormChange("max_amount", e.target.value)}
                                            placeholder="0.00"
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* LEVY: Categories */}
                            {paymentForm.type === "LEVY" && (
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Category Amounts *
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {LEVY_CATEGORIES.map(({ key, label }) => (
                                            <div key={key}>
                                                <label className="block text-xs text-gray-600 mb-1">{label}</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={paymentForm.categories[key] || ""}
                                                    onChange={(e) => handleCategoryAmountChange(key, e.target.value)}
                                                    placeholder="Amount"
                                                    className="w-full border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Deadline */}
                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Deadline (Optional)
                                </label>
                                <input
                                    type="date"
                                    value={paymentForm.deadline}
                                    onChange={(e) => handlePaymentFormChange("deadline", e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-opacity-90 transition"
                            >
                                Create Payment
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* MEMBER SECTION: Paid Payments */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-primary mb-4">✅ Paid Payments</h3>
                {paidPayments.length === 0 ? (
                    <p className="text-gray-500 text-center py-6">No paid payments yet.</p>
                ) : (
                    <div className="space-y-3">
                        {paidPayments.map((payment) => (
                            <div key={payment.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-gray-900">{payment.payment_title}</p>
                                        <p className="text-sm text-gray-600">{payment.payment_type}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-primary">${parseFloat(payment.amount_paid).toFixed(2)}</p>
                                        <p className="text-xs text-gray-600">
                                            Paid: {new Date(payment.paid_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MEMBER SECTION: Pending Payments */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-primary mb-4">⏳ Pending Payments</h3>
                {loading ? (
                    <p className="text-gray-500 text-center py-6">Loading payments...</p>
                ) : pendingPayments.length === 0 ? (
                    <p className="text-gray-500 text-center py-6">No pending payments.</p>
                ) : (
                    <div className="space-y-3">
                        {pendingPayments.map((payment) => (
                            <div key={payment.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">{payment.payment_title}</p>
                                        <p className="text-sm text-gray-600">{payment.payment_type}</p>
                                        {payment.payment_type === "CONTRIBUTION" ? (
                                            <div className="mt-2">
                                                <p className="text-sm font-medium text-primary mb-2">
                                                    Minimum payable amount: ₦{parseFloat(payment.min_amount || payment.amount_due).toFixed(2)}
                                                </p>
                                                <label className="text-sm text-gray-600 mr-2">Enter amount:</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min={parseFloat(payment.min_amount || payment.amount_due)}
                                                    value={contributionAmounts[payment.id] ?? String(parseFloat(payment.min_amount || payment.amount_due))}
                                                    onChange={(e) => handleContributionChange(payment.id, e.target.value)}
                                                    className="border rounded px-2 py-1 w-32"
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-sm font-semibold text-primary mt-1">
                                                Amount due: ₦{parseFloat(payment.amount_due).toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            const amt = contributionAmounts[payment.id] ?? (payment.min_amount || payment.amount_due);
                                            if (payment.payment_type === "CONTRIBUTION") {
                                                const minAmount = parseFloat(payment.min_amount || payment.amount_due);
                                                if (parseFloat(amt) < minAmount) {
                                                    setError(`Amount must be at least the minimum required (₦${minAmount.toFixed(2)})`);
                                                    return;
                                                }
                                            }
                                            handlePayPayment(payment.id, amt);
                                        }}
                                        className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-90 transition"
                                    >
                                        Pay Now
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ADMIN SECTION: Forum Payment Matrix Table */}
            {isAdmin && (
                <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-primary mb-4">Forum Payment Matrix</h3>
                    {adminLoading ? (
                        <p className="text-gray-500 text-center py-6">Loading...</p>
                    ) : !paymentMatrix || paymentMatrix.payments.length === 0 ? (
                        <p className="text-gray-500 text-center py-6">No payments created yet.</p>
                    ) : (
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 rounded-lg border border-gray-300">
                            <table className="w-full text-xs border border-gray-300">
                                <thead className="bg-primary text-white">
                                    <tr>
                                        <th className="text-left py-2 px-3 font-semibold border-r border-gray-300" style={{ minWidth: "140px" }}>Member</th>
                                        {paymentMatrix.payments.map((payment) => (
                                            <th key={payment.id} className="text-center py-2 px-2 font-semibold border-r border-gray-300" style={{ minWidth: "120px" }}>
                                                <div className="font-semibold">{payment.title}</div>
                                                <div className="text-xs opacity-80">({payment.type})</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paymentMatrix.matrix.map((row, idx) => (
                                        <tr key={row.member_id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-100"}>
                                            <td className="py-2 px-3 font-medium border-r border-gray-300">{row.member_name}</td>
                                            {paymentMatrix.payments.map((payment) => {
                                                const cellData = row.payments[payment.id];
                                                const statusColor =
                                                    cellData.status === "PAID"
                                                        ? "bg-green-100 text-green-800"
                                                        : cellData.status === "PENDING"
                                                            ? "bg-yellow-100 text-yellow-800"
                                                            : "bg-gray-200 text-gray-600";

                                                return (
                                                    <td key={payment.id} className="py-2 px-2 text-center border-r border-gray-300">
                                                        {cellData.status === "N/A" ? (
                                                            <span className="text-xs text-gray-500">N/A</span>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusColor}`}>
                                                                    {cellData.status === "PAID" ? "✓" : "⏳"}
                                                                </span>
                                                                <div className="text-xs text-gray-600">
                                                                    <div>Due: ${parseFloat(cellData.amount_due).toFixed(2)}</div>
                                                                    <div>Paid: ${parseFloat(cellData.amount_paid).toFixed(2)}</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
