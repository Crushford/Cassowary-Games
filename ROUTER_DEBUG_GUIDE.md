# Router Debugging Guide

This guide will help you understand how the Vue Router works and debug the 404 issue on refresh.

## What I've Added

### 1. **Router Debugging** (`src/router/index.ts`)

- Added comprehensive logging for route changes
- Added error handling for navigation failures
- Added comments explaining how HTML5 history mode works

### 2. **App Debugging** (`src/main.ts`)

- Added logging for app initialization
- Added logging for plugin registration
- Added logging for app mounting

### 3. **Home Page Debugging** (`src/views/Home.vue`)

- Added debug information panel showing current route details
- Added manual navigation test buttons
- Added refresh test button to simulate the 404 issue

## How to Debug the 404 Issue

### Step 1: Open Browser Developer Tools

1. Open your app in the browser
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab

### Step 2: Test Navigation

1. Navigate to `/game` using the "Play Game" button
2. Watch the console for debug messages
3. Press the "Refresh Page (Test 404)" button
4. Observe what happens

### Step 3: Check Console Output

You should see messages like:

```
🔍 App Debug: Starting app initialization
🔍 App Debug: Current URL at startup = http://localhost:5173/
🔍 Router Debug: BASE_URL = /
🔍 Router Debug: Navigating from / to /game
🔍 Router Debug: Successfully navigated to /game
```

### Step 4: Test Production Build

1. Run `yarn build` to create a production build
2. Serve the build with a static server
3. Navigate to `/game` and refresh
4. Check if you get a 404

## Understanding the Problem

### What Causes the 404 Issue?

1. **Client-Side Routing**: Vue Router uses the browser's History API to change URLs without page reloads
2. **Server-Side Routing**: When you refresh, the browser asks the server for that URL
3. **Missing Server Configuration**: The server doesn't know about your client-side routes, so it returns 404

### How the Solution Works

The `public/_redirects` file tells the hosting server:

```
/*    /index.html   200
```

This means: "For any route (`/*`), serve `index.html` with a 200 status code"

Once `index.html` loads, Vue Router takes over and handles the routing on the client side.

## Debugging Checklist

### ✅ Development Environment

- [ ] Router logs appear in console
- [ ] Navigation works without refresh
- [ ] All routes are accessible

### ✅ Production Environment

- [ ] `public/_redirects` file exists
- [ ] Build process completes successfully
- [ ] Hosting platform supports redirects
- [ ] All routes work after refresh

### ✅ Common Issues to Check

1. **Missing \_redirects file**: Make sure it's in the `public/` directory
2. **Wrong hosting platform**: Some platforms use different redirect syntax
3. **Build output**: Ensure the `_redirects` file is copied to the build output
4. **Base URL**: Check if your app uses a subdirectory (affects `BASE_URL`)

## Platform-Specific Solutions

### Netlify

- Uses `public/_redirects` (already implemented)

### Vercel

- Uses `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Apache

- Uses `.htaccess`:

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### Nginx

- Uses nginx.conf:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## Testing Your Fix

1. **Build the app**: `yarn build`
2. **Deploy to your hosting platform**
3. **Navigate to `/game`**
4. **Refresh the page**
5. **Check that it doesn't show 404**

## Console Debug Messages Explained

- `🔍 App Debug`: App initialization and mounting
- `🔍 Router Debug`: Route navigation and configuration
- `🔍 Home Debug`: Home component specific debugging

## Next Steps

1. Test the debugging setup in development
2. Build and deploy to test production
3. If 404 persists, check your hosting platform's redirect configuration
4. Remove debug code once the issue is resolved

The debugging code will help you understand exactly what's happening during navigation and identify where the problem occurs.
