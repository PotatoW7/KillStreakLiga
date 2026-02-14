import React, { useState, useRef, useEffect } from "react";
import { db } from "../firebase";
import {
    collection, addDoc, updateDoc, deleteDoc, doc,
    serverTimestamp, arrayUnion, arrayRemove
} from "firebase/firestore";
import IconRenderer, { LoLSuggestions } from "./IconRenderer";
import "../styles/componentsCSS/ProfilePosts.css";

function ProfilePosts({ user, profileImage, posts = [], isOwnProfile, onPostCreated, isFeedsPage }) {
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
        postVisibility: "public",
        showSuggestions: false,
        suggestionQuery: "",
        suggestionIndex: 0,
        suggestionType: null,
        activeCommentId: null,
        suggestionCoords: { top: 0, left: 0 }
    });

    const postImageInputRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!state.showSuggestions) return;

            const isInput = event.target.closest('.post-textarea') ||
                event.target.closest('.comment-input') ||
                event.target.closest('.edit-post-textarea') ||
                event.target.closest('.edit-comment-input');
            const isDropdown = event.target.closest('.suggestion-dropdown');

            if (!isInput && !isDropdown) {
                setState(prev => ({ ...prev, showSuggestions: false }));
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [state.showSuggestions]);

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
    });

    const getSocialPreview = (content) => {
        const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:v\/|e(?:mbed)\/|shorts\/|watch\?v=)|youtu\.be\/|youtube-nocookie\.com\/(?:v|e(?:mbed)\/))([a-zA-Z0-9_-]{11})/;
        const tiktokRegex = /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com\/@[\w.-]+\/video\/(\d+)|vt\.tiktok\.com\/(\w+))/;
        const instagramRegex = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com\/(?:p|reels|reel)\/([\w-]+))/;
        const xRegex = /(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/\w+\/status\/(\d+)/;

        const ytMatch = content.match(youtubeRegex);
        if (ytMatch) {
            return { type: 'youtube', id: ytMatch[1], thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg` };
        }

        const ttMatch = content.match(tiktokRegex);
        if (ttMatch) {
            const videoId = ttMatch[1] || ttMatch[2];
            return { type: 'tiktok', id: videoId, thumbnail: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png' };
        }

        const igMatch = content.match(instagramRegex);
        if (igMatch) {
            return { type: 'instagram', id: igMatch[1], thumbnail: 'https://cdn-icons-png.flaticon.com/512/174/174855.png' };
        }

        const xMatch = content.match(xRegex);
        if (xMatch) {
            return { type: 'x', id: xMatch[1], thumbnail: 'https://cdn-icons-png.flaticon.com/512/5968/5968830.png' };
        }

        return null;
    };

    const getCaretCoordinates = (textarea) => {
        const { clientWidth } = textarea;
        const styles = window.getComputedStyle(textarea);

        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.visibility = 'hidden';
        div.style.whiteSpace = 'pre-wrap';
        div.style.wordBreak = 'break-word';
        div.style.width = clientWidth + 'px';
        div.style.font = styles.font;
        div.style.padding = styles.padding;
        div.style.border = styles.border;
        div.style.lineHeight = styles.lineHeight;

        const content = textarea.value.substring(0, textarea.selectionStart);
        div.textContent = content;

        const span = document.createElement('span');
        span.textContent = textarea.value.substring(textarea.selectionStart) || '.';
        div.appendChild(span);

        document.body.appendChild(div);
        const { offsetLeft: spanLeft, offsetTop: spanTop } = span;
        document.body.removeChild(div);

        return {
            top: spanTop + parseInt(styles.lineHeight || 20),
            left: Math.min(spanLeft, clientWidth - 200)
        };
    };

    const handleTextareaChange = (value, type, commentId = null) => {
        const textarea = type === 'post' ?
            document.querySelector('.post-textarea') :
            document.querySelector(`.comment-input-${commentId}`);

        const cursorPosition = textarea?.selectionStart || 0;
        const textBeforeCursor = value.substring(0, cursorPosition);
        const match = textBeforeCursor.match(/:([a-z0-9_']*)$/i);

        if (match) {
            const query = match[1];
            const coords = getCaretCoordinates(textarea);
            setState(prev => ({
                ...prev,
                [type === 'post' ? 'newPostContent' : 'newCommentText']:
                    type === 'post' ? value : { ...prev.newCommentText, [commentId]: value },
                showSuggestions: true,
                suggestionQuery: query,
                suggestionIndex: 0,
                suggestionType: type,
                activeCommentId: commentId,
                suggestionCoords: coords
            }));
        } else {
            setState(prev => ({
                ...prev,
                [type === 'post' ? 'newPostContent' : 'newCommentText']:
                    type === 'post' ? value : { ...prev.newCommentText, [commentId]: value },
                showSuggestions: false,
                suggestionQuery: "",
                suggestionType: null,
                activeCommentId: null
            }));
        }
    };

    const insertSuggestion = (icon) => {
        const type = state.suggestionType;
        const commentId = state.activeCommentId;
        const value = type === 'post' ? state.newPostContent : state.newCommentText[commentId];
        const textarea = type === 'post' ?
            document.querySelector('.post-textarea') :
            document.querySelector(`.comment-input-${commentId}`);

        if (!textarea) return;

        const cursorPosition = textarea.selectionStart;
        const textBeforeCursor = value.substring(0, cursorPosition);
        const textAfterCursor = value.substring(cursorPosition);
        const lastColonIndex = textBeforeCursor.lastIndexOf(':');

        const newValue = textBeforeCursor.substring(0, lastColonIndex) + `:${icon.name.toLowerCase().replace(/\s+/g, '_').replace(/['.]/g, '')}: ` + textAfterCursor;

        if (type === 'post') {
            setState(prev => ({ ...prev, newPostContent: newValue, showSuggestions: false }));
        } else {
            setState(prev => ({
                ...prev,
                newCommentText: { ...prev.newCommentText, [commentId]: newValue },
                showSuggestions: false
            }));
        }

        setTimeout(() => {
            textarea.focus();
            const newPos = lastColonIndex + icon.name.length + 3;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };

    const handleKeyDown = (e) => {
        if (!state.showSuggestions) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setState(prev => ({ ...prev, suggestionIndex: Math.min(prev.suggestionIndex + 1, 4) }));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setState(prev => ({ ...prev, suggestionIndex: Math.max(prev.suggestionIndex - 1, 0) }));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            document.querySelector('.suggestion-item.active')?.click();
        } else if (e.key === 'Escape') {
            setState(prev => ({ ...prev, showSuggestions: false }));
        }
    };

    const createPost = async () => {
        const hasContent = state.newPostContent.trim().length > 0;
        const hasImages = state.newPostImages.length > 0;

        if (!user || (!hasContent && !hasImages) || state.creatingPost) return;

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


            const estimatedSize = JSON.stringify(postData).length;
            if (estimatedSize > 1040000) {
                alert(`Post is too large (${Math.round(estimatedSize / 1024)}KB). Firestore limit is 1MB. Please use fewer or smaller images.`);
                setState(prev => ({ ...prev, creatingPost: false }));
                return;
            }

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
            alert("Failed to create post: " + (error.message || "Unknown error"));
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
            const socialPreview = getSocialPreview(state.editContent);
            await updateDoc(postRef, {
                content: state.editContent.trim(),
                socialPreview: socialPreview || null,
                updatedAt: serverTimestamp()
            });

            setState(prev => ({
                ...prev,
                editingPostId: null,
                editContent: "",
                updatingPost: false
            }));

            if (editPostInputRef.current) editPostInputRef.current.clear();
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


    const resizeImage = (file, maxWidth = 600, maxHeight = 600) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/webp', 0.7));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });

    const handlePostImageSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 1 * 1024 * 1024) return alert("Image too large (Max 1MB)");

        try {

            const resizedBase64 = await resizeImage(file, 600, 600);


            if (resizedBase64.length > 500000) {
                if (!window.confirm("This image is quite large even after compression. It might prevent posting. Add anyway?")) {
                    e.target.value = null;
                    return;
                }
            }

            setState(prev => ({
                ...prev,
                newPostImages: [...prev.newPostImages, resizedBase64]
            }));
            e.target.value = null;
        } catch (err) {
            console.error("Error processing image:", err);
            alert("Error processing image");
            e.target.value = null;
        }
    };

    const handlePaste = async (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    try {
                        const resizedBase64 = await resizeImage(file, 600, 600);
                        if (resizedBase64.length > 500000) {
                            if (!window.confirm("Pasted image is large. It might prevent posting. Add anyway?")) {
                                continue;
                            }
                        }
                        setState(prev => ({
                            ...prev,
                            newPostImages: [...prev.newPostImages, resizedBase64]
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
        <div className={`profile-posts-container ${isFeedsPage ? 'feeds-layout-variant' : ''}`}>
            {isOwnProfile && (
                <div className={`make-post-container ${isFeedsPage ? 'feeds-variant' : ''}`}>
                    <h4>Create a Post</h4>
                    <div className="post-input-wrapper">
                        <textarea
                            placeholder={isFeedsPage ? "Share something with the community... | TIP: Type : to add champion, item or emoji icons!" : "Share something with the community... | TIP: Type : to add champion, item or emoji icons!"}
                            className="post-textarea"
                            value={state.newPostContent}
                            onChange={(e) => handleTextareaChange(e.target.value, 'post')}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            maxLength={500}
                        ></textarea>


                        {state.showSuggestions && state.suggestionType === 'post' && (
                            <div className="post-suggestions-wrapper" style={{
                                position: 'absolute',
                                top: state.suggestionCoords.top,
                                left: state.suggestionCoords.left,
                                zIndex: 4001
                            }}>
                                <LoLSuggestions
                                    query={state.suggestionQuery}
                                    activeIndex={state.suggestionIndex}
                                    onSelect={insertSuggestion}
                                />
                            </div>
                        )}

                        <div className="post-char-counter">
                            {state.newPostContent.length}/500 characters
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

                        <div className="post-footer-row">
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
                                    disabled={(!state.newPostContent.trim() && state.newPostImages.length === 0) || state.creatingPost}
                                >
                                    {state.creatingPost ? "Posting..." : "Post to Feed"}
                                </button>
                            </div>
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
                                            <IconRenderer text={post.content} />
                                        )}
                                    </div>

                                    {post.socialPreview && (
                                        <div className="social-preview-container">
                                            {post.socialPreview.type === 'youtube' && (
                                                <div className="yt-embed-wrapper">
                                                    <iframe
                                                        width="100%"
                                                        height="360"
                                                        src={`https://www.youtube.com/embed/${post.socialPreview.id}`}
                                                        title="YouTube video player"
                                                        frameBorder="0"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    ></iframe>
                                                </div>
                                            )}
                                            {post.socialPreview.type === 'tiktok' && (
                                                <div className="tt-embed-wrapper">
                                                    <iframe
                                                        src={`https://www.tiktok.com/embed/v2/${post.socialPreview.id}`}
                                                        style={{ width: '100%', height: '700px', border: 'none' }}
                                                        allowFullScreen
                                                        title="TikTok player"
                                                    ></iframe>
                                                </div>
                                            )}
                                            {post.socialPreview.type === 'instagram' && (
                                                <div className="ig-embed-wrapper">
                                                    <iframe
                                                        src={`https://www.instagram.com/p/${post.socialPreview.id}/embed`}
                                                        width="100%"
                                                        height="600"
                                                        frameBorder="0"
                                                        scrolling="no"
                                                        allowTransparency="true"
                                                        title="Instagram player"
                                                    ></iframe>
                                                </div>
                                            )}
                                            {post.socialPreview.type === 'x' && (
                                                <div className="x-embed-wrapper">
                                                    <iframe
                                                        border="0"
                                                        frameBorder="0"
                                                        height="500"
                                                        width="100%"
                                                        src={`https://platform.twitter.com/embed/Tweet.html?dnt=false&embedId=twitter-widget-0&frame=false&hideCard=false&hideThread=false&id=${post.socialPreview.id}&lang=en&origin=${window.location.origin}&theme=dark`}
                                                        title="X (Twitter) player"
                                                    ></iframe>
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
                                                                        <IconRenderer text={comment.text} className="comment-text" />
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
                                        <div className="add-comment-container">
                                            <div className="comment-input-wrapper" style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Write a comment..."
                                                    className={`comment-input comment-input-${post.id}`}
                                                    value={state.newCommentText[post.id] || ""}
                                                    onChange={(e) => handleTextareaChange(e.target.value, 'comment', post.id)}
                                                    onKeyDown={handleKeyDown}
                                                    onKeyPress={(e) => e.key === 'Enter' && !state.showSuggestions && handleAddComment(post.id)}
                                                    maxLength={250}
                                                />
                                                <span className="comment-char-limit" style={{
                                                    fontSize: '0.7rem',
                                                    color: '#666',
                                                    alignSelf: 'flex-end',
                                                    marginTop: '2px',
                                                    marginRight: '4px'
                                                }}>
                                                    {(state.newCommentText[post.id] || "").length}/250
                                                </span>

                                                {state.showSuggestions && state.suggestionType === 'comment' && state.activeCommentId === post.id && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: 'calc(100% + 8px)',
                                                        left: '0',
                                                        top: 'auto',
                                                        zIndex: 9999,
                                                        width: '100%',
                                                        minWidth: '200px'
                                                    }}>
                                                        <LoLSuggestions
                                                            query={state.suggestionQuery}
                                                            activeIndex={state.suggestionIndex}
                                                            onSelect={insertSuggestion}
                                                        />
                                                    </div>
                                                )}
                                            </div>
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
