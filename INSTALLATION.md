# DreamWeaver Web - Installation & Setup

## System Requirements

- Node.js 18.17+ or 19+
- npm 8+ or yarn/pnpm
- 50MB free disk space

## Installation Steps

### 1. Download/Clone Project

```bash
# If you have a git repository
git clone https://github.com/your-repo/dreamweaver-web.git
cd dreamweaver-web

# Or if already in the directory
cd "/sessions/kind-sleepy-fermat/mnt/Bed Time Story App/dreamweaver-web"
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- next@14.1.0
- react@18.2.0
- react-dom@18.2.0

Expected time: 1-3 minutes
Expected size: ~500MB (node_modules)

### 3. Create Environment File

```bash
# Create .env.local with:
echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local
```

Or manually create `.env.local` with:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Verify Installation

```bash
# Check if everything is installed
npm list next react react-dom
```

Should show:
```
dreamweaver-web@1.0.0
├── next@14.1.0
├── react@18.2.0
└── react-dom@18.2.0
```

### 5. Start Development Server

```bash
npm run dev
```

Output should show:
```
> dreamweaver-web@1.0.0 dev
> next dev

  ▲ Next.js 14.1.0
  - Local:        http://localhost:3000
  - Environments: .env.local
```

### 6. Open in Browser

Visit: **http://localhost:3000**

You should see the DreamWeaver home page with:
- Hero section with "Where Dreams Come Alive"
- Animated moon and stars
- "Start Dreaming" button
- Category picker
- Trending stories section (empty until backend is ready)

## Verifying Installation

### Check Pages Load

- [ ] Home (http://localhost:3000) - Should load with hero
- [ ] Signup (http://localhost:3000/signup) - Form page
- [ ] Login (http://localhost:3000/login) - Form page
- [ ] Explore (http://localhost:3000/explore) - Browse page
- [ ] Create (http://localhost:3000/create) - Requires login redirect

### Check Styling

- [ ] Dark purple/blue background
- [ ] Twinkling stars in background
- [ ] Gradient buttons (purple to pink)
- [ ] Smooth transitions on hover
- [ ] Mobile menu works on small screens

### Check Functionality

- [ ] Can type in search/form inputs
- [ ] Can click buttons
- [ ] Can toggle checkboxes
- [ ] Can move sliders
- [ ] Hamburger menu toggles on mobile

## Build for Production

### Local Build Test

```bash
# Create production build
npm run build

# Start production server
npm start

# Visit http://localhost:3000
```

This will:
1. Compile Next.js app
2. Optimize assets
3. Create `.next` folder (~2MB)
4. Run optimized version

### Build Output Example

```
Collecting page data .....
Generating static pages (6/6)
> Build complete
✓ Prerender 6 static pages
```

## Troubleshooting Installation

### Issue: "npm: command not found"

**Solution**: Install Node.js from https://nodejs.org/

### Issue: Port 3000 already in use

```bash
# Use different port
npm run dev -- -p 3001

# Visit http://localhost:3001
```

### Issue: "Cannot find module 'next'"

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: ".env.local not working"

**Solution**: 
1. Check file exists in root directory
2. Restart dev server: Stop (Ctrl+C) and `npm run dev` again
3. Verify with: `cat .env.local`

### Issue: Styles not loading (no colors/design)

**Solution**:
1. Clear cache: `rm -rf .next`
2. Restart server: `npm run dev`
3. Hard refresh browser: Ctrl+Shift+R (or Cmd+Shift+R)

### Issue: "fetch is not defined"

**Solution**: All fetch calls are done in browser context, should work. If error:
1. Check you're in a component with `'use client'`
2. Check API URL in `.env.local`

### Issue: Module parse errors

**Solution**:
```bash
# Upgrade dependencies
npm update
# Or reinstall everything
rm -rf node_modules
npm install
```

## Environment-Specific Setup

### Local Development

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NODE_ENV=development
```

Backend should be running on http://localhost:8000

### Staging

```bash
# .env.staging
NEXT_PUBLIC_API_URL=https://staging-api.dreamweaver.app
NODE_ENV=production
```

### Production

```bash
# .env.production
NEXT_PUBLIC_API_URL=https://api.dreamweaver.app
NODE_ENV=production
```

## Backend Setup Required

For full functionality, you need a backend API running at `NEXT_PUBLIC_API_URL` with endpoints:

### Required Endpoints

**Auth**:
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`

**Content**:
- `GET /api/v1/content/trending`
- `GET /api/v1/content`

**Generate**:
- `POST /api/v1/generate`

See [API Endpoints Documentation](./README.md#api-endpoints) for details.

## First Time User Guide

### 1. Understanding the Structure

```
dreamweaver-web/
├── src/app/          - Pages (home, login, signup, etc.)
├── src/components/   - Reusable components
├── src/utils/        - API and auth utilities
├── package.json      - Dependencies
└── README.md         - Full documentation
```

### 2. Making Your First Change

**Change the home page title**:

1. Open `src/app/page.js`
2. Find the line with `Where Dreams Come Alive`
3. Change to your text
4. Save file (auto-reloads in browser)

### 3. Adding a New Page

1. Create folder: `src/app/new-page/`
2. Create file: `src/app/new-page/page.js`
3. Add content:
```jsx
'use client';

export default function NewPage() {
  return <h1>New Page</h1>;
}
```
4. Visit http://localhost:3000/new-page

### 4. Changing Colors

1. Open `src/app/globals.css`
2. Find `:root` section
3. Change color values (e.g., `--color-primary-purple: #6B4CE6`)
4. Refresh browser

## Next Steps

1. **Start backend**: Make sure your API is running on the URL in `.env.local`
2. **Test auth**: Try signup and login
3. **Test generation**: Try creating a story
4. **Deploy**: Follow [DEPLOYMENT.md](./DEPLOYMENT.md)

## Additional Resources

- [QUICKSTART.md](./QUICKSTART.md) - 5-minute quick start
- [README.md](./README.md) - Full documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [FEATURES.md](./FEATURES.md) - Feature documentation
- [Next.js Docs](https://nextjs.org/docs) - Next.js documentation

## Support

If you encounter issues:

1. Check this troubleshooting section
2. Read the README.md
3. Check browser console for errors (F12)
4. Check terminal output for build errors
5. Try clearing everything: `rm -rf .next node_modules && npm install`

## System Check

Run this to verify your setup:

```bash
# Check Node version (should be 18.17+)
node --version

# Check npm version (should be 8+)
npm --version

# Check project structure
ls -la src/app/
ls -la src/components/
ls -la src/utils/

# Verify dependencies installed
npm list --depth=0

# Check environment
cat .env.local
```

All set! Happy coding! 🌙✨
