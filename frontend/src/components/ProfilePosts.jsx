import React, { useState, useRef, useEffect } from "react";
import { db } from "../firebase";
import {
    collection, addDoc, updateDoc, deleteDoc, doc,
    serverTimestamp, arrayUnion, arrayRemove,
    onSnapshot, query, orderBy, increment
} from "firebase/firestore";
import IconRenderer, { LoLSuggestions } from "./IconRenderer";
import { X, ChevronDown, Lock, Send, Image as ImageIcon } from "lucide-react";
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
        suggestionCoords: { top: 0, left: 0 },
        showAuthPrompt: false,
        subComments: {},
        isDragging: false
    });

    const postImageInputRef = useRef(null);
    const commentsRef = useRef(null); // Ref for auto-scrolling to comments
    const editPostInputRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!state.showSuggestions) return;

            const isInput = event.target.closest('.post-textarea') ||
                event.target.closest('.comment-box-field') ||
                event.target.closest('.edit-textarea') ||
                event.target.closest('.comment-edit-input');
            const isDropdown = event.target.closest('.suggestion-dropdown');

            if (!isInput && !isDropdown) {
                setState(prev => ({ ...prev, showSuggestions: false }));
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [state.showSuggestions]);

    // Add effect to listen for sub-collection comments when a post is opened
    useEffect(() => {
        if (!state.openCommentsPostId) return;

        const postId = state.openCommentsPostId;
        const commentsQuery = query(
            collection(db, "posts", postId, "comments"),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
            const comments = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id, // Ensure we use the actual Firebase Document ID
                    localId: data.id // Keep the internal ID if needed
                };
            });
            setState(prev => ({
                ...prev,
                subComments: { ...prev.subComments, [postId]: comments }
            }));
        });

        return () => unsubscribe();
    }, [state.openCommentsPostId]);



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
        const match = textBeforeCursor.match(/:([a-z0-9_\']*)$/i);

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

        const newValue = textBeforeCursor.substring(0, lastColonIndex) + `:${icon.name.toLowerCase().replace(/\s+/g, '_').replace(/[\'.]/g, '')}: ` + textAfterCursor;

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

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!state.isDragging) setState(prev => ({ ...prev, isDragging: true }));
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setState(prev => ({ ...prev, isDragging: false }));
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setState(prev => ({ ...prev, isDragging: false }));

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const imageFiles = files.filter(file => file.type.startsWith('image/'));
            const imagePromises = imageFiles.map(file => fileToBase64(file));
            const base64Images = await Promise.all(imagePromises);
            setState(prev => ({ ...prev, newPostImages: [...prev.newPostImages, ...base64Images] }));
        }
    };

    const createPost = async () => {
        if (!user) {
            setState(prev => ({ ...prev, showAuthPrompt: true }));
            return;
        }

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
                alert(`Post is too large (${Math.round(estimatedSize / 1024)}KB). Please use fewer or smaller images.`);
                setState(prev => ({ ...prev, creatingPost: false }));
                return;
            }

            await addDoc(collection(db, "posts"), postData);

            setState(prev => ({
                ...prev,
                newPostContent: "",
                newPostImages: [],
                creatingPost: false,
                postVisibility: "public",
                postSuccess: true
            }));

            if (onPostCreated) onPostCreated();

            setTimeout(() => {
                setState(prev => ({ ...prev, postSuccess: false }));
            }, 3000);
        } catch (error) {
            console.error("Error creating post:", error);
            alert("Failed to create post.");
            setState(prev => ({ ...prev, creatingPost: false }));
        }
    };

    const deletePost = async (postId) => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;

        try {
            await deleteDoc(doc(db, "posts", postId));
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
        } catch (error) {
            console.error("Error updating post:", error);
            alert("Failed to update post.");
            setState(prev => ({ ...prev, updatingPost: false }));
        }
    };

    const handleLike = async (post) => {
        if (!user) {
            setState(prev => ({ ...prev, showAuthPrompt: true }));
            return;
        }
        const postRef = doc(db, "posts", post.id);
        const userId = user.uid;

        const userData = {
            userId: userId,
            username: user.displayName || "Anonymous User",
            profileImage: profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"
        };

        const existingLike = post.likes?.find(l => (l.userId === userId || l.uid === userId));
        const existingDislike = post.dislikes?.find(d => (d.userId === userId || d.uid === userId));

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
        if (!user) {
            setState(prev => ({ ...prev, showAuthPrompt: true }));
            return;
        }
        const postRef = doc(db, "posts", post.id);
        const userId = user.uid;

        const userData = {
            userId: userId,
            username: user.displayName || "Anonymous User",
            profileImage: profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"
        };

        const existingLike = post.likes?.find(l => (l.userId === userId || l.uid === userId));
        const existingDislike = post.dislikes?.find(d => (d.userId === userId || d.uid === userId));

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
        if (!user) {
            setState(prev => ({ ...prev, showAuthPrompt: true }));
            return;
        }
        const commentText = state.newCommentText[postId]?.trim();
        if (!commentText) return;

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

            await addDoc(collection(db, "posts", postId, "comments"), newComment);

            // Increment the comment count on the post document for the feed list view
            // NOTE: You must update your Firestore rules to allow this field!
            try {
                await updateDoc(postRef, {
                    commentCount: increment(1)
                });
            } catch (ruleErr) {
                console.warn("Could not update commentCount. Check Firestore rules.", ruleErr);
            }

            setState(prev => ({
                ...prev,
                newCommentText: { ...prev.newCommentText, [postId]: "" },
                postingCommentId: null
            }));
        } catch (error) {
            console.error("Error adding comment:", error);
            alert("Failed to add comment.");
            setState(prev => ({ ...prev, postingCommentId: null }));
        }
    };

    const deleteComment = async (postId, commentId) => {
        if (!window.confirm("Delete this comment?")) return;

        console.log("Starting deletion for comment:", commentId, "in post:", postId);

        try {
            setState(prev => ({ ...prev, deletingCommentId: commentId }));

            const isSubComment = state.subComments[postId]?.some(c => c.id === commentId);
            const postRef = doc(db, "posts", postId);
            const post = posts.find(p => p.id === postId);
            const currentCount = post?.commentCount || 0;

            console.log("Detection - isSubComment:", isSubComment);

            if (isSubComment) {
                console.log("Deleting from sub-collection...");
                // 1. Delete from sub-collection
                await deleteDoc(doc(db, "posts", postId, "comments", commentId));

                // Only decrement if count > 0 to prevent negative numbers
                console.log("Updating post commentCount...");
                if (currentCount > 0) {
                    await updateDoc(postRef, {
                        commentCount: increment(-1)
                    });
                }
            } else {
                console.log("Deleting from legacy array...");
                // 2. Handle legacy array comment
                const commentToDelete = post?.comments?.find(c => c.id === commentId);
                if (commentToDelete) {
                    await updateDoc(postRef, {
                        comments: arrayRemove(commentToDelete),
                        // Only decrement if we actually found and are removing a comment
                        commentCount: currentCount > 0 ? increment(-1) : 0
                    });
                } else {
                    console.warn("Comment not found in legacy array.");
                }
            }

            console.log("Deletion successful.");
            setState(prev => ({ ...prev, deletingCommentId: null }));
        } catch (error) {
            console.error("Detailed Deletion Error:", error);
            alert(`Failed to delete comment: ${error.message || "Unknown error"}`);
            setState(prev => ({ ...prev, deletingCommentId: null }));
        }
    };

    // Need to fix deleteComment to work properly with Firebase arrayRemove
    // For now let's just finish the UI parts

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

            const isSubComment = state.subComments[postId]?.some(c => c.id === commentId);

            if (isSubComment) {
                const commentRef = doc(db, "posts", postId, "comments", commentId);
                await updateDoc(commentRef, {
                    text: state.editCommentText.trim(),
                    updatedAt: serverTimestamp()
                });
            } else {
                // Legacy array update (requires removing old and adding new)
                const postRef = doc(db, "posts", postId);
                const post = posts.find(p => p.id === postId);
                const oldComment = post?.comments?.find(c => c.id === commentId);

                if (oldComment) {
                    const updatedComment = { ...oldComment, text: state.editCommentText.trim(), updatedAt: new Date().toISOString() };
                    // Array update is tricky in Firestore - usually requires transactional get/set or delete/add
                    await updateDoc(postRef, {
                        comments: arrayRemove(oldComment)
                    });
                    await updateDoc(postRef, {
                        comments: arrayUnion(updatedComment)
                    });
                }
            }

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

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + state.newPostImages.length > 4) {
            alert("Maximum 4 images allowed per post.");
            return;
        }

        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setState(prev => ({
                    ...prev,
                    newPostImages: [...prev.newPostImages, reader.result]
                }));
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index) => {
        setState(prev => ({
            ...prev,
            newPostImages: prev.newPostImages.filter((_, i) => i !== index)
        }));
    };

    const formatPostTime = (timestamp) => {
        if (!timestamp) return "Just now";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.max(0, Math.floor((now - date) / 1000));

        if (diffInSeconds < 60) return "Just now";
        if (diffInSeconds < 3600) {
            const mins = Math.floor(diffInSeconds / 60);
            return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
        }
        if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
        }
        if (diffInSeconds < 2592000) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} ${days === 1 ? 'day' : 'days'}`;
        }
        if (diffInSeconds < 31536000) {
            const months = Math.floor(diffInSeconds / 2592000);
            return `${months} ${months === 1 ? 'month' : 'months'}`;
        }
        const years = Math.floor(diffInSeconds / 31536000);
        return `${years} ${years === 1 ? 'year' : 'years'}`;
    };

    return (
        <div className={`profile-posts-container ${isFeedsPage ? 'feeds-layout-variant' : ''}`}>
            {isOwnProfile && (
                <div className={`post-creator-box glass-panel ${state.showSuggestions && state.suggestionType === 'post' ? 'has-active-suggestions' : ''}`}>
                    <div className="creator-header">
                        <div className="creator-title-bar" />
                        <h4 className="creator-title">Share something...</h4>
                        {state.postSuccess && <span className="success-message-text">Post was created!</span>}
                    </div>

                    <div
                        className={`post-textarea-wrapper ${state.isDragging ? 'dragging' : ''} ${state.showSuggestions && state.suggestionType === 'post' ? 'has-active-suggestions' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <textarea
                            className="post-textarea"
                            placeholder="What's happening in the Rift? (Type :name: for icons, or drag images here)"
                            value={state.newPostContent}
                            onChange={(e) => handleTextareaChange(e.target.value, 'post')}
                            onKeyDown={handleKeyDown}
                            maxLength={500}
                        />

                        {state.showSuggestions && state.suggestionType === 'post' && (
                            <div className="post-suggestion-popover animate-fade-in" style={{
                                top: state.suggestionCoords.top,
                                left: state.suggestionCoords.left
                            }}>
                                <LoLSuggestions
                                    query={state.suggestionQuery}
                                    activeIndex={state.suggestionIndex}
                                    onSelect={insertSuggestion}
                                />
                            </div>
                        )}

                        <div className="post-char-count">
                            {state.newPostContent.length}/500
                        </div>
                    </div>

                    {state.newPostImages.length > 0 && (
                        <div className="attached-media-row">
                            {state.newPostImages.map((img, idx) => (
                                <div key={idx} className="media-preview-item">
                                    <img src={img} alt="" className="media-preview-img" />
                                    <button className="remove-media-btn" onClick={() => removeImage(idx)}><X size={10} /></button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="creator-actions-row">
                        <div className="creator-right-tools">
                            <button
                                className="attach-media-btn"
                                onClick={() => postImageInputRef.current.click()}
                                title="Attach Media"
                            >
                                <ImageIcon />
                                <span className="btn-label-text">Add Image</span>
                            </button>
                            <input
                                type="file"
                                ref={postImageInputRef}
                                className="hidden-file-input"
                                multiple
                                accept="image/*"
                                onChange={handleImageUpload}
                            />

                            <button
                                className="submit-post-btn"
                                disabled={state.creatingPost || !state.newPostContent.trim()}
                                onClick={createPost}
                            >
                                {state.creatingPost ? "Drafting..." : "Publish Post"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="post-list-section">
                {isFeedsPage && (
                    <div className="post-list-header">
                        <div className="header-bar-glow" />
                        <h2 className="header-title-feeds">Community Feed</h2>
                    </div>
                )}

                {posts.length === 0 ? (
                    <div className="empty-posts-state">
                        <p className="empty-posts-text">No posts to display yet.</p>
                    </div>
                ) : (
                    <div className="post-cards-stack">
                        {posts.map(post => (
                            <div key={post.id} className={`post-card-outer animate-fade-in ${state.showSuggestions && state.activeCommentId === post.id ? 'has-active-suggestions' : ''}`}>
                                <div className={`post-card-inner ${state.openCommentsPostId === post.id ? 'active-comments' : ''}`}>
                                    <div className="post-columns">
                                        <div className="post-main-content">
                                            <div className="post-padding">
                                                <div className="post-header-row">
                                                    <div className="post-author-block">
                                                        <div className="author-avatar-wrapper">
                                                            <img
                                                                src={post.userProfileImage || profileImage}
                                                                alt=""
                                                                className="author-avatar"
                                                                onClick={() => post.userId && (window.location.href = `/profile/${post.userId}`)}
                                                            />
                                                        </div>
                                                        <h5 className="author-name-text" onClick={() => post.userId && (window.location.href = `/profile/${post.userId}`)}>
                                                            {post.username || "Anonymous User"}
                                                        </h5>
                                                        <div className="post-time-row">
                                                            <span className="post-timestamp">
                                                                <span className="timestamp-dot">•</span>
                                                                {formatPostTime(post.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {isOwnProfile && (post.userId === user?.uid || post.uid === user?.uid) && (
                                                        <div className="post-actions-menu">
                                                            <button
                                                                className="action-btn"
                                                                onClick={() => startEditingPost(post)}
                                                                title="Edit Post"
                                                            >
                                                                <img src="/project-icons/Profile icons/edit.png" alt="" />
                                                            </button>
                                                            <button
                                                                className="action-btn delete"
                                                                onClick={() => deletePost(post.id)}
                                                                title="Delete Post"
                                                            >
                                                                <X />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="post-content-container">
                                                    {state.editingPostId === post.id ? (
                                                        <div className="edit-textarea-container">
                                                            <textarea
                                                                className="edit-textarea"
                                                                value={state.editContent}
                                                                onChange={(e) => setState(prev => ({ ...prev, editContent: e.target.value }))}
                                                            />
                                                            <div className="edit-actions-row">
                                                                <button
                                                                    className="cancel-edit-btn"
                                                                    onClick={cancelEditingPost}
                                                                    disabled={state.updatingPost}
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    className="save-edit-btn"
                                                                    onClick={() => updatePost(post.id)}
                                                                    disabled={state.updatingPost || !state.editContent.trim()}
                                                                >
                                                                    {state.updatingPost ? "Saving..." : "Save Post"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="post-text">
                                                            <IconRenderer text={post.content} />
                                                        </div>
                                                    )}
                                                </div>

                                                {(post.socialPreview || (post.postImages && post.postImages.length > 0)) && (
                                                    <div className="post-media-box">
                                                        {post.socialPreview && (
                                                            <div className="social-embed-frame">
                                                                {post.socialPreview.type === 'youtube' && (
                                                                    <iframe
                                                                        width="100%"
                                                                        height="100%"
                                                                        src={`https://www.youtube.com/embed/${post.socialPreview.id}`}
                                                                        title="YouTube player"
                                                                        frameBorder="0"
                                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                        allowFullScreen
                                                                    />
                                                                )}
                                                                {post.socialPreview.type === 'tiktok' && (
                                                                    <iframe
                                                                        src={`https://www.tiktok.com/embed/v2/${post.socialPreview.id}`}
                                                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                                                        scrolling="no"
                                                                        allowFullScreen
                                                                        title="TikTok player"
                                                                    />
                                                                )}
                                                                {post.socialPreview.type === 'instagram' && (
                                                                    <iframe
                                                                        src={`https://www.instagram.com/p/${post.socialPreview.id}/embed`}
                                                                        width="100%"
                                                                        height="100%"
                                                                        frameBorder="0"
                                                                        scrolling="no"
                                                                        allowTransparency="true"
                                                                        title="Instagram player"
                                                                    />
                                                                )}
                                                                {post.socialPreview.type === 'x' && (
                                                                    <iframe
                                                                        border="0"
                                                                        frameBorder="0"
                                                                        height="100%"
                                                                        width="100%"
                                                                        src={`https://platform.twitter.com/embed/Tweet.html?dnt=false&embedId=twitter-widget-0&frame=false&hideCard=false&hideThread=false&id=${post.socialPreview.id}&lang=en&origin=${window.location.origin}&theme=dark`}
                                                                        title="X player"
                                                                    />
                                                                )}
                                                            </div>
                                                        )}

                                                        {post.postImages && post.postImages.length > 0 && (
                                                            <div className={`post-images-grid ${post.postImages.length > 1 ? 'multi' : 'single'}`}>
                                                                {post.postImages.map((img, idx) => (
                                                                    <div key={idx} className="post-img-wrapper">
                                                                        <img src={img} alt="" className="post-img-content" />
                                                                        <div className="img-overlay-tint" />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="engagement-row">
                                                    <button
                                                        className={`engagement-btn ${post.likes?.some(l => (l.userId === user?.uid || l.uid === user?.uid)) ? 'active-like' : ''}`}
                                                        onClick={() => handleLike(post)}
                                                    >
                                                        <img
                                                            src="/project-icons/Profile icons/thumbs-up.png"
                                                            alt=""
                                                        />
                                                        <span className="engagement-count">{post.likes?.length || 0}</span>
                                                    </button>

                                                    <button
                                                        className={`engagement-btn ${post.dislikes?.some(d => (d.userId === user?.uid || d.uid === user?.uid)) ? 'active-dislike' : ''}`}
                                                        onClick={() => handleDislike(post)}
                                                    >
                                                        <img
                                                            src="/project-icons/Profile icons/dislike.png"
                                                            alt=""
                                                        />
                                                        <span className="engagement-count">{post.dislikes?.length || 0}</span>
                                                    </button>

                                                    <button
                                                        className={`engagement-btn comment-trigger-btn ${state.openCommentsPostId === post.id ? 'active-comments' : ''}`}
                                                        onClick={() => setState(prev => ({
                                                            ...prev,
                                                            openCommentsPostId: prev.openCommentsPostId === post.id ? null : post.id
                                                        }))}
                                                    >
                                                        <img
                                                            src="/project-icons/Profile icons/comments.png"
                                                            alt=""
                                                        />
                                                        <span className="engagement-count">Comments ({post.commentCount || (post.comments?.length || 0)})</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {state.openCommentsPostId === post.id && (
                                            <div className="comments-container-open" ref={commentsRef}>
                                                <div className="comments-header-row">
                                                    <div className="comments-header-inner">
                                                        <div className="comment-title-bar" />
                                                        <h5 className="comment-title-text">Comments</h5>
                                                    </div>
                                                    <button
                                                        className="close-comments-btn"
                                                        onClick={() => setState(prev => ({ ...prev, openCommentsPostId: null }))}
                                                    >
                                                        Close
                                                    </button>
                                                </div>

                                                <div className="comment-list-scroll custom-scrollbar">
                                                    {((post.comments || []).length > 0 || (state.subComments[post.id] || []).length > 0) ? (
                                                        <>
                                                            {/* Combine old array comments and new sub-collection comments */}
                                                            {[...(post.comments || []), ...(state.subComments[post.id] || [])]
                                                                .sort((a, b) => {
                                                                    const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                                                                    const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                                                                    return timeA - timeB;
                                                                })
                                                                .map((comment) => {
                                                                    const isCommentOwner = user?.uid === comment.userId || user?.uid === comment.uid;
                                                                    const isPostOwner = user?.uid === post.userId || user?.uid === post.uid;
                                                                    const canEdit = isCommentOwner;
                                                                    const canDelete = isCommentOwner || isPostOwner;

                                                                    return (
                                                                        <div key={comment.id} className="comment-item-card">
                                                                            <img src={comment.userProfileImage} alt="" className="comment-avatar" />
                                                                            <div className="comment-content-block">
                                                                                <div className="comment-meta-row">
                                                                                    <div className="comment-author-info">
                                                                                        <span className="comment-author-name">{comment.username}</span>
                                                                                        <span className="comment-time-text">{formatPostTime(comment.createdAt)}</span>
                                                                                    </div>
                                                                                    {(canEdit || canDelete) && state.editingCommentId !== comment.id && (
                                                                                        <div className="comment-actions-menu">
                                                                                            <button
                                                                                                className="comment-action-btn"
                                                                                                onClick={() => startEditingComment(comment)}
                                                                                            >
                                                                                                <img src="/project-icons/Profile icons/edit.png" alt="" />
                                                                                            </button>
                                                                                            {canDelete && (
                                                                                                <button
                                                                                                    className="comment-action-btn"
                                                                                                    onClick={() => deleteComment(post.id, comment.id)}
                                                                                                    disabled={state.deletingCommentId === comment.id}
                                                                                                >
                                                                                                    <X size={12} />
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                {state.editingCommentId === comment.id ? (
                                                                                    <div className="comment-edit-wrapper">
                                                                                        <div className="comment-edit-relative">
                                                                                            <input
                                                                                                type="text"
                                                                                                className="comment-edit-input"
                                                                                                value={state.editCommentText}
                                                                                                onChange={(e) => setState(prev => ({ ...prev, editCommentText: e.target.value }))}
                                                                                                onKeyPress={(e) => e.key === 'Enter' && updateComment(post.id, comment.id)}
                                                                                                maxLength={250}
                                                                                            />
                                                                                            <div className="comment-edit-char-counter">
                                                                                                {state.editCommentText.length}/250
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="comment-edit-actions">
                                                                                            <button
                                                                                                className="cancel-edit-btn"
                                                                                                onClick={cancelEditingComment}
                                                                                            >
                                                                                                Cancel
                                                                                            </button>
                                                                                            <button
                                                                                                className="save-edit-btn"
                                                                                                onClick={() => updateComment(post.id, comment.id)}
                                                                                                disabled={state.updatingComment || !state.editCommentText.trim()}
                                                                                            >
                                                                                                Save
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="comment-text-content">
                                                                                        <IconRenderer text={comment.text} />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                        </>
                                                    ) : (
                                                        <div className="empty-comments-state">
                                                            <p className="empty-comments-text">No comments yet...</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="new-comment-input-row">
                                                    <div className="comment-input-field-wrapper">
                                                        <div className={`comment-input-relative ${state.showSuggestions && state.suggestionType === 'comment' && state.activeCommentId === post.id ? 'has-active-suggestions' : ''}`}>
                                                            <input
                                                                type="text"
                                                                placeholder="Write a comment..."
                                                                className={`comment-box-field comment-input-${post.id}`}
                                                                value={state.newCommentText[post.id] || ""}
                                                                onChange={(e) => handleTextareaChange(e.target.value, 'comment', post.id)}
                                                                onKeyDown={handleKeyDown}
                                                                onKeyPress={(e) => e.key === 'Enter' && !state.showSuggestions && handleAddComment(post.id)}
                                                                maxLength={250}
                                                            />

                                                            <div className="comment-char-counter">
                                                                {(state.newCommentText[post.id] || "").length}/250
                                                            </div>

                                                            {state.showSuggestions && state.suggestionType === 'comment' && state.activeCommentId === post.id && (
                                                                <div className="post-suggestion-popover animate-fade-in">
                                                                    <LoLSuggestions
                                                                        query={state.suggestionQuery}
                                                                        activeIndex={state.suggestionIndex}
                                                                        onSelect={insertSuggestion}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            className="send-comment-btn"
                                                            onClick={() => handleAddComment(post.id)}
                                                            disabled={!state.newCommentText[post.id]?.trim() || state.postingCommentId === post.id}
                                                        >
                                                            {state.postingCommentId === post.id ? (
                                                                <div className="icon-sm border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                                            ) : (
                                                                <Send className="icon-sm" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {state.showAuthPrompt && (
                    <div className="auth-prompt-overlay">
                        <div className="auth-prompt-backdrop" onClick={() => setState(prev => ({ ...prev, showAuthPrompt: false }))}></div>
                        <div className="auth-prompt-card glass-panel">
                            <div className="auth-icon-box">
                                <Lock />
                            </div>
                            <h2 className="auth-prompt-title">Authentication Required</h2>
                            <p className="auth-prompt-desc">Please log in or register to interact with the Rifthub community feed.</p>

                            <div className="auth-actions-group">
                                <button
                                    onClick={() => (window.location.href = "/login")}
                                    className="auth-login-btn"
                                >
                                    Log In
                                </button>
                                <button
                                    onClick={() => (window.location.href = "/register")}
                                    className="auth-register-btn"
                                >
                                    Create Account
                                </button>
                                <button
                                    onClick={() => setState(prev => ({ ...prev, showAuthPrompt: false }))}
                                    className="auth-close-btn"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProfilePosts;
