# DreamWeaver Web

A magical, dreamy bedtime story web app built with Next.js 14 and React 18. Create personalized AI-generated stories, poems, and songs for children.

## Features

- **Magic-Inspired Design**: Deep purple night sky, twinkling stars, dreamy gradients
- **Story Generation**: Create custom bedtime stories with themes, lengths, and content types
- **Browse & Explore**: Discover trending stories and filter by type and theme
- **User Authentication**: Secure login/signup for personalized experiences
- **Player Page**: Beautiful story player with controls, likes, and saves
- **Mobile Responsive**: Works beautifully on all devices
- **Zero Extra Dependencies**: Uses only Next.js, React, and React-DOM

## Tech Stack

- **Framework**: Next.js 14.1.0 with App Router
- **React**: 18.2.0
- **Styling**: CSS Modules + Global CSS with custom properties
- **Deployment**: Vercel-ready (standalone output)

## Project Structure

```
dreamweaver-web/
├── src/
│   ├── app/
│   │   ├── layout.js                 # Root layout with Google Font
│   │   ├── globals.css               # Global styles & theme variables
│   │   ├── page.js                   # Home page (landing)
│   │   ├── page.module.css
│   │   ├── login/
│   │   │   ├── page.js               # Login page
│   │   │   └── page.module.css
│   │   ├── signup/
│   │   │   ├── page.js               # Sign up page
│   │   │   └── page.module.css
│   │   ├── create/
│   │   │   ├── page.js               # Story creation page
│   │   │   └── page.module.css
│   │   ├── explore/
│   │   │   ├── page.js               # Browse stories
│   │   │   └── page.module.css
│   │   └── player/
│   │       └── [id]/
│   │           ├── page.js           # Story player page
│   │           └── page.module.css
│   ├── components/
│   │   ├── Header.js                 # Navigation header
│   │   ├── Header.module.css
│   │   ├── StarField.js              # Animated background stars
│   │   ├── ContentCard.js            # Story card component
│   │   ├── ContentCard.module.css
│   │   ├── LoadingSpinner.js         # Dreamy loading animation
│   │   └── LoadingSpinner.module.css
│   └── utils/
│       ├── api.js                    # API client & endpoints
│       └── auth.js                   # Auth token management
├── package.json
├── next.config.js
└── vercel.json
```

## Setup & Installation

```bash
# Install dependencies
npm install

# Set environment variables
export NEXT_PUBLIC_API_URL=http://localhost:8000
# or for production:
export NEXT_PUBLIC_API_URL=https://your-api-domain.com

# Run development server
npm run dev

# Open http://localhost:3000
```

## Environment Variables

```
NEXT_PUBLIC_API_URL=http://localhost:8000  # Default: http://localhost:8000
```

## Building for Production

```bash
# Build
npm run build

# Start production server
npm start

# Deploy to Vercel
# Simply push to GitHub and connect to Vercel
```

## API Endpoints

The app expects a backend API with these endpoints:

### Authentication
- `POST /api/v1/auth/signup` - Create new account
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout user

### Content
- `GET /api/v1/content` - List content (with filters)
- `GET /api/v1/content/{id}` - Get single content
- `POST /api/v1/generate` - Generate new story
- `GET /api/v1/content/trending` - Get trending stories
- `POST /api/v1/content/{id}/like` - Like content
- `POST /api/v1/content/{id}/unlike` - Unlike content
- `POST /api/v1/content/{id}/save` - Save content
- `POST /api/v1/content/{id}/unsave` - Unsave content

### Other
- `GET /api/v1/voices` - Get available voices
- `GET /api/v1/categories` - Get story categories

## Theme Colors

All colors defined as CSS variables in `globals.css`:

- **Deep Night**: #0D0B2E
- **Midnight Blue**: #1A1550
- **Primary Purple**: #6B4CE6
- **Primary Pink**: #FF6B9D
- **Star Yellow**: #FFD93D
- **Moon Glow**: #FFF3CD
- **Magic Teal**: #4ECDC4
- **Card Dark**: #1E1854
- **Text Light**: #F8F6FF

## Features Implemented

✅ Responsive design (mobile, tablet, desktop)
✅ Glassmorphism UI elements
✅ Animated starfield background
✅ Gradient buttons and cards
✅ Loading spinners with animations
✅ Form validation
✅ Error handling
✅ Authentication flows
✅ Content creation interface
✅ Story player with controls
✅ Like/save functionality
✅ Search and filtering
✅ SEO metadata
✅ Accessibility considerations
✅ Smooth transitions and animations
✅ Dark theme optimized

## Pages

### Home (/)
Landing page with hero section, trending stories, and category picker.

### Login (/login)
User login form with error handling and redirect to signup.

### Signup (/signup)
Registration form with age selector for child profile.

### Create (/create)
Story generation interface with theme, length, and content type selection.

### Explore (/explore)
Browse stories with filtering and search functionality.

### Player (/player/[id])
Full-screen story player with controls, likes, and save functionality.

## Design Highlights

- **Dreamy Aesthetic**: Purple-pink gradients, twinkling stars, floating moon
- **Glass Morphism**: Frosted glass effect on cards and containers
- **Smooth Animations**: Float, twinkle, pulse, and slide-up effects
- **Color-Coded Content**: Different gradients for stories, poems, and songs
- **Typography**: Quicksand font for friendly, child-appropriate feel
- **Responsive Grid**: Auto-fitting grids that adapt to screen size

## License

MIT

## Author

DreamWeaver Team

Made with 💜 for dreamers everywhere.
