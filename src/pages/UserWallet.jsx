import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

function BankAccountForm({ linkedAccount, onSuccess }) {
    const [accountHolderName, setAccountHolderName] = useState(linkedAccount?.account_holder_name || "");
    const [accountNumber, setAccountNumber] = useState(linkedAccount?.account_number || "");
    const [bankName, setBankName] = useState(linkedAccount?.bank_name || "");
    const [bankCode, setBankCode] = useState(linkedAccount?.bank_code || "");
    const [saving, setSaving] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!accountHolderName || !accountNumber || !bankName) {
            return alert("Please fill all required fields");
        }
        try {
            setSaving(true);
            const res = await api.post("payments/users/bank-account/", {
                account_holder_name: accountHolderName,
                account_number: accountNumber,
                bank_name: bankName,
                bank_code: bankCode,
            });
            if ([201, 200].includes(res.status)) {
                onSuccess();
            }
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "Failed to save bank account");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Remove linked bank account?")) return;
        try {
            const res = await api.delete("payments/users/bank-account/");
            if (res.status === 200) {
                onSuccess();
            }
        } catch (err) {
            console.error(err);
            alert("Failed to remove bank account");
        }
    };

    return (
        <form onSubmit={handleSave} className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="space-y-3">
                <div>
                    <label className="text-sm text-gray-600">Account Holder Name *</label>
                    <input
                        type="text"
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        placeholder="Full name"
                        className="w-full px-3 py-2 border rounded"
                    />
                    <p className="text-xs text-gray-500 mt-1">Must match your full name</p>
                </div>
                <div>
                    <label className="text-sm text-gray-600">Account Number *</label>
                    <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Account number"
                        className="w-full px-3 py-2 border rounded"
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-600">Bank Name *</label>
                    <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Bank name"
                        className="w-full px-3 py-2 border rounded"
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-600">Bank Code</label>
                    <input
                        type="text"
                        value={bankCode}
                        onChange={(e) => setBankCode(e.target.value)}
                        placeholder="Bank code (optional)"
                        className="w-full px-3 py-2 border rounded"
                    />
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded" disabled={saving}>
                        {saving ? "Saving..." : linkedAccount ? "Update" : "Link Account"}
                    </button>
                    {linkedAccount && (
                        <button type="button" onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded">
                            Remove
                        </button>
                    )}
                </div>
            </div>
        </form>
    );
}

function DepositForm({ onSuccess }) {
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("CARD");
    const [saving, setSaving] = useState(false);

    const handleDeposit = async (e) => {
        e.preventDefault();
        if (!amount) return alert("Enter an amount");
        try {
            setSaving(true);
            const res = await api.post("payments/users/wallet/deposit/", { amount, method });
            if (res.status === 201) {
                onSuccess();
            } else {
                alert("Failed to record deposit");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleDeposit} className="mt-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="space-y-3">
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-full px-3 py-2 border rounded"
                    step="0.01"
                />
                <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full px-3 py-2 border rounded">
                    <option value="CARD">Card</option>
                    <option value="BANK">Bank Transfer</option>
                </select>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-green-600 text-white rounded" disabled={saving}>
                        {saving ? "Processing..." : "Deposit"}
                    </button>
                </div>
            </div>
        </form>
    );
}

function WithdrawalForm({ onSuccess, hasLinkedAccount }) {
    const [amount, setAmount] = useState("");
    const [saving, setSaving] = useState(false);

    const handleWithdraw = async (e) => {
        e.preventDefault();
        if (!amount) return alert("Enter an amount");
        if (!hasLinkedAccount) {
            return alert("Please link a bank account first");
        }
        try {
            setSaving(true);
            const res = await api.post("payments/users/wallet/withdraw/", { amount });
            if (res.status === 201) {
                alert("Withdrawal requested");
                onSuccess();
            } else {
                alert("Failed to submit withdrawal request");
            }
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "Failed to submit withdrawal");
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleWithdraw} className="mt-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="space-y-3">
                {!hasLinkedAccount && (
                    <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
                        ⚠️ Link a bank account first to enable withdrawals
                    </div>
                )}
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-full px-3 py-2 border rounded"
                    step="0.01"
                    disabled={!hasLinkedAccount}
                />
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-orange-600 text-white rounded disabled:opacity-50" disabled={saving || !hasLinkedAccount}>
                        {saving ? "Processing..." : "Withdraw"}
                    </button>
                </div>
            </div>
        </form>
    );
}

