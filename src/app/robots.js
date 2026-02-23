export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/login',
          '/signup',
          '/onboarding',
          '/profile',
          '/settings',
          '/my-stories',
          '/create',
        ],
      },
    ],
    sitemap: 'https://dreamvalley.app/sitemap.xml',
  };
}
