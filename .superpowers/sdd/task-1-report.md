# Task 1: Theme-gated ambient fireflies

## Root cause

`StarField` generated only position, size, and twinkle timing. Premium mode therefore had no per-particle transform path, and the shared star CSS could not render differentiated firefly motion. The fixed field also did not clip transformed children.

## RED evidence

The regression was added before production changes. The initial test environment lacked `@babel/runtime`, then required the jsdom environment; after those test-runtime prerequisites were corrected, the regression failed as intended:

```
Expected: not ""
Received: ""
particles[0].style.getPropertyValue('--firefly-drift-x')
```

## GREEN evidence

```
npx jest src/components/StarField.test.js --runInBand
1 passed, 1 total

npm run test:emberlight
7 passed, 7 total; 28 passed, 28 total

npx jest --runInBand
9 passed, 9 total; 32 passed, 32 total

npm run verify:emberlight
exit 0
```

## Files

- `src/components/StarField.test.js`
- `src/components/StarField.js`
- `src/app/globals.css`
- `package.json`

## Commit

Implementation commit: `3d99b1bb4c983f7ede880057fc42cf85ff681bb5`

## Self-review

- Each of 60 shared particles receives all four requested firefly path custom properties.
- Premium CSS changes only premium particles, hides particles 25–60, and retains the free twinkle rule.
- Reduced-motion premium particles disable animation.
- The fixed particle layer uses `overflow: hidden` to keep transformed particles inside the viewport.
- Browser QA was intentionally not run; it is assigned to the controller.
