import { useState, useEffect, useRef, useContext } from "react";
import { AuthContext } from "../../../context/AuthContext";
import api from "../../../api/axios";
import { useNotifications } from "../../../context/NotificationContext";
import NotificationMessageBar from "../../notifications/NotificationMessageBar";
import ReactionsModal from "../ReactionsModal";

export default function ForumFeed({ forum, userRole }) {
    const { notifications } = useNotifications();
    const [posts, setPosts] = useState([]);
    const [newPost, setNewPost] = useState("");
    const [postImage, setPostImage] = useState(null);
    const [isPosting, setIsPosting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const lastProcessedNotificationId = useRef(null);

    // Comments state: map of postId -> comments array
    const [openCommentsPostId, setOpenCommentsPostId] = useState(null);
    const [commentsMap, setCommentsMap] = useState({});
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [postingCommentFor, setPostingCommentFor] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [profileModalUser, setProfileModalUser] = useState(null);
    const [editingComment, setEditingComment] = useState({ postId: null, commentId: null, value: "" });
    const [openReactions, setOpenReactions] = useState({ open: false, postId: null });
    const [replyingTo, setReplyingTo] = useState({ postId: null, commentId: null });
    const [repliesMap, setRepliesMap] = useState({});
    const [postingReplyFor, setPostingReplyFor] = useState(null);
    const [openMenuFor, setOpenMenuFor] = useState(null);
    const [openReplyMenuFor, setOpenReplyMenuFor] = useState(null);
    const [editingReply, setEditingReply] = useState({ postId: null, commentId: null, replyId: null, value: "" });
    const [openPostMenuFor, setOpenPostMenuFor] = useState(null);
    const [editingPost, setEditingPost] = useState({ postId: null, value: "" });

    // Inline small CommentInput component
    function CommentInput({ postId, onSubmit, posting }) {
        const [value, setValue] = useState("");

        const handleSubmit = async (e) => {
            e.preventDefault();
            if (!value.trim()) return;
            await onSubmit(postId, value.trim());
            setValue("");
        };

        return (
            <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
                <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                    type="submit"
                    disabled={posting}
                    className="bg-primary text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                    {posting ? "Posting..." : "Comment"}
                </button>
            </form>
        );
    }

    // Auto-dismiss error messages after 3 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError("");
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const { isAuthenticated, loading: authLoading } = useContext(AuthContext);

    // Fetch posts on mount (only when authenticated)
    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) return;

        // Load current user id for permission checks first
        const loadUserIdAndPosts = async () => {
            try {
                const res = await api.get("auth/profile/");
                const userId = parseInt(res.data.user_id || res.data.id || null, 10);
                setCurrentUserId(userId);
                console.log("Current user ID set to:", userId);
            } catch (err) {
                console.error("Failed to fetch user profile:", err);
                setCurrentUserId(null);
            }
            // Then fetch posts
            fetchPosts();
        };

        loadUserIdAndPosts();
    }, [forum?.id, isAuthenticated, authLoading]);

    // Monitor notifications for new posts and automatically refresh the feed
    useEffect(() => {
        if (!forum?.id || !notifications.length) return;

        // Find new FEED_NEW_POST notifications for this forum
        const newFeedNotifications = notifications.filter(
            notif =>
                String(notif.forum_id) === String(forum.id) &&
                notif.notification_type === 'FEED_NEW_POST' &&
                notif.id !== lastProcessedNotificationId.current
        );

        if (newFeedNotifications.length > 0) {
            // Update the last processed notification ID
            lastProcessedNotificationId.current = newFeedNotifications[0].id;

            // Fetch posts to get the new post(s)
            console.log(`New post notification received in ${forum.name}, refreshing feed...`);
            fetchPosts();
        }
    }, [notifications, forum?.id]);

    const fetchPosts = async () => {
        try {
            setLoading(true);
            if (!forum?.id) {
                setLoading(false);
                return;
            }
            const res = await api.get(`/forums/${forum.id}/posts/`);
            setPosts(res.data);
        } catch (err) {
            setError("Failed to load posts");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePost = async () => {
        if (!newPost.trim() && !postImage) return;

        setIsPosting(true);
        setError(""); // Clear previous errors
        try {
            const formData = new FormData();
            formData.append("content", newPost);
            if (postImage) {
                formData.append("image", postImage);
            }

            console.log("Creating post for forum:", forum.id);
            const res = await api.post(`/forums/${forum.id}/posts/`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            console.log("Post created successfully:", res.data);
            // Success - update UI immediately
            setPosts([res.data, ...posts]);
            setNewPost("");
            setPostImage(null);
            setError(""); // Ensure error is cleared on success
        } catch (err) {
            console.error("Error creating post:", err);
            const errorMsg = err.response?.data?.detail ||
                err.response?.data?.error ||
                err.response?.data?.message ||
                err.message ||
                "Failed to create post";
            console.error("Detailed error:", errorMsg);
            setError(errorMsg);
        } finally {
            setIsPosting(false);
        }
    };

    const handleReaction = async (postId, reactionType) => {
        try {
            // Remove existing reaction first
            const currentReaction = posts
                .find(p => p.id === postId)
                ?.user_reaction;

            if (currentReaction === reactionType) {
                // Remove reaction
                await api.delete(`/forums/${forum.id}/posts/${postId}/reactions/${currentReaction}/`);
            } else {
                // Add new reaction
                await api.post(`/forums/${forum.id}/posts/${postId}/reactions/`, {
                    reaction_type: reactionType,
                });
            }

            // Refetch posts to get updated counts
            fetchPosts();
        } catch (err) {
            console.error("Failed to update reaction", err);
        }
    };

    const handleDeletePost = async (postId) => {
        try {
            await api.delete(`/forums/${forum.id}/posts/${postId}/`);
            setPosts(posts.filter(p => p.id !== postId));
        } catch (err) {
            setError("Failed to delete post");
            console.error(err);
        }
    };

    const handlePinPost = async (postId) => {
        try {
            await api.post(`/forums/${forum.id}/posts/${postId}/pin/`);
            fetchPosts();
        } catch (err) {
            setError("Failed to pin post");
            console.error(err);
        }
    };

    const handleStartEditPost = (post) => {
        setEditingPost({ postId: post.id, value: post.content });
    };

    const handleSaveEditPost = async () => {
        if (!editingPost.value.trim()) return;
        try {
            await api.put(`/forums/${forum.id}/posts/${editingPost.postId}/`, {
                content: editingPost.value,
            });
            setPosts(posts.map(p => p.id === editingPost.postId ? { ...p, content: editingPost.value } : p));
            setEditingPost({ postId: null, value: "" });
        } catch (err) {
            setError("Failed to update post");
            console.error(err);
        }
    };

    const handleCancelEditPost = () => {
        setEditingPost({ postId: null, value: "" });
    };

    // Comments: fetch comments for a post
    const fetchComments = async (postId) => {
        try {
            setCommentsLoading(true);
            const res = await api.get(`/forums/${forum.id}/posts/${postId}/comments/`);
            setCommentsMap((prev) => ({ ...prev, [postId]: res.data }));
        } catch (err) {
            console.error("Failed to load comments", err);
        } finally {
            setCommentsLoading(false);
        }
    };

    const handleToggleComments = async (postId) => {
        if (openCommentsPostId === postId) {
            setOpenCommentsPostId(null);
            return;
        }

        setOpenCommentsPostId(postId);
        // Load comments if not present
        if (!commentsMap[postId]) {
            await fetchComments(postId);
        }
    };

    const handlePostComment = async (postId, content) => {
        if (!content || !content.trim()) return;
        setPostingCommentFor(postId);
        // Optimistic UI: append temporary comment
        const tempId = `tmp-${Date.now()}`;
        const tempComment = {
            id: tempId,
            content,
            author_name: "You",
            author_profile: null,
            created_at: new Date().toISOString(),
            author_id: currentUserId,
        };
        setCommentsMap((prev) => ({
            ...prev,
            [postId]: [...(prev[postId] || []), tempComment],
        }));

        try {
            await api.post(`/forums/${forum.id}/posts/${postId}/comments/`, { content });
            // Replace optimistic comment by reloading
            await fetchComments(postId);
            await fetchPosts();
        } catch (err) {
            console.error("Failed to post comment", err);
            setError("Failed to post comment");
            // remove temp comment
            setCommentsMap((prev) => ({
                ...prev,
                [postId]: (prev[postId] || []).filter((c) => c.id !== tempId),
            }));
        } finally {
            setPostingCommentFor(null);
        }
    };

    const handleDeleteComment = async (postId, commentId, authorId) => {
        const canDelete = currentUserId && (currentUserId === authorId);
        // allow delete for author or admin (admin check via userRole)
        if (!canDelete && userRole !== "admin") return setError("You don't have permission to delete this comment");
        if (!window.confirm("Delete this comment?")) return;
        try {
            await api.delete(`/forums/${forum.id}/posts/${postId}/comments/${commentId}/`);
            // remove from UI
            setCommentsMap((prev) => ({
                ...prev,
                [postId]: (prev[postId] || []).filter((c) => c.id !== commentId),
            }));
            await fetchPosts();
        } catch (err) {
            console.error("Failed to delete comment", err);
            setError("Failed to delete comment");
        }
    };

    const handleStartEdit = (postId, comment) => {
        setEditingComment({ postId, commentId: comment.id, value: comment.content });
    };

    const handleCancelEdit = () => setEditingComment({ postId: null, commentId: null, value: "" });

    const handleSaveEdit = async () => {
        const { postId, commentId, value } = editingComment;
        if (!value.trim()) return setError("Comment cannot be empty");
        try {
            await api.put(`/forums/${forum.id}/posts/${postId}/comments/${commentId}/`, { content: value });
            await fetchComments(postId);
            handleCancelEdit();
        } catch (err) {
            console.error("Failed to edit comment", err);
            setError("Failed to edit comment");
        }
    };

    const openReactionsModal = (postId) => setOpenReactions({ open: true, postId });
    const closeReactionsModal = () => setOpenReactions({ open: false, postId: null });

    const fetchReplies = async (postId, commentId) => {
        const key = `${postId}-${commentId}`;
        try {
            const res = await api.get(`/forums/${forum.id}/posts/${postId}/comments/${commentId}/replies/`);
            setRepliesMap((prev) => ({ ...prev, [key]: res.data || [] }));
        } catch (err) {
            console.error("Failed to load replies", err);
        }
    };

    const handleToggleReplies = async (postId, commentId) => {
        if (replyingTo.commentId === commentId && replyingTo.postId === postId) {
            setReplyingTo({ postId: null, commentId: null });
            return;
        }
        setReplyingTo({ postId, commentId });
        const key = `${postId}-${commentId}`;
        if (!repliesMap[key]) {
            await fetchReplies(postId, commentId);
        }
    };

    const handlePostReply = async (postId, commentId, content) => {
        if (!content || !content.trim()) return;
        const key = `${postId}-${commentId}`;
        setPostingReplyFor(commentId);

        const tempReply = {
            id: `tmp-${Date.now()}`,
            content,
            author_name: "You",
            author_profile: null,
            created_at: new Date().toISOString(),
            author_id: currentUserId,
        };
        setRepliesMap((prev) => ({
            ...prev,
            [key]: [...(prev[key] || []), tempReply],
        }));

        try {
            await api.post(`/forums/${forum.id}/posts/${postId}/comments/${commentId}/replies/`, { content });
            await fetchReplies(postId, commentId);
            await fetchComments(postId);
        } catch (err) {
            console.error("Failed to post reply", err);
            setError("Failed to post reply");
            setRepliesMap((prev) => ({
                ...prev,
                [key]: (prev[key] || []).filter((r) => r.id !== tempReply.id),
            }));
        } finally {
            setPostingReplyFor(null);
        }
    };

    const handleDeleteReply = async (postId, commentId, replyId, authorId) => {
        const canDelete = currentUserId === authorId || userRole === "admin";
        if (!canDelete) return setError("You don't have permission to delete this reply");
        if (!window.confirm("Delete this reply?")) return;
        const key = `${postId}-${commentId}`;
        try {
            await api.delete(`/forums/${forum.id}/posts/${postId}/comments/${commentId}/replies/${replyId}/`);
            setRepliesMap((prev) => ({
                ...prev,
                [key]: (prev[key] || []).filter((r) => r.id !== replyId),
            }));
        } catch (err) {
            console.error("Failed to delete reply", err);
            setError("Failed to delete reply");
        }
    };

    const handleStartEditReply = (postId, commentId, reply) => {
        setEditingReply({ postId, commentId, replyId: reply.id, value: reply.content });
    };

    const handleCancelEditReply = () => setEditingReply({ postId: null, commentId: null, replyId: null, value: "" });

    const handleSaveEditReply = async () => {
        const { postId, commentId, replyId, value } = editingReply;
        if (!value.trim()) return setError("Reply cannot be empty");
        try {
            await api.put(`/forums/${forum.id}/posts/${postId}/comments/${commentId}/replies/${replyId}/`, { content: value });
            await fetchReplies(postId, commentId);
            handleCancelEditReply();
        } catch (err) {
            console.error("Failed to edit reply", err);
            setError("Failed to edit reply");
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center p-8"><p className="text-gray-500">Loading posts...</p></div>;
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6">
            <NotificationMessageBar forumId={forum?.id} tab="feed" />

            {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4">{error}</div>}

            {/* Create Post */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
                <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="Share something with the forum..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    rows="3"
                />

                {postImage && (
                    <div className="mt-3 relative inline-block">
                        <img
                            src={URL.createObjectURL(postImage)}
                            alt="preview"
                            className="w-32 h-32 object-cover rounded-lg"
                        />
                        <button
                            onClick={() => setPostImage(null)}
                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                        >
                            ✕
                        </button>
                    </div>
                )}

                <div className="mt-4 flex gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-primary">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setPostImage(e.target.files?.[0] || null)}
                            className="hidden"
                        />
                        📷 Image
                    </label>
                    <button
                        onClick={handleCreatePost}
                        disabled={isPosting || (!newPost.trim() && !postImage)}
                        className="ml-auto bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-900 transition disabled:opacity-50"
                    >
                        {isPosting ? "Posting..." : "Post"}
                    </button>
                </div>
            </div>

            {/* Posts */}
            <div className="space-y-4">
                {posts.length === 0 ? (
                    <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                        <p className="text-gray-500">No posts yet. Be the first to share!</p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <div key={post.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="font-semibold text-secondary">{post.author_name}</p>
                                    <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString()}</p>
                                </div>
                                {(currentUserId === post.author_id || userRole === "admin") && (
                                    <div className="relative z-20">
                                        <button
                                            onClick={() => setOpenPostMenuFor(openPostMenuFor === post.id ? null : post.id)}
                                            className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-2 py-1 rounded transition"
                                            title="Post options"
                                        >
                                            ⋮
                                        </button>
                                        {openPostMenuFor === post.id && (
                                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-30 min-w-max">
                                                {(currentUserId === post.author_id) && (
                                                    <button onClick={() => { handleStartEditPost(post); setOpenPostMenuFor(null); }} className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 first:rounded-t-lg">Edit</button>
                                                )}
                                                {(currentUserId === post.author_id || userRole === "admin") && (
                                                    <button onClick={() => { handleDeletePost(post.id); setOpenPostMenuFor(null); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
                                                )}
                                                {userRole === "admin" && (
                                                    <button onClick={() => { handlePinPost(post.id); setOpenPostMenuFor(null); }} className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 last:rounded-b-lg">Pin</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Post edit mode */}
                            {editingPost.postId === post.id ? (
                                <div className="mt-2 mb-3">
                                    <textarea
                                        value={editingPost.value}
                                        onChange={(e) => setEditingPost(prev => ({ ...prev, value: e.target.value }))}
                                        className="w-full border rounded px-3 py-2"
                                        rows="3"
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={handleSaveEditPost} className="bg-primary text-white px-4 py-2 rounded text-sm">Save</button>
                                        <button onClick={handleCancelEditPost} className="bg-gray-200 px-4 py-2 rounded text-sm">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-800 mb-3">{post.content}</p>
                            )}

                            {post.image && (
                                <img src={post.image} alt="post" className="w-full max-h-96 object-cover rounded-lg mb-3" />
                            )}

                            <div className="flex items-center gap-4 text-sm text-gray-600 border-t pt-3">
                                <button
                                    onClick={() => handleReaction(post.id, "LIKE")}
                                    className={`flex items-center gap-1 hover:text-primary ${post.user_reaction === "LIKE" ? "text-primary font-semibold" : ""
                                        }`}
                                >
                                    👍 {post.likes_count}
                                </button>
                                <button
                                    onClick={() => handleReaction(post.id, "DISLIKE")}
                                    className={`flex items-center gap-1 hover:text-red-600 ${post.user_reaction === "DISLIKE" ? "text-red-600 font-semibold" : ""
                                        }`}
                                >
                                    👎 {post.dislikes_count}
                                </button>
                                <button
                                    onClick={() => handleToggleComments(post.id)}
                                    className="flex items-center gap-1 hover:text-primary"
                                >
                                    💬 {post.comments_count}
                                </button>
                                <button
                                    onClick={() => openReactionsModal(post.id)}
                                    className="flex items-center gap-1 hover:text-primary"
                                    title="View who reacted"
                                >
                                    ❤️ {post.likes_count}
                                </button>
                            </div>
                            {/* Comments section */}
                            {openCommentsPostId === post.id && (
                                <div className="mt-3 border-t pt-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium">Comments</h4>
                                        <button onClick={() => setOpenCommentsPostId(null)} className="text-gray-600">✕</button>
                                    </div>
                                    {commentsLoading && !commentsMap[post.id] ? (
                                        <p className="text-gray-500">Loading comments...</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {(commentsMap[post.id] || []).length === 0 ? (
                                                <p className="text-gray-500">No comments yet. Be the first to comment.</p>
                                            ) : (
                                                (commentsMap[post.id] || []).map((c) => (
                                                    <div key={c.id} className="py-2 border border-gray-100 rounded-lg p-3">
                                                        <div className="flex items-start gap-3">
                                                            <div
                                                                className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center cursor-pointer"
                                                                onClick={() => setProfileModalUser({ id: c.author_id, name: c.author_name, photo: c.author_profile?.profile_photo })}
                                                            >
                                                                {c.author_profile?.profile_photo ? (
                                                                    <img src={c.author_profile.profile_photo} alt={c.author_name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span>{(c.author_name || "?").charAt(0)}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <div className="flex-1">
                                                                        <p className="text-sm font-semibold text-secondary">{c.author_name}</p>
                                                                        <p className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</p>
                                                                    </div>
                                                                    {(currentUserId === c.author_id || userRole === "admin") && (
                                                                        <div className="relative z-20">
                                                                            <button
                                                                                onClick={() => setOpenMenuFor(openMenuFor === c.id ? null : c.id)}
                                                                                className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-2 py-1 rounded transition"
                                                                                title="Comment options"
                                                                            >
                                                                                ⋮
                                                                            </button>
                                                                            {openMenuFor === c.id && (
                                                                                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-30 min-w-max">
                                                                                    {(currentUserId === c.author_id) && (
                                                                                        <button onClick={() => { handleStartEdit(post.id, c); setOpenMenuFor(null); }} className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 first:rounded-t-lg">Edit</button>
                                                                                    )}
                                                                                    {(currentUserId === c.author_id || userRole === "admin") && (
                                                                                        <button onClick={() => { handleDeleteComment(post.id, c.id, c.author_id); setOpenMenuFor(null); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg">Delete</button>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {editingComment.commentId === c.id && editingComment.postId === post.id ? (
                                                                    <div className="mt-2">
                                                                        <textarea value={editingComment.value} onChange={(e) => setEditingComment(prev => ({ ...prev, value: e.target.value }))} className="w-full border rounded px-2 py-1" />
                                                                        <div className="flex gap-2 mt-2">
                                                                            <button onClick={handleSaveEdit} className="bg-primary text-white px-3 py-1 rounded">Save</button>
                                                                            <button onClick={handleCancelEdit} className="bg-gray-200 px-3 py-1 rounded">Cancel</button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p className="mt-1 text-gray-800">{c.content}</p>
                                                                )}

                                                                {/* Reply button */}
                                                                <div className="mt-2 flex gap-2">
                                                                    <button
                                                                        onClick={() => handleToggleReplies(post.id, c.id)}
                                                                        className="text-xs text-primary hover:underline"
                                                                    >
                                                                        {replyingTo.commentId === c.id && replyingTo.postId === post.id ? "Hide replies" : "Reply"} {c.replies_count > 0 && `(${c.replies_count})`}
                                                                    </button>
                                                                </div>

                                                                {/* Replies section */}
                                                                {replyingTo.commentId === c.id && replyingTo.postId === post.id && (
                                                                    <div className="mt-3 ml-8 bg-gray-50 rounded p-3 space-y-2">
                                                                        {(repliesMap[`${post.id}-${c.id}`] || []).length > 0 && (
                                                                            <div className="space-y-2">
                                                                                {repliesMap[`${post.id}-${c.id}`].map((r) => (
                                                                                    <div key={r.id} className="bg-white rounded p-2 border border-gray-100">
                                                                                        <div className="flex items-start gap-2">
                                                                                            <div
                                                                                                className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-xs cursor-pointer"
                                                                                                onClick={() => setProfileModalUser({ id: r.author_id, name: r.author_name, photo: r.author_profile?.profile_photo })}
                                                                                            >
                                                                                                {r.author_profile?.profile_photo ? (
                                                                                                    <img src={r.author_profile.profile_photo} alt={r.author_name} className="w-full h-full object-cover" />
                                                                                                ) : (
                                                                                                    <span>{(r.author_name || "?").charAt(0)}</span>
                                                                                                )}
                                                                                            </div>
                                                                                            <div className="flex-1">
                                                                                                <div className="flex items-center justify-between mb-1">
                                                                                                    <div className="flex-1">
                                                                                                        <p className="text-xs font-semibold text-secondary">{r.author_name}</p>
                                                                                                        <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</p>
                                                                                                    </div>
                                                                                                    {(currentUserId === r.author_id || userRole === "admin") && (
                                                                                                        <div className="relative z-20">
                                                                                                            <button
                                                                                                                onClick={() => setOpenReplyMenuFor(openReplyMenuFor === r.id ? null : r.id)}
                                                                                                                className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-1 py-1 rounded transition"
                                                                                                                title="Reply options"
                                                                                                            >
                                                                                                                ⋮
                                                                                                            </button>
                                                                                                            {openReplyMenuFor === r.id && (
                                                                                                                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-30 min-w-max">
                                                                                                                    {(currentUserId === r.author_id) && (
                                                                                                                        <button onClick={() => { handleStartEditReply(post.id, c.id, r); setOpenReplyMenuFor(null); }} className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 first:rounded-t-lg">Edit</button>
                                                                                                                    )}
                                                                                                                    {(currentUserId === r.author_id || userRole === "admin") && (
                                                                                                                        <button onClick={() => { handleDeleteReply(post.id, c.id, r.id, r.author_id); setOpenReplyMenuFor(null); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg">Delete</button>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>

                                                                                                {editingReply.replyId === r.id && editingReply.commentId === c.id && editingReply.postId === post.id ? (
                                                                                                    <div className="mt-2">
                                                                                                        <textarea value={editingReply.value} onChange={(e) => setEditingReply(prev => ({ ...prev, value: e.target.value }))} className="w-full border rounded px-2 py-1 text-xs" />
                                                                                                        <div className="flex gap-2 mt-2">
                                                                                                            <button onClick={handleSaveEditReply} className="bg-primary text-white px-3 py-1 rounded text-xs">Save</button>
                                                                                                            <button onClick={handleCancelEditReply} className="bg-gray-200 px-3 py-1 rounded text-xs">Cancel</button>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <p className="text-xs text-gray-800 mt-1">{r.content}</p>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}

                                                                        {/* Reply input */}
                                                                        <form
                                                                            onSubmit={(e) => {
                                                                                e.preventDefault();
                                                                                const replyInput = e.target.elements.replyInput;
                                                                                if (replyInput && replyInput.value.trim()) {
                                                                                    handlePostReply(post.id, c.id, replyInput.value.trim());
                                                                                    replyInput.value = "";
                                                                                }
                                                                            }}
                                                                            className="flex gap-2"
                                                                        >
                                                                            <input
                                                                                name="replyInput"
                                                                                placeholder="Write a reply..."
                                                                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                                                            />
                                                                            <button
                                                                                type="submit"
                                                                                disabled={postingReplyFor === c.id}
                                                                                className="bg-primary text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                                                                            >
                                                                                {postingReplyFor === c.id ? "..." : "Reply"}
                                                                            </button>
                                                                        </form>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}

                                            {/* Add comment form */}
                                            <CommentInput
                                                postId={post.id}
                                                onSubmit={handlePostComment}
                                                posting={postingCommentFor === post.id}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Profile Modal (simple) */}
            {profileModalUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
                    <div className="bg-white rounded-lg p-4 max-w-sm w-full">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">{profileModalUser.name}</h4>
                            <button onClick={() => setProfileModalUser(null)} className="text-gray-600">✕</button>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200">
                                {profileModalUser.photo ? (
                                    <img src={profileModalUser.photo} alt={profileModalUser.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full">{(profileModalUser.name || "?").charAt(0)}</div>
                                )}
                            </div>
                            <div>
                                <p className="font-medium text-secondary">{profileModalUser.name}</p>
                                <div className="mt-3">
                                    <button onClick={() => { setProfileModalUser(null); window.location.href = `/user-profile?user_id=${profileModalUser.id}` }} className="bg-primary text-white px-3 py-1 rounded">View Profile</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reactions Modal */}
            {openReactions.open && (
                <ReactionsModal postId={openReactions.postId} forumId={forum.id} onClose={closeReactionsModal} />
            )}

        </div>
    );
}
