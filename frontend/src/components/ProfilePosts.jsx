import React, { useState, useRef } from "react";
import { db } from "../firebase";
import {
    collection, addDoc, updateDoc, deleteDoc, doc,
    serverTimestamp, arrayUnion, arrayRemove
} from "firebase/firestore";
import "../styles/componentsCSS/ProfilePosts.css";

function ProfilePosts({
    user,
    profileImage,
    posts = [],
    isOwnProfile,
    onPostCreated
}) {
    const [state, setState] = useState({
        newPostContent: "",
        newPostImages: [],
        creatingPost: false,
        editingPostId: null,
        editContent: "",
        updatingPost: false,
        newCommentText: {},
        postingCommentId: null,
        openCommentsPostId: null,
        editingCommentId: null,
        editCommentText: "",
        updatingComment: false,
        deletingCommentId: null,
        postVisibility: "public"
    });

    const postImageInputRef = useRef(null);

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
    });

    const getSocialPreview = (content) => {
        const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const tiktokRegex = /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com\/@[\w.-]+\/video\/\d+|vt\.tiktok\.com\/\w+)/;
        const instagramRegex = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com\/(?:p|reels|reel)\/([\w-]+))/;

        const ytMatch = content.match(youtubeRegex);
        if (ytMatch) {
            return { type: 'youtube', id: ytMatch[1], thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg` };
        }

        const ttMatch = content.match(tiktokRegex);
        if (ttMatch) {
            return { type: 'tiktok', thumbnail: '/project-icons/social-placeholders/tiktok-preview.png' };
        }

        const igMatch = content.match(instagramRegex);
        if (igMatch) {
            return { type: 'instagram', thumbnail: '/project-icons/social-placeholders/instagram-preview.png' };
        }

        return null;
    };

    const createPost = async () => {
        if (!user || !state.newPostContent.trim() || state.creatingPost) return;

        try {
            setState(prev => ({ ...prev, creatingPost: true }));

            const socialPreview = getSocialPreview(state.newPostContent);

            const postData = {
                userId: user.uid,
                username: user.displayName || "Anonymous User",
                userProfileImage: profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png",
                content: state.newPostContent.trim(),
                createdAt: serverTimestamp(),
                likes: [],
                dislikes: [],
                comments: [],
                mediaUrls: [],
                socialPreview: socialPreview || null,
                postImages: state.newPostImages || [],
                visibility: state.postVisibility
            };

            await addDoc(collection(db, "posts"), postData);

            setState(prev => ({
                ...prev,
                newPostContent: "",
                newPostImages: [],
                creatingPost: false,
                postVisibility: "public"
            }));

            alert("Post created successfully!");
            if (onPostCreated) onPostCreated();
        } catch (error) {
            console.error("Error creating post:", error);
            alert("Failed to create post. Please try again.");
            setState(prev => ({ ...prev, creatingPost: false }));
        }
    };

    const deletePost = async (postId) => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;

        try {
            await deleteDoc(doc(db, "posts", postId));
            alert("Post deleted successfully!");
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Failed to delete post.");
        }
    };

    const startEditingPost = (post) => {
        setState(prev => ({
            ...prev,
            editingPostId: post.id,
            editContent: post.content
        }));
    };

    const cancelEditingPost = () => {
        setState(prev => ({
            ...prev,
            editingPostId: null,
            editContent: ""
        }));
    };

    const updatePost = async (postId) => {
        if (!state.editContent.trim() || state.updatingPost) return;

        try {
            setState(prev => ({ ...prev, updatingPost: true }));
            const postRef = doc(db, "posts", postId);
            await updateDoc(postRef, {
                content: state.editContent.trim(),
                updatedAt: serverTimestamp()
            });

            setState(prev => ({
                ...prev,
                editingPostId: null,
                editContent: "",
                updatingPost: false
            }));
        } catch (error) {
            console.error("Error updating post:", error);
            alert("Failed to update post.");
            setState(prev => ({ ...prev, updatingPost: false }));
        }
    };

    const handleLike = async (post) => {
        if (!user) return;
        const postRef = doc(db, "posts", post.id);
        const userId = user.uid;

        const userData = {
            uid: userId,
            username: user.displayName || "Anonymous User",
            profileImage: profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"
        };

        const existingLike = post.likes?.find(l => l.uid === userId);
        const existingDislike = post.dislikes?.find(d => d.uid === userId);

        try {
            if (existingLike) {
                await updateDoc(postRef, {
                    likes: arrayRemove(existingLike)
                });
            } else {
                await updateDoc(postRef, {
                    likes: arrayUnion(userData),
                    dislikes: existingDislike ? arrayRemove(existingDislike) : post.dislikes || []
                });
            }
        } catch (error) {
            console.error("Error liking post:", error);
        }
    };

    const handleDislike = async (post) => {
        if (!user) return;
        const postRef = doc(db, "posts", post.id);
        const userId = user.uid;

        const userData = {
            uid: userId,
            username: user.displayName || "Anonymous User",
            profileImage: profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"
        };

        const existingLike = post.likes?.find(l => l.uid === userId);
        const existingDislike = post.dislikes?.find(d => d.uid === userId);

        try {
            if (existingDislike) {
                await updateDoc(postRef, {
                    dislikes: arrayRemove(existingDislike)
                });
            } else {
                await updateDoc(postRef, {
                    dislikes: arrayUnion(userData),
                    likes: existingLike ? arrayRemove(existingLike) : post.likes || []
                });
            }
        } catch (error) {
            console.error("Error disliking post:", error);
        }
    };

    const handleAddComment = async (postId) => {
        const commentText = state.newCommentText[postId]?.trim();
        if (!user || !commentText || state.postingCommentId === postId) return;

        try {
            setState(prev => ({ ...prev, postingCommentId: postId }));
            const postRef = doc(db, "posts", postId);
            const newComment = {
                id: Date.now().toString(),
                userId: user.uid,
                username: user.displayName || "Anonymous User",
                userProfileImage: profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png",
                text: commentText,
                createdAt: new Date().toISOString()
            };

            await updateDoc(postRef, {
                comments: arrayUnion(newComment)
            });

            setState(prev => ({
                ...prev,
                newCommentText: { ...prev.newCommentText, [postId]: "" },
                postingCommentId: null
            }));
        } catch (error) {
            console.error("Error adding comment:", error);
            setState(prev => ({ ...prev, postingCommentId: null }));
        }
    };

    const startEditingComment = (comment) => {
        setState(prev => ({
            ...prev,
            editingCommentId: comment.id,
            editCommentText: comment.text
        }));
    };

    const cancelEditingComment = () => {
        setState(prev => ({
            ...prev,
            editingCommentId: null,
            editCommentText: ""
        }));
    };

    const updateComment = async (postId, commentId) => {
        if (!state.editCommentText.trim() || state.updatingComment) return;

        try {
            setState(prev => ({ ...prev, updatingComment: true }));
            const postRef = doc(db, "posts", postId);
            const post = posts.find(p => p.id === postId);

            if (!post) throw new Error("Post not found");

            const updatedComments = post.comments.map(comment =>
                comment.id === commentId
                    ? { ...comment, text: state.editCommentText.trim(), updatedAt: new Date().toISOString() }
                    : comment
            );

            await updateDoc(postRef, { comments: updatedComments });

            setState(prev => ({
                ...prev,
                editingCommentId: null,
                editCommentText: "",
                updatingComment: false
            }));
        } catch (error) {
            console.error("Error updating comment:", error);
            alert("Failed to update comment.");
            setState(prev => ({ ...prev, updatingComment: false }));
        }
    };

    const deleteComment = async (postId, commentId) => {
        if (!window.confirm("Are you sure you want to delete this comment?")) return;

        try {
            setState(prev => ({ ...prev, deletingCommentId: commentId }));
            const postRef = doc(db, "posts", postId);
            const post = posts.find(p => p.id === postId);

            if (!post) throw new Error("Post not found");

            const updatedComments = post.comments.filter(comment => comment.id !== commentId);

            await updateDoc(postRef, { comments: updatedComments });

            setState(prev => ({ ...prev, deletingCommentId: null }));
        } catch (error) {
            console.error("Error deleting comment:", error);
            alert("Failed to delete comment.");
            setState(prev => ({ ...prev, deletingCommentId: null }));
        }
    };

    const removePostImage = (index) => {
        setState(prev => ({
            ...prev,
            newPostImages: prev.newPostImages.filter((_, i) => i !== index)
        }));
    };

    const handlePostImageSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) return alert("Image too large (Max 2MB)");

        try {
            const base64 = await fileToBase64(file);
            setState(prev => ({
                ...prev,
                newPostImages: [...prev.newPostImages, base64]
            }));
        } catch (err) {
            alert("Error processing image");
        }
    };

    const handlePaste = async (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    if (file.size > 2 * 1024 * 1024) {
                        alert("Pasted image too large (Max 2MB)");
                        continue;
                    }
                    try {
                        const base64 = await fileToBase64(file);
                        setState(prev => ({
                            ...prev,
                            newPostImages: [...prev.newPostImages, base64]
                        }));
                        e.preventDefault();
                    } catch (err) {
                        console.error("Paste error:", err);
                    }
                }
            }
        }
    };

    const formatPostTime = (timestamp) => {
        if (!timestamp) return "";
        const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="profile-posts-container">
            {isOwnProfile && (
                <div className="make-post-container">
                    <h4>Create a Post</h4>
                    <div className="post-input-wrapper">
                        <textarea
                            placeholder="Share something with the community... (Links to Youtube/TikTok/Instagram supported)"
                            className="post-textarea"
                            value={state.newPostContent}
                            onChange={(e) => setState(prev => ({ ...prev, newPostContent: e.target.value }))}
                            onPaste={handlePaste}
                            maxLength={500}
                        ></textarea>
                        <div className="post-char-counter">
                            {state.newPostContent.length}/500 characters
                        </div>

                        <div className="visibility-selector">
                            <label htmlFor="post-visibility">Visibility:</label>
                            <select
                                id="post-visibility"
                                value={state.postVisibility}
                                onChange={(e) => setState(prev => ({ ...prev, postVisibility: e.target.value }))}
                                className="visibility-select"
                            >
                                <option value="public">Public - Visible in feeds</option>
                                <option value="profile-only">Profile Only - Visible on profile page</option>
                                <option value="private">Private - Friends only</option>
                            </select>
                        </div>

                        {state.newPostImages.length > 0 && (
                            <div className="post-images-preview-grid">
                                {state.newPostImages.map((img, index) => (
                                    <div key={index} className="post-image-preview-container">
                                        <img src={img} alt={`Preview ${index}`} className="post-image-preview" />
                                        <button
                                            className="remove-post-image-btn"
                                            onClick={() => removePostImage(index)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="post-actions">
                            <input
                                type="file"
                                ref={postImageInputRef}
                                onChange={handlePostImageSelect}
                                accept="image/*"
                                style={{ display: "none" }}
                            />
                            <button
                                className="post-media-btn"
                                onClick={() => postImageInputRef.current?.click()}
                            >
                                Add Image
                            </button>
                            <button
                                className="post-submit-btn"
                                onClick={createPost}
                                disabled={!state.newPostContent.trim() || state.creatingPost}
                            >
                                {state.creatingPost ? "Posting..." : "Post to Feed"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="profile-social-feed">
                <h4>Activity Feed</h4>
                {posts.length === 0 ? (
                    <div className="no-posts-message">
                        <p>No posts yet. Share something with the community!</p>
                    </div>
                ) : (
                    <div className="feed-posts">
                        {posts.map(post => (
                            <div key={post.id} className={`feed-post-wrapper ${state.openCommentsPostId === post.id ? 'comments-open' : ''}`}>
                                <div className="feed-post">
                                    <div className="post-header">
                                        <img
                                            src={post.userProfileImage || profileImage}
                                            alt="Poster"
                                            className="post-avatar"
                                        />
                                        <div className="post-meta">
                                            <span className="post-author">
                                                {post.username || user?.displayName || "Anonymous User"}
                                            </span>
                                            <div className="post-meta-right">
                                                <span className="post-date">
                                                    {formatPostTime(post.createdAt)}
                                                </span>
                                                {post.visibility && post.visibility !== "public" && (
                                                    <span className={`visibility-badge ${post.visibility}`}>
                                                        {post.visibility === "profile-only" && "Profile Only"}
                                                        {post.visibility === "private" && "Private"}
                                                    </span>
                                                )}
                                                {isOwnProfile && post.userId === user?.uid && (
                                                    <div className="post-mgmt-btns">
                                                        <button
                                                            className="mgmt-btn edit-btn"
                                                            onClick={() => startEditingPost(post)}
                                                            title="Edit Post"
                                                        >
                                                            <img src="/project-icons/Profile icons/edit.png" alt="Edit" />
                                                        </button>
                                                        <button
                                                            className="mgmt-btn delete-btn"
                                                            onClick={() => deletePost(post.id)}
                                                            title="Delete Post"
                                                        >
                                                            <span>×</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="post-content">
                                        {state.editingPostId === post.id ? (
                                            <div className="edit-post-container">
                                                <textarea
                                                    className="edit-post-textarea"
                                                    value={state.editContent}
                                                    onChange={(e) => setState(prev => ({ ...prev, editContent: e.target.value }))}
                                                    rows={3}
                                                />
                                                <div className="edit-actions">
                                                    <button
                                                        className="edit-save-btn"
                                                        onClick={() => updatePost(post.id)}
                                                        disabled={state.updatingPost || !state.editContent.trim()}
                                                    >
                                                        {state.updatingPost ? "Saving..." : "Save"}
                                                    </button>
                                                    <button
                                                        className="edit-cancel-btn"
                                                        onClick={cancelEditingPost}
                                                        disabled={state.updatingPost}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            post.content
                                        )}
                                    </div>

                                    {post.socialPreview && (
                                        <div className="social-preview-container">
                                            {post.socialPreview.type === 'youtube' ? (
                                                <div className="yt-embed-wrapper">
                                                    <iframe
                                                        width="100%"
                                                        height="315"
                                                        src={`https://www.youtube.com/embed/${post.socialPreview.id}`}
                                                        title="YouTube video player"
                                                        frameBorder="0"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    ></iframe>
                                                </div>
                                            ) : (
                                                <div className="generic-social-preview">
                                                    <img src={post.socialPreview.thumbnail} alt="Preview" className="social-thumb" />
                                                    <div className="social-info">
                                                        <span className="social-type">{post.socialPreview.type.toUpperCase()} PREVIEW</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {post.postImages && post.postImages.length > 0 && (
                                        <div className={`post-media-content ${post.postImages.length > 1 ? 'multi-image' : 'single-image'}`}>
                                            {post.postImages.map((img, idx) => (
                                                <img key={idx} src={img} alt={`Post ${idx}`} className="post-uploaded-image" />
                                            ))}
                                        </div>
                                    )}

                                    {post.mediaUrls && post.mediaUrls.length > 0 && (
                                        <div className="post-media">
                                            {post.mediaUrls.map((url, index) => (
                                                <a
                                                    key={index}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="media-link"
                                                >
                                                    {url}
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    <div className="post-interactions">
                                        <button
                                            className={`interaction-btn count-btn ${post.likes?.some(l => l.uid === user?.uid) ? 'active liked' : ''}`}
                                            onClick={() => handleLike(post)}
                                        >
                                            <img src="/project-icons/Profile icons/thumbs-up.png" alt="Like" className="interaction-icon" />
                                            <span>{post.likes?.length || 0}</span>
                                        </button>
                                        <button
                                            className={`interaction-btn count-btn ${post.dislikes?.some(d => d.uid === user?.uid) ? 'active disliked' : ''}`}
                                            onClick={() => handleDislike(post)}
                                        >
                                            <img src="/project-icons/Profile icons/dislike.png" alt="Dislike" className="interaction-icon" />
                                            <span>{post.dislikes?.length || 0}</span>
                                        </button>
                                        <button
                                            className={`interaction-btn count-btn ${state.openCommentsPostId === post.id ? 'active' : ''}`}
                                            onClick={() => setState(prev => ({
                                                ...prev,
                                                openCommentsPostId: prev.openCommentsPostId === post.id ? null : post.id
                                            }))}
                                        >
                                            <img src="/project-icons/Profile icons/comments.png" alt="Comment" className="interaction-icon" />
                                            <span>{post.comments?.length || 0}</span>
                                        </button>
                                    </div>
                                </div>

                                {state.openCommentsPostId === post.id && (
                                    <div className="post-comments-sidebar">
                                        <div className="sidebar-header">
                                            <h5>Comments</h5>
                                            <button
                                                className="close-sidebar-btn"
                                                onClick={() => setState(prev => ({ ...prev, openCommentsPostId: null }))}
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <div className="comments-list-container">
                                            {post.comments && post.comments.length > 0 ? (
                                                <div className="comments-list">
                                                    {post.comments.map((comment) => {
                                                        const isCommentOwner = user?.uid === comment.userId;
                                                        const isPostOwner = user?.uid === post.userId;
                                                        const canEdit = isCommentOwner;
                                                        const canDelete = isCommentOwner || isPostOwner;

                                                        return (
                                                            <div key={comment.id} className="comment-item">
                                                                <img src={comment.userProfileImage} alt={comment.username} className="comment-avatar" />
                                                                <div className="comment-body">
                                                                    <div className="comment-header">
                                                                        <span className="comment-author">{comment.username}</span>
                                                                        <div className="comment-header-right">
                                                                            <span className="comment-date">{formatPostTime(comment.createdAt)}</span>
                                                                            {(canEdit || canDelete) && state.editingCommentId !== comment.id && (
                                                                                <div className="comment-actions">
                                                                                    {canEdit && (
                                                                                        <button
                                                                                            className="comment-action-btn edit-comment-btn"
                                                                                            onClick={() => startEditingComment(comment)}
                                                                                            title="Edit Comment"
                                                                                        >
                                                                                            <img src="/project-icons/Profile icons/edit.png" alt="Edit" />
                                                                                        </button>
                                                                                    )}
                                                                                    {canDelete && (
                                                                                        <button
                                                                                            className="comment-action-btn delete-comment-btn"
                                                                                            onClick={() => deleteComment(post.id, comment.id)}
                                                                                            disabled={state.deletingCommentId === comment.id}
                                                                                            title="Delete Comment"
                                                                                        >
                                                                                            <span>{state.deletingCommentId === comment.id ? "..." : "×"}</span>
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    {state.editingCommentId === comment.id ? (
                                                                        <div className="edit-comment-container">
                                                                            <input
                                                                                type="text"
                                                                                className="edit-comment-input"
                                                                                value={state.editCommentText}
                                                                                onChange={(e) => setState(prev => ({ ...prev, editCommentText: e.target.value }))}
                                                                                onKeyPress={(e) => e.key === 'Enter' && updateComment(post.id, comment.id)}
                                                                            />
                                                                            <div className="edit-comment-actions">
                                                                                <button
                                                                                    className="edit-comment-save-btn"
                                                                                    onClick={() => updateComment(post.id, comment.id)}
                                                                                    disabled={state.updatingComment || !state.editCommentText.trim()}
                                                                                >
                                                                                    {state.updatingComment ? "..." : "Save"}
                                                                                </button>
                                                                                <button
                                                                                    className="edit-comment-cancel-btn"
                                                                                    onClick={cancelEditingComment}
                                                                                    disabled={state.updatingComment}
                                                                                >
                                                                                    Cancel
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="comment-text">{comment.text}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="no-comments">
                                                    <p>No comments yet. Be the first!</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="add-comment-form">
                                            <input
                                                type="text"
                                                placeholder="Write a comment..."
                                                className="comment-input"
                                                value={state.newCommentText[post.id] || ""}
                                                onChange={(e) => setState(prev => ({
                                                    ...prev,
                                                    newCommentText: { ...prev.newCommentText, [post.id]: e.target.value }
                                                }))}
                                                onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                                            />
                                            <button
                                                className="add-comment-btn"
                                                onClick={() => handleAddComment(post.id)}
                                                disabled={!state.newCommentText[post.id]?.trim() || state.postingCommentId === post.id}
                                            >
                                                {state.postingCommentId === post.id ? "..." : "Post"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProfilePosts;
