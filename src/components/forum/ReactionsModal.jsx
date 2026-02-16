import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function ReactionsModal({ postId, forumId, onClose }) {
    const [reactions, setReactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!postId) return;
        const load = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/forums/${forumId}/posts/${postId}/reactions/`);
                setReactions(res.data || []);
            } catch (err) {
                console.error("Failed to load reactions", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [postId, forumId]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-full max-w-md">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Reactions</h3>
                    <button onClick={onClose} className="text-gray-600">✕</button>
                </div>

                {loading ? (
                    <p className="text-gray-500">Loading...</p>
                ) : reactions.length === 0 ? (
                    <p className="text-gray-500">No reactions yet.</p>
                ) : (
                    <div className="space-y-2 max-h-80 overflow-auto">
                        {reactions.map((r) => (
                            <div key={r.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                                    {r.user_profile?.profile_photo ? (
                                        <img src={r.user_profile.profile_photo} alt={r.user_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-sm">{r.user_name?.charAt(0)}</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-secondary">{r.user_name || r.user_email}</div>
                                            <div className="text-xs text-gray-500">{r.reaction_type}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
