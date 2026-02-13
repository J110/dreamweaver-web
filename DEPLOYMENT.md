# DreamWeaver Web - Deployment Guide

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.local.example .env.local
# Edit .env.local if needed (default API URL is http://localhost:8000)

# Start development server
npm run dev

# Open http://localhost:3000
```

## Vercel Deployment

DreamWeaver Web is fully optimized for Vercel deployment.

### Automatic Deployment

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project" and import your repository
4. Vercel will auto-detect Next.js configuration
5. Add environment variables in "Environment Variables" section:
   - `NEXT_PUBLIC_API_URL`: Your backend API URL
6. Click "Deploy"

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# For production
vercel --prod
```

### Environment Variables on Vercel

1. Go to Project Settings → Environment Variables
2. Add:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://your-api-domain.com`
   - Environments: Production, Preview, Development

## Configuration Files

### next.config.js
- Output: `standalone` (optimized for Vercel)
- Images: Unoptimized with remote pattern support
- Env variables: `NEXT_PUBLIC_API_URL` from process.env

### vercel.json
- Build: `next build`
- Framework: `nextjs`
- Env: `NEXT_PUBLIC_API_URL` (required on Vercel)

## Build & Start

```bash
# Build for production
npm run build

# Start production server
npm start
```

## API Integration

The frontend expects a backend API running at `NEXT_PUBLIC_API_URL`.

### Default: `http://localhost:8000`
For local development, ensure your backend is running on port 8000.

### For Production
Set `NEXT_PUBLIC_API_URL` to your production API URL (e.g., `https://api.dreamweaver.app`)

## CORS Configuration

The backend must allow CORS requests from the frontend domain:

```
Allowed Origins: https://your-frontend-domain.com, http://localhost:3000
Methods: GET, POST, PUT, DELETE
Headers: Content-Type, Authorization
```

## Authentication

- Token stored in `localStorage` as `dreamweaver_token`
- User data stored as `dreamweaver_user`
- Automatically cleared on logout
- Auth header: `Authorization: Bearer {token}`

## Features

All features are fully implemented and ready to use:

- User authentication (login/signup)
- Story generation with customization
- Content browsing and filtering
- Story player with controls
- Like/save functionality
- Responsive design
- Mobile-first approach

## Troubleshooting

### API Connection Issues

Check that:
1. `NEXT_PUBLIC_API_URL` is correctly set
2. Backend API is running and accessible
3. CORS is properly configured
4. Network requests show correct URL in browser DevTools

### Build Errors

```bash
# Clean build
rm -rf .next
npm run build

# Check for TypeScript errors
npm run build -- --verbose
```

### Local Development Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next

# Start fresh
npm run dev
```

## Performance

- Next.js 14 with App Router
- Static generation where possible
- Optimized images (unoptimized for flexibility)
- CSS Modules for component styling
- Minimal bundle size (no extra dependencies)

## SEO

- Metadata configured in `layout.js`
- OpenGraph tags for social sharing
- Twitter card support
- Dynamic meta tags on each page

## Analytics & Monitoring

For production, consider adding:
- Vercel Analytics (built into Vercel dashboard)
- Error tracking (Sentry, LogRocket)
- User analytics (Plausible, Fathom)

## Security

- HTTPS enforced on production
- API token stored securely
- No sensitive data in client code
- Environment variables protected
- Input validation on forms

## Support

For issues or questions:
1. Check the README.md
2. Review backend API documentation
3. Check browser console for errors
4. Review network requests in DevTools

## Updates

To update dependencies:

```bash
npm update next react react-dom
```

Note: This project uses minimal dependencies (next, react, react-dom only).
