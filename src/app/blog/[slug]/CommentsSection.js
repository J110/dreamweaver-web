'use client';

import { useState, useCallback } from 'react';
import styles from './CommentsSection.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) === 1 ? '' : 's'} ago`;
}

function CommentItem({ comment, slug, onReply, depth = 0 }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(comment.likes || 0);

  const handleLike = useCallback(async () => {
    const action = liked ? 'unlike' : 'like';
    try {
      const res = await fetch(`${API_URL}/api/v1/blog/comments/${comment.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setLikes(data.likes);
        setLiked(!liked);
      }
    } catch {}
  }, [comment.id, liked]);

  return (
    <div className={`${styles.comment} ${depth > 0 ? styles.reply : ''}`}>
      <div className={styles.commentHeader}>
        <span className={styles.commentAuthor}>{comment.displayName}</span>
        <span className={styles.commentTime}>{timeAgo(comment.createdAt)}</span>
      </div>
      <p className={styles.commentBody}>{comment.body}</p>
      <div className={styles.commentActions}>
        <button
          onClick={handleLike}
          className={`${styles.commentLike} ${liked ? styles.commentLiked : ''}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {likes > 0 && <span>{likes}</span>}
        </button>
        {depth === 0 && (
          <button onClick={() => onReply(comment.id)} className={styles.replyBtn}>
            Reply
          </button>
        )}
      </div>
    </div>
  );
}

export default function CommentsSection({ slug, initialComments = [] }) {
  const [comments, setComments] = useState(initialComments);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyName, setReplyName] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submitComment = useCallback(
    async (displayName, commentBody, parentId = null) => {
      setSubmitting(true);
      setError('');
      try {
        const res = await fetch(`${API_URL}/api/v1/blog/posts/${slug}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: displayName.trim(),
            body: commentBody.trim(),
            parentId,
          }),
        });
        if (res.ok) {
          const newComment = await res.json();
          setComments((prev) => [...prev, newComment]);
          return true;
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.detail || 'Failed to post comment. Please try again.');
          return false;
        }
      } catch {
        setError('Network error. Please try again.');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [slug]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await submitComment(name, body);
    if (ok) {
      setBody('');
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    const ok = await submitComment(replyName, replyBody, replyTo);
    if (ok) {
      setReplyTo(null);
      setReplyName('');
      setReplyBody('');
    }
  };

  // Organize comments: top-level first, then their replies
  const topLevel = comments.filter((c) => !c.parentId);
  const repliesMap = {};
  comments
    .filter((c) => c.parentId)
    .forEach((c) => {
      if (!repliesMap[c.parentId]) repliesMap[c.parentId] = [];
      repliesMap[c.parentId].push(c);
    });

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        Comments ({comments.length})
      </h2>

      {/* Comment list */}
      <div className={styles.commentList}>
        {topLevel.map((comment) => (
          <div key={comment.id}>
            <CommentItem
              comment={comment}
              slug={slug}
              onReply={(id) => {
                setReplyTo(id);
                setReplyName(name); // Pre-fill from top-level form
              }}
            />
            {/* Replies */}
            {repliesMap[comment.id]?.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                slug={slug}
                onReply={() => {}}
                depth={1}
              />
            ))}
            {/* Reply form */}
            {replyTo === comment.id && (
              <form onSubmit={handleReplySubmit} className={styles.replyForm}>
                <input
                  type="text"
                  placeholder="Your name"
                  value={replyName}
                  onChange={(e) => setReplyName(e.target.value)}
                  className={styles.input}
                  required
                  minLength={2}
                  maxLength={50}
                />
                <textarea
                  placeholder="Write a reply..."
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  className={styles.textarea}
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={3}
                />
                <div className={styles.replyActions}>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={styles.submitBtn}
                  >
                    {submitting ? 'Posting...' : 'Reply'}
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}
      </div>

      {/* New comment form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <h3 className={styles.formTitle}>Leave a Comment</h3>
        {error && <p className={styles.error}>{error}</p>}
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
          required
          minLength={2}
          maxLength={50}
        />
        <textarea
          placeholder="Share your thoughts..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={styles.textarea}
          required
          minLength={10}
          maxLength={2000}
          rows={4}
        />
        <button
          type="submit"
          disabled={submitting}
          className={styles.submitBtn}
        >
          {submitting ? 'Posting...' : 'Post Comment'}
        </button>
      </form>
    </div>
  );
}