export default function UserWallet() {
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [linkedAccount, setLinkedAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDeposit, setShowDeposit] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [showBankForm, setShowBankForm] = useState(false);
    const navigate = useNavigate();

    const fetchWallet = async () => {
        try {
            setLoading(true);
            const res = await api.get("payments/users/wallet/");
            setWallet(res.data.wallet);
            setTransactions(res.data.transactions || []);
        } catch (err) {
            console.error("Failed to load wallet", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBankAccount = async () => {
        try {
            const res = await api.get("payments/users/bank-account/");
            setLinkedAccount(res.data);
        } catch (err) {
            // 404 is expected if no account linked
            setLinkedAccount(null);
        }
    };

    useEffect(() => {
        fetchWallet();
        fetchBankAccount();
    }, []);

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">My Wallet</h1>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                        ← Back to Dashboard
                    </button>
                    <button onClick={fetchWallet} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Refresh
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="bg-white rounded-lg p-6 text-center">Loading wallet...</div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-white rounded-lg p-6 border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Wallet Name</p>
                                <p className="font-semibold text-lg">{wallet?.name}</p>
                                <p className="text-sm text-gray-500 mt-2">Wallet Number</p>
                                <p className="font-mono text-sm">{wallet?.wallet_number || '—'}</p>
                                <p className="text-sm text-gray-500 mt-2">Wallet Type</p>
                                <p className="text-sm">{wallet?.wallet_type || 'User Wallet'}</p>
                                <p className="text-sm text-gray-500 mt-2">Current Balance</p>
                                <p className="text-2xl font-bold text-green-600">₦{parseFloat(wallet?.balance || 0).toLocaleString()}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => setShowDeposit(!showDeposit)} className="px-4 py-2 bg-green-600 text-white rounded">Deposit</button>
                                <button onClick={() => setShowWithdraw(!showWithdraw)} className="px-4 py-2 bg-orange-600 text-white rounded">Withdraw</button>
                            </div>
                        </div>

                        {showDeposit && <DepositForm onSuccess={() => { setShowDeposit(false); fetchWallet(); }} />}
                        {showWithdraw && <WithdrawalForm onSuccess={() => { setShowWithdraw(false); fetchWallet(); fetchBankAccount(); }} hasLinkedAccount={!!linkedAccount} />}
                    </div>

                    <div className="bg-white rounded-lg p-6 border">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold mb-2">Linked Bank Account</h2>
                                {linkedAccount ? (
                                    <div className="text-sm space-y-1">
                                        <p><span className="text-gray-600">Name:</span> {linkedAccount.account_holder_name}</p>
                                        <p><span className="text-gray-600">Account:</span> {linkedAccount.account_number}</p>
                                        <p><span className="text-gray-600">Bank:</span> {linkedAccount.bank_name}</p>
                                        <p className="text-green-600 font-semibold mt-2">✓ Account linked</p>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">No bank account linked. Link one to enable withdrawals.</p>
                                )}
                            </div>
                            <button onClick={() => setShowBankForm(!showBankForm)} className="px-4 py-2 bg-blue-600 text-white rounded">
                                {linkedAccount ? "Update" : "Link Account"}
                            </button>
                        </div>

                        {showBankForm && (
                            <BankAccountForm
                                linkedAccount={linkedAccount}
                                onSuccess={() => {
                                    setShowBankForm(false);
                                    fetchBankAccount();
                                }}
                            />
                        )}
                    </div>

                    <div className="bg-white rounded-lg p-6 border">
                        <h2 className="font-semibold mb-4">Transaction History</h2>
                        {transactions.length === 0 ? (
                            <p className="text-gray-500">No recent transactions</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-600">
                                            <th className="pb-2">Date</th>
                                            <th className="pb-2">Type</th>
                                            <th className="pb-2">Amount</th>
                                            <th className="pb-2">Description</th>
                                            <th className="pb-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map((tx) => (
                                            <tr key={tx.id} className="border-t">
                                                <td className="py-3">{new Date(tx.date).toLocaleString()}</td>
                                                <td className="py-3">{tx.transaction_type}</td>
                                                <td className={`py-3 font-semibold ${tx.transaction_type === 'Deposit' || tx.transaction_type === 'Disbursement' ? 'text-green-600' : 'text-red-600'}`}>₦{parseFloat(tx.amount).toLocaleString()}</td>
                                                <td className="py-3">{tx.description || tx.reference}</td>
                                                <td className="py-3">{tx.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
