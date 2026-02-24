import React, { useState, useRef, useEffect } from "react";
import { db } from "../firebase";
import {
    collection, addDoc, updateDoc, deleteDoc, doc,
    serverTimestamp, arrayUnion, arrayRemove
} from "firebase/firestore";
import IconRenderer, { LoLSuggestions } from "./IconRenderer";
import { Heart, MessageCircle, Share2, MoreVertical, Trash2, Edit3, Image, Link2, ExternalLink, Play, Youtube, Instagram, Twitter, Eye, X, ChevronDown, Lock, Send } from "lucide-react";

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
        showAuthPrompt: false
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
        if (!user) {
            setState(prev => ({ ...prev, showAuthPrompt: true }));
            return;
        }
        const hasContent = state.newPostContent.trim().length > 0;

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
                postVisibility: "public",
                postSuccess: true
            }));

            if (onPostCreated) onPostCreated();

            setTimeout(() => {
                setState(prev => ({ ...prev, postSuccess: false }));
            }, 3000);
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
        if (!user) {
            setState(prev => ({ ...prev, showAuthPrompt: true }));
            return;
        }
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
        if (!user) {
            setState(prev => ({ ...prev, showAuthPrompt: true }));
            return;
        }
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
        if (!user) {
            setState(prev => ({ ...prev, showAuthPrompt: true }));
            return;
        }
        const commentText = state.newCommentText[postId]?.trim();

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
                <div className={`glass-panel p-6 rounded-3xl mb-8 relative overflow-hidden group ${isFeedsPage ? 'border-primary/20 bg-primary/2' : ''}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-center gap-3 mb-6 px-1">
                        <div className="w-1 h-5 bg-primary rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                        <h4 className="font-display text-sm font-black uppercase tracking-[0.2em] italic">Create Post</h4>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <textarea
                                placeholder={isFeedsPage ? "Share something with the community... | TIP: Type : for icons" : "Share something on your profile... | TIP: Type : for icons"}
                                className="w-full bg-secondary/30 border border-white/5 rounded-2xl p-5 text-sm font-medium min-h-[120px] outline-none focus:border-primary/30 transition-all resize-none placeholder:text-muted-foreground/20 leading-relaxed"
                                value={state.newPostContent}
                                onChange={(e) => handleTextareaChange(e.target.value, 'post')}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                maxLength={500}
                            ></textarea>

                            {state.showSuggestions && state.suggestionType === 'post' && (
                                <div className="absolute z-[4001] shadow-2xl animate-in fade-in zoom-in-95 duration-200" style={{
                                    top: state.suggestionCoords.top,
                                    left: state.suggestionCoords.left,
                                }}>
                                    <LoLSuggestions
                                        query={state.suggestionQuery}
                                        activeIndex={state.suggestionIndex}
                                        onSelect={insertSuggestion}
                                    />
                                </div>
                            )}

                            <div className="absolute bottom-4 right-5 text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest">
                                {state.newPostContent.length}/500
                            </div>
                        </div>

                        {state.newPostImages.length > 0 && (
                            <div className="flex flex-wrap gap-3 p-2 bg-black/20 rounded-2xl border border-white/5">
                                {state.newPostImages.map((img, index) => (
                                    <div key={index} className="relative group/img">
                                        <img src={img} alt="" className="w-24 h-24 rounded-xl object-cover border border-white/10" />
                                        <button
                                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
                                            onClick={() => removePostImage(index)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                            <div className="flex-1 flex items-center gap-3 w-full">
                                <div className="relative flex-1">
                                    <select
                                        id="post-visibility"
                                        value={state.postVisibility}
                                        onChange={(e) => setState(prev => ({ ...prev, postVisibility: e.target.value }))}
                                        className="w-full bg-secondary/50 border border-white/5 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary/20 appearance-none cursor-pointer text-muted-foreground hover:text-white transition-colors"
                                    >
                                        <option value="public">Global Feed</option>
                                        <option value="profile-only">Local Feed</option>
                                        <option value="private">Private (Friends Only)</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground/30" />
                                </div>

                                <button
                                    className="p-3 rounded-xl bg-secondary/50 border border-white/5 hover:border-primary/30 transition-all group/btn"
                                    onClick={() => postImageInputRef.current?.click()}
                                    title="Attach Media"
                                >
                                    <Image className="w-4 h-4 opacity-50 group-hover/btn:opacity-100 transition-opacity" />
                                </button>
                                <input
                                    type="file"
                                    ref={postImageInputRef}
                                    onChange={handlePostImageSelect}
                                    accept="image/*"
                                    style={{ display: "none" }}
                                />
                            </div>

                            <button
                                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-black font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/10 hover:bg-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                                onClick={createPost}
                                disabled={(!state.newPostContent.trim() && state.newPostImages.length === 0) || state.creatingPost}
                            >
                                {state.creatingPost ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                        Posting...
                                    </>
                                ) : "Create Post"}
                            </button>
                        </div>

                        {state.postSuccess && (
                            <div className="text-[10px] font-black uppercase tracking-widest text-green-500 italic animate-pulse text-center sm:text-left ml-1">
                                Post successfully published
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(234,179,8,0.3)]" />
                    <h4 className="font-display text-lg font-black uppercase tracking-[0.2em] italic">Recent Activity</h4>
                </div>

                {posts.length === 0 ? (
                    <div className="glass-panel p-16 rounded-3xl flex flex-col items-center justify-center text-center">
                        <p className="text-muted-foreground/30 font-black text-[10px] uppercase tracking-[0.3em]">
                            No posts yet...
                        </p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {posts.map(post => (
                            <div key={post.id} className={`group/post animate-in slide-in-from-bottom-4 duration-500`}>
                                <div className={`glass-panel rounded-3xl overflow-hidden border-white/5 bg-secondary/10 hover:border-primary/20 transition-all duration-500 ${state.openCommentsPostId === post.id ? 'shadow-2xl shadow-primary/5 border-primary/10 bg-primary/2' : ''}`}>
                                    <div className="p-6">
                                        <div className="flex items-start justify-between gap-4 mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <img
                                                        src={post.userProfileImage || profileImage}
                                                        alt=""
                                                        className="w-12 h-12 rounded-xl object-cover border-2 border-white/5 shadow-xl transition-transform group-hover/post:scale-105"
                                                    />
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                                                </div>
                                                <div>
                                                    <h5 className="font-display text-sm font-black text-white hover:text-primary transition-colors cursor-pointer uppercase tracking-wider italic">
                                                        {post.username || user?.displayName || "Anonymous User"}
                                                    </h5>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.15em] flex items-center gap-1.5">
                                                            <div className="w-1 h-1 rounded-full bg-current opacity-30" />
                                                            {formatPostTime(post.createdAt)}
                                                        </span>
                                                        {post.visibility && post.visibility !== "public" && (
                                                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-muted-foreground/70">
                                                                {post.visibility === "profile-only" ? "Local" : "Private"}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {isOwnProfile && post.userId === user?.uid && (
                                                <div className="flex items-center gap-1 opacity-20 group-hover/post:opacity-100 transition-opacity">
                                                    <button
                                                        className="p-2 rounded-lg hover:bg-white/5 hover:text-primary transition-all active:scale-90"
                                                        onClick={() => startEditingPost(post)}
                                                        title="Edit Post"
                                                    >
                                                        <img src="/project-icons/Profile icons/edit.png" alt="" className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                                                    </button>
                                                    <button
                                                        className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-90"
                                                        onClick={() => deletePost(post.id)}
                                                        title="Delete Post"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mb-6 leading-relaxed select-text">
                                            {state.editingPostId === post.id ? (
                                                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                                    <textarea
                                                        className="w-full bg-black/40 border border-primary/20 rounded-2xl p-4 text-sm font-medium outline-none focus:border-primary transition-all resize-none min-h-[100px]"
                                                        value={state.editContent}
                                                        onChange={(e) => setState(prev => ({ ...prev, editContent: e.target.value }))}
                                                    />
                                                    <div className="flex justify-end gap-3">
                                                        <button
                                                            className="px-4 py-2 rounded-xl bg-secondary text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                                                            onClick={cancelEditingPost}
                                                            disabled={state.updatingPost}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            className="px-4 py-2 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg active:scale-95"
                                                            onClick={() => updatePost(post.id)}
                                                            disabled={state.updatingPost || !state.editContent.trim()}
                                                        >
                                                            {state.updatingPost ? "Saving..." : "Save Post"}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm font-medium text-white/90">
                                                    <IconRenderer text={post.content} />
                                                </div>
                                            )}
                                        </div>

                                        {(post.socialPreview || (post.postImages && post.postImages.length > 0)) && (
                                            <div className="rounded-2xl border border-white/5 bg-black/20 overflow-hidden mb-6">
                                                {post.socialPreview && (
                                                    <div className="aspect-video w-full bg-black/40">
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
                                                    <div className={`grid gap-px bg-white/5 ${post.postImages.length > 1 ? 'grid-cols-2 aspect-video' : 'grid-cols-1'}`}>
                                                        {post.postImages.map((img, idx) => (
                                                            <div key={idx} className="relative group/media overflow-hidden">
                                                                <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-110" />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/media:opacity-100 transition-opacity" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                            <button
                                                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all active:scale-95 group/btn ${post.likes?.some(l => l.uid === user?.uid) ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-white/2 hover:bg-white/5 text-muted-foreground border border-transparent'}`}
                                                onClick={() => handleLike(post)}
                                            >
                                                <img
                                                    src="/project-icons/Profile icons/thumbs-up.png"
                                                    alt=""
                                                    className={`w-4 h-4 transition-transform group-hover/btn:scale-125 object-contain ${post.likes?.some(l => l.uid === user?.uid) ? '' : 'opacity-50 group-hover/btn:opacity-100'}`}
                                                />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{post.likes?.length || 0}</span>
                                            </button>

                                            <button
                                                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all active:scale-95 group/btn ${post.dislikes?.some(d => d.uid === user?.uid) ? 'bg-red-500/20 text-red-500 border border-red-500/20' : 'bg-white/2 hover:bg-white/5 text-muted-foreground border border-transparent'}`}
                                                onClick={() => handleDislike(post)}
                                            >
                                                <img
                                                    src="/project-icons/Profile icons/dislike.png"
                                                    alt=""
                                                    className={`w-4 h-4 transition-transform group-hover/btn:rotate-12 object-contain ${post.dislikes?.some(d => d.uid === user?.uid) ? '' : 'opacity-50 group-hover/btn:opacity-100'}`}
                                                />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{post.dislikes?.length || 0}</span>
                                            </button>

                                            <button
                                                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all active:scale-95 group/btn flex-1 justify-center ${state.openCommentsPostId === post.id ? 'bg-primary/10 text-primary border border-primary/10' : 'bg-white/2 hover:bg-white/5 text-muted-foreground border border-transparent'}`}
                                                onClick={() => setState(prev => ({
                                                    ...prev,
                                                    openCommentsPostId: prev.openCommentsPostId === post.id ? null : post.id
                                                }))}
                                            >
                                                <img
                                                    src="/project-icons/Profile icons/comments.png"
                                                    alt=""
                                                    className={`w-4 h-4 object-contain ${state.openCommentsPostId === post.id ? '' : 'opacity-50 group-hover/btn:opacity-100'}`}
                                                />
                                                <span className="text-[10px] font-black uppercase tracking-widest italic">Comments ({post.comments?.length || 0})</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {state.openCommentsPostId === post.id && (
                                    <div className="mt-6 border-t border-white/5 pt-6 flex flex-col gap-6 animate-in slide-in-from-top-4 duration-300">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1 h-3 bg-primary rounded-full" />
                                                <h5 className="text-[10px] font-black uppercase tracking-widest italic text-primary/70">Comments</h5>
                                            </div>
                                            <button
                                                className="p-1 px-3 rounded-lg bg-white/2 hover:bg-white/5 text-[9px] font-black uppercase tracking-widest text-muted-foreground transition-all"
                                                onClick={() => setState(prev => ({ ...prev, openCommentsPostId: null }))}
                                            >
                                                Close
                                            </button>
                                        </div>

                                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                            {post.comments && post.comments.length > 0 ? (
                                                <div className="space-y-4">
                                                    {post.comments.map((comment) => {
                                                        const isCommentOwner = user?.uid === comment.userId;
                                                        const isPostOwner = user?.uid === post.userId;
                                                        const canEdit = isCommentOwner;
                                                        const canDelete = isCommentOwner || isPostOwner;

                                                        return (
                                                            <div key={comment.id} className="group/comment flex items-start gap-3 bg-white/2 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                                                <img src={comment.userProfileImage} alt="" className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[10px] font-black uppercase tracking-wider text-white/80">{comment.username}</span>
                                                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">{formatPostTime(comment.createdAt)}</span>
                                                                        </div>
                                                                        {(canEdit || canDelete) && state.editingCommentId !== comment.id && (
                                                                            <div className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                                                                <button
                                                                                    className="p-1.5 rounded-md hover:bg-white/5 hover:text-primary transition-all active:scale-90"
                                                                                    onClick={() => startEditingComment(comment)}
                                                                                >
                                                                                    <img src="/project-icons/Profile icons/edit.png" alt="" className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                                                                                </button>
                                                                                {canDelete && (
                                                                                    <button
                                                                                        className="p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-90"
                                                                                        onClick={() => deleteComment(post.id, comment.id)}
                                                                                        disabled={state.deletingCommentId === comment.id}
                                                                                    >
                                                                                        <X className="w-3 h-3" />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {state.editingCommentId === comment.id ? (
                                                                        <div className="space-y-2 py-1">
                                                                            <input
                                                                                type="text"
                                                                                className="w-full bg-black/40 border border-primary/20 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-primary transition-all"
                                                                                value={state.editCommentText}
                                                                                onChange={(e) => setState(prev => ({ ...prev, editCommentText: e.target.value }))}
                                                                                onKeyPress={(e) => e.key === 'Enter' && updateComment(post.id, comment.id)}
                                                                            />
                                                                            <div className="flex justify-end gap-2">
                                                                                <button
                                                                                    className="px-3 py-1 rounded-lg bg-secondary text-[8px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                                                                                    onClick={cancelEditingComment}
                                                                                >
                                                                                    Cancel
                                                                                </button>
                                                                                <button
                                                                                    className="px-3 py-1 rounded-lg bg-primary text-black text-[8px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg active:scale-95"
                                                                                    onClick={() => updateComment(post.id, comment.id)}
                                                                                    disabled={state.updatingComment || !state.editCommentText.trim()}
                                                                                >
                                                                                    Save
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-xs text-muted-foreground leading-relaxed">
                                                                            <IconRenderer text={comment.text} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 opacity-20">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.3em]">No comments yet...</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="relative pt-2">
                                            <div className="flex items-center gap-3">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="text"
                                                        placeholder="Write a comment..."
                                                        className={`w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-xs font-medium outline-none focus:border-primary/30 transition-all placeholder:text-muted-foreground/20 comment-input-${post.id}`}
                                                        value={state.newCommentText[post.id] || ""}
                                                        onChange={(e) => handleTextareaChange(e.target.value, 'comment', post.id)}
                                                        onKeyDown={handleKeyDown}
                                                        onKeyPress={(e) => e.key === 'Enter' && !state.showSuggestions && handleAddComment(post.id)}
                                                        maxLength={250}
                                                    />

                                                    <div className="absolute right-3 bottom-0.5 text-[7px] font-black text-white/10 uppercase tracking-widest">
                                                        {(state.newCommentText[post.id] || "").length}/250
                                                    </div>

                                                    {state.showSuggestions && state.suggestionType === 'comment' && state.activeCommentId === post.id && (
                                                        <div className="absolute bottom-full left-0 w-full mb-2 z-[9999] shadow-2xl animate-in fade-in slide-in-from-bottom-2">
                                                            <LoLSuggestions
                                                                query={state.suggestionQuery}
                                                                activeIndex={state.suggestionIndex}
                                                                onSelect={insertSuggestion}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    className="p-3 rounded-xl bg-primary text-black hover:bg-white transition-all active:scale-90 disabled:opacity-30 shadow-lg shadow-primary/5"
                                                    onClick={() => handleAddComment(post.id)}
                                                    disabled={!state.newCommentText[post.id]?.trim() || state.postingCommentId === post.id}
                                                >
                                                    {state.postingCommentId === post.id ? (
                                                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                                    ) : (
                                                        <Send className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {state.showAuthPrompt && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setState(prev => ({ ...prev, showAuthPrompt: false }))}></div>
                    <div className="max-w-md w-full glass-panel p-10 text-center relative z-10 animate-in zoom-in-95 duration-300 border-primary/30">
                        <div className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto mb-8 flex items-center justify-center border border-primary/20">
                            <Lock className="w-10 h-10 text-primary" />
                        </div>
                        <h2 className="font-display text-3xl font-black tracking-tighter mb-4 italic text-white uppercase">Authentication Required</h2>
                        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">Please log in or register to interact with the Rifthub community feed.</p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => window.location.href = "/login"}
                                className="w-full bg-primary text-black font-black py-4 rounded-xl hover:bg-white transition-all active:scale-95 shadow-xl shadow-primary/20 uppercase tracking-widest text-xs"
                            >
                                Log In
                            </button>
                            <button
                                onClick={() => window.location.href = "/register"}
                                className="w-full bg-secondary/50 text-white border border-white/10 font-black py-4 rounded-xl hover:bg-white/10 transition-all active:scale-95 uppercase tracking-widest text-xs"
                            >
                                Create Account
                            </button>
                            <button
                                onClick={() => setState(prev => ({ ...prev, showAuthPrompt: false }))}
                                className="w-full bg-transparent text-muted-foreground font-black py-2 rounded-xl hover:text-white transition-all text-[10px] uppercase tracking-widest"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProfilePosts;
