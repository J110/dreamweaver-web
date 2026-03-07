'use client';

import { useState, useEffect, useCallback } from 'react';
import BlogMarkdown from '../BlogMarkdown';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const SUGGESTED_TAGS = [
  'sleep-science', 'bedtime-routines', 'parenting-tips', 'research',
  'toddler-sleep', 'school-age-sleep', 'baby-sleep', 'product-updates',
  'dream-valley-features', 'sleep-environment', 'screen-time',
  'bedtime-stories', 'lullabies', 'anxiety-and-sleep',
  'nap-transitions', 'travel-sleep', 'seasonal-tips', 'expert-advice',
];

function getKey() {
  return sessionStorage.getItem('blogAdminKey') || '';
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getKey()}`,
    'Content-Type': 'application/json',
  };
}

// ── Post Editor ───────────────────────────────────────────────────

function PostEditor({ post, onSave, onCancel }) {
  const [title, setTitle] = useState(post?.title || '');
  const [subtitle, setSubtitle] = useState(post?.subtitle || '');
  const [body, setBody] = useState(post?.body || '');
  const [tags, setTags] = useState(post?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [metaTitle, setMetaTitle] = useState(post?.seo?.metaTitle || '');
  const [metaDesc, setMetaDesc] = useState(post?.seo?.metaDescription || '');
  const [status, setStatus] = useState(post?.status || 'draft');
  const [coverUrl, setCoverUrl] = useState(post?.coverImage?.url || '');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const isEditing = !!post?.slug;

  const addTag = (tag) => {
    const t = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  const removeTag = (tag) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = async (publishStatus) => {
    if (!title.trim()) {
      setMessage('Title is required');
      return;
    }
    setSaving(true);
    setMessage('');

    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      body,
      tags,
      status: publishStatus,
      seo: {
        metaTitle: metaTitle || `${title.trim()} | Dream Valley Blog`,
        metaDescription: metaDesc || body.slice(0, 160).trim(),
        ogImage: coverUrl || '',
      },
    };

    try {
      const url = isEditing
        ? `${API_URL}/api/v1/blog/posts/${post.slug}`
        : `${API_URL}/api/v1/blog/posts`;

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage(publishStatus === 'published' ? 'Published!' : 'Saved as draft');
        onSave(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage(err.detail || 'Failed to save');
      }
    } catch {
      setMessage('Network error');
    }
    setSaving(false);
  };

  const handleGenerateCover = async () => {
    if (!isEditing) {
      setMessage('Save the post first, then generate a cover');
      return;
    }
    setGenerating(true);
    setMessage('Generating cover... This may take up to 2 minutes.');
    try {
      const res = await fetch(
        `${API_URL}/api/v1/blog/posts/${post.slug}/generate-cover`,
        { method: 'POST', headers: authHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        setCoverUrl(data.coverUrl);
        setMessage(`Cover generated via ${data.source}!`);
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage(err.detail || 'Cover generation failed');
      }
    } catch {
      setMessage('Network error during cover generation');
    }
    setGenerating(false);
  };

  return (
    <div className={styles.editor}>
      <div className={styles.editorHeader}>
        <h2>{isEditing ? 'Edit Post' : 'New Post'}</h2>
        <button onClick={onCancel} className={styles.cancelBtn}>
          &times; Close
        </button>
      </div>

      {message && <div className={styles.message}>{message}</div>}

      <div className={styles.field}>
        <label>Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title"
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label>Subtitle</label>
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Optional subtitle"
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label>Tags</label>
        <div className={styles.tagEditor}>
          <div className={styles.selectedTags}>
            {tags.map((t) => (
              <span key={t} className={styles.tagPill}>
                {t}
                <button onClick={() => removeTag(t)} className={styles.tagRemove}>
                  &times;
                </button>
              </span>
            ))}
          </div>
          <div className={styles.tagInputRow}>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              placeholder="Add a tag..."
              className={styles.tagInputField}
            />
          </div>
          <div className={styles.suggestedTags}>
            {SUGGESTED_TAGS.filter((t) => !tags.includes(t))
              .slice(0, 12)
              .map((t) => (
                <button key={t} onClick={() => addTag(t)} className={styles.suggestedTag}>
                  + {t}
                </button>
              ))}
          </div>
        </div>
      </div>

      <div className={styles.seoFields}>
        <div className={styles.field}>
          <label>SEO Meta Title</label>
          <input
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            placeholder={`${title || 'Post title'} | Dream Valley Blog`}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label>SEO Meta Description</label>
          <textarea
            value={metaDesc}
            onChange={(e) => setMetaDesc(e.target.value)}
            placeholder="Auto-populated from first 160 chars of body"
            className={styles.inputTextarea}
            rows={2}
          />
        </div>
      </div>

      <div className={styles.field}>
        <div className={styles.bodyHeader}>
          <label>Body (Markdown)</label>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={styles.previewToggle}
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
        <div className={styles.bodyEditor}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your post in markdown..."
            className={styles.bodyTextarea}
            rows={20}
          />
          {showPreview && (
            <div className={styles.previewPane}>
              <BlogMarkdown content={body} />
            </div>
          )}
        </div>
      </div>

      {/* Cover section */}
      <div className={styles.coverSection}>
        <label>Cover Image</label>
        {coverUrl && (
          <img
            src={coverUrl}
            alt="Cover preview"
            className={styles.coverPreview}
          />
        )}
        <button
          onClick={handleGenerateCover}
          disabled={generating || !isEditing}
          className={styles.generateBtn}
        >
          {generating ? 'Generating...' : 'Generate Cover'}
        </button>
        {!isEditing && (
          <p className={styles.hint}>Save the post first to generate a cover</p>
        )}
      </div>

      <div className={styles.editorActions}>
        <button
          onClick={() => handleSave('draft')}
          disabled={saving}
          className={styles.draftBtn}
        >
          {saving ? 'Saving...' : 'Save as Draft'}
        </button>
        <button
          onClick={() => handleSave('published')}
          disabled={saving}
          className={styles.publishBtn}
        >
          {saving ? 'Publishing...' : 'Publish'}
        </button>
      </div>
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────

export default function BlogAdminPage() {
  const [key, setKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState('posts'); // 'posts' | 'editor' | 'comments'
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [editingPost, setEditingPost] = useState(null); // null = new post
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check for existing key in sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('blogAdminKey');
    if (stored) {
      setKey(stored);
      setAuthenticated(true);
    }
  }, []);

  const handleAuth = useCallback(async () => {
    if (!key.trim()) return;
    sessionStorage.setItem('blogAdminKey', key.trim());
    setError('');

    // Test the key by fetching admin posts
    try {
      const res = await fetch(`${API_URL}/api/v1/blog/admin/posts`, {
        headers: { Authorization: `Bearer ${key.trim()}` },
      });
      if (res.ok) {
        setAuthenticated(true);
        const data = await res.json();
        setPosts(data.posts || []);
      } else {
        setError('Invalid key');
        sessionStorage.removeItem('blogAdminKey');
      }
    } catch {
      setError('Connection error');
    }
  }, [key]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/blog/admin/posts`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/blog/admin/comments?limit=100`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  const handleDeletePost = useCallback(async (slug) => {
    if (!confirm(`Delete post "${slug}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/blog/posts/${slug}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.slug !== slug));
      }
    } catch {}
  }, []);

  const handleDeleteComment = useCallback(async (id) => {
    if (!confirm('Delete this comment?')) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/blog/comments/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (authenticated && tab === 'posts') loadPosts();
    if (authenticated && tab === 'comments') loadComments();
  }, [authenticated, tab, loadPosts, loadComments]);

  // ── Not Authenticated ───────────────────────────────
  if (!authenticated) {
    return (
      <div className={styles.page}>
        <div className={styles.authBox}>
          <h1 className={styles.authTitle}>Blog Admin</h1>
          <p className={styles.authDesc}>Enter your admin key to continue</p>
          {error && <p className={styles.authError}>{error}</p>}
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            placeholder="Enter admin key..."
            className={styles.authInput}
            autoFocus
          />
          <button onClick={handleAuth} className={styles.authBtn}>
            Authenticate
          </button>
        </div>
      </div>
    );
  }

  // ── Editor View ─────────────────────────────────────
  if (tab === 'editor') {
    return (
      <div className={styles.page}>
        <PostEditor
          post={editingPost}
          onSave={(saved) => {
            loadPosts();
            // If new post was created, switch to edit mode with the new slug
            if (!editingPost && saved.slug) {
              setEditingPost(saved);
            }
          }}
          onCancel={() => {
            setTab('posts');
            setEditingPost(null);
          }}
        />
      </div>
    );
  }

  // ── Main Admin View ─────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.adminHeader}>
        <h1 className={styles.adminTitle}>Blog Admin</h1>
        <button
          onClick={() => {
            setEditingPost(null);
            setTab('editor');
          }}
          className={styles.newPostBtn}
        >
          + New Post
        </button>
      </div>

      <div className={styles.tabs}>
        <button
          onClick={() => setTab('posts')}
          className={`${styles.tab} ${tab === 'posts' ? styles.tabActive : ''}`}
        >
          Posts ({posts.length})
        </button>
        <button
          onClick={() => setTab('comments')}
          className={`${styles.tab} ${tab === 'comments' ? styles.tabActive : ''}`}
        >
          Comments
        </button>
      </div>

      {loading && <p className={styles.loading}>Loading...</p>}

      {/* Posts List */}
      {tab === 'posts' && !loading && (
        <div className={styles.postList}>
          {posts.length === 0 ? (
            <p className={styles.emptyText}>No posts yet. Create one!</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Likes</th>
                  <th>Comments</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.slug}>
                    <td className={styles.titleCell}>{post.title}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          post.status === 'published'
                            ? styles.statusPublished
                            : styles.statusDraft
                        }`}
                      >
                        {post.status}
                      </span>
                    </td>
                    <td className={styles.dateCell}>
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString()
                        : '—'}
                    </td>
                    <td>{post.engagement?.likes || 0}</td>
                    <td>{post.engagement?.commentCount || 0}</td>
                    <td className={styles.actionsCell}>
                      <button
                        onClick={() => {
                          setEditingPost(post);
                          setTab('editor');
                        }}
                        className={styles.editBtn}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.slug)}
                        className={styles.deleteBtn}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Comments Moderation */}
      {tab === 'comments' && !loading && (
        <div className={styles.commentsList}>
          {comments.length === 0 ? (
            <p className={styles.emptyText}>No comments yet.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className={styles.commentCard}>
                <div className={styles.commentMeta}>
                  <span className={styles.commentPost}>
                    {comment.postTitle || comment.postId}
                  </span>
                  <span className={styles.commentDate}>
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className={styles.commentInfo}>
                  <strong>{comment.displayName}</strong>
                  {comment.parentId && (
                    <span className={styles.replyIndicator}> (reply)</span>
                  )}
                </div>
                <p className={styles.commentText}>{comment.body}</p>
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className={styles.deleteBtn}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
