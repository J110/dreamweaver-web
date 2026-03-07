'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './BlogMarkdown.module.css';

/**
 * Markdown renderer for blog posts.
 * Renders markdown to styled HTML with custom components.
 */
export default function BlogMarkdown({ content }) {
  if (!content) return null;

  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        children={content}
        components={{
          // Links open in new tab
          a: ({ href, children, ...props }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
              {children}
            </a>
          ),
          // Images get lazy loading
          img: ({ src, alt, ...props }) => (
            <figure className={styles.figure}>
              <img src={src} alt={alt || ''} loading="lazy" className={styles.image} {...props} />
              {alt && <figcaption className={styles.caption}>{alt}</figcaption>}
            </figure>
          ),
          // Headings get IDs for anchor linking
          h2: ({ children, ...props }) => {
            const id = String(children).toLowerCase().replace(/[^\w]+/g, '-');
            return <h2 id={id} {...props}>{children}</h2>;
          },
          h3: ({ children, ...props }) => {
            const id = String(children).toLowerCase().replace(/[^\w]+/g, '-');
            return <h3 id={id} {...props}>{children}</h3>;
          },
          // Code blocks
          code: ({ inline, className, children, ...props }) => {
            if (inline) {
              return <code className={styles.inlineCode} {...props}>{children}</code>;
            }
            return (
              <pre className={styles.codeBlock}>
                <code className={className} {...props}>{children}</code>
              </pre>
            );
          },
        }}
      />
    </div>
  );
}
