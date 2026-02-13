# DreamWeaver Web - Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API URL
Create `.env.local`:
```bash
echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Open in Browser
Visit http://localhost:3000

## Pages to Explore

### Home Page (/)
Landing page with hero section, trending stories, and category picker.

### Sign Up (/signup)
Create a new account. Enter:
- Username
- Password
- Child's age (0-14 slider)

### Login (/login)
Log in with username and password.

### Create Story (/create)
Generate AI stories:
1. Choose type: Story, Poem, or Song
2. Pick a theme (Fantasy, Adventure, etc.)
3. Select length (Short, Medium, Long)
4. Optional: Add poems, songs, Q&A
5. Click "Generate My Story"

### Explore (/explore)
Browse existing stories:
- Search by title or keyword
- Filter by type (Story, Poem, Song)
- Filter by theme
- Click story to view player page

### Player (/player/[id])
View a story:
- See story artwork
- Play/pause controls
- Like and save stories
- Read full story text
- View additional content (poems, songs, Q&A)

## Theme Colors

The app uses a magical color scheme:

```
Background:     #0D0B2E (Deep Night)
Cards:          #1E1854 (Card Dark)
Primary:        #6B4CE6 (Purple) & #FF6B9D (Pink)
Accents:        #4ECDC4 (Teal), #FFD93D (Yellow)
Text:           #F8F6FF (Light), #B8B3D8 (Muted)
```

## File Structure

```
src/
├── app/                    # Next.js pages
│   ├── page.js            # Home
│   ├── login/page.js      # Login
│   ├── signup/page.js     # Sign up
│   ├── create/page.js     # Create story
│   ├── explore/page.js    # Browse stories
│   └── player/[id]/       # Story player
│
├── components/            # Reusable components
│   ├── Header.js          # Navigation
│   ├── StarField.js       # Background
│   ├── ContentCard.js     # Story card
│   └── LoadingSpinner.js  # Loading animation
│
└── utils/                 # Utilities
    ├── api.js             # API client
    └── auth.js            # Authentication
```

## Key Features

- **Magical Design**: Purple/blue night sky with stars
- **Story Generation**: Create custom bedtime stories
- **Browse Content**: Search and filter stories
- **Play Stories**: Full player with controls
- **User Accounts**: Login/signup with profiles
- **Responsive**: Works on all devices

## Development Tips

### Working with CSS
- Global styles: `src/app/globals.css`
- Component styles: `src/app/[page]/page.module.css`
- CSS variables in `:root`

### Working with Components
- Client-side only (all use 'use client')
- Use React hooks for state
- Styled with CSS Modules

### Working with API
- Update `NEXT_PUBLIC_API_URL` in `.env.local`
- API client in `src/utils/api.js`
- All endpoints in `utils/api.js`

### Adding New Pages
1. Create folder: `src/app/new-page/`
2. Create file: `src/app/new-page/page.js`
3. Add component and styles

## Common Tasks

### Change Theme Colors
Edit `src/app/globals.css`:
```css
:root {
  --color-primary-purple: #6B4CE6;
  --color-primary-pink: #FF6B9D;
  /* ... etc ... */
}
```

### Update API Endpoints
Edit `src/utils/api.js` to match your backend.

### Customize Home Page
Edit `src/app/page.js`:
- Change hero text
- Add/remove categories
- Customize colors

### Add Navigation Link
Edit `src/components/Header.js`:
```jsx
<Link href="/new-page">New Link</Link>
```

## Environment Variables

```bash
# Required
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional (for production)
NODE_ENV=production
```

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm start         # Start production server
```

## Troubleshooting

### "Module not found" error
```bash
rm -rf node_modules package-lock.json
npm install
```

### Styles not loading
- Check CSS Modules import
- Verify file names match
- Clear `.next` folder: `rm -rf .next`

### API not connecting
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Ensure backend is running
- Check browser console for errors

### Port 3000 in use
```bash
npm run dev -- -p 3001
```

## Next Steps

1. Start backend API on `http://localhost:8000`
2. Test login/signup
3. Test story generation
4. Deploy to Vercel

## More Information

- README.md - Full documentation
- DEPLOYMENT.md - Deployment guide
- FEATURES.md - Feature list
- next.config.js - Next.js configuration

## Support

Check the `src/utils/api.js` file for all available API endpoints and their expected request/response formats.

Happy dreaming! 🌙✨
