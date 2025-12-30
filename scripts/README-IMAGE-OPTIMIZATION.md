# Image Optimization Guide

Your menu images are currently **96 MB total** with individual files as large as **7.6 MB**. This guide shows two approaches to optimize them.

## Current Problem

```bash
entrecotesimmenthal.jpg: 7.6 MB  ❌ (should be ~80 KB)
pulledpork.jpg:          7.4 MB  ❌
infusionginger.jpg:      6.9 MB  ❌
colazero.jpg:            6.4 MB  ❌
```

**Result:** Slow page loads, poor mobile experience, wasted bandwidth

---

## 🔷 Approach 1: JPEG Optimization (Recommended - No DB Changes)

### What It Does
- Resizes images to 800x600 (perfect for menu)
- Optimizes JPEG compression (75% quality)
- **Keeps same filenames** (no database changes needed)
- Reduces size by ~60-70%

### Steps

**1. Preview what will happen:**
```bash
npm run optimize-images:preview
```

**Expected output:**
```
Total original size:    96.32 MB
Total optimized size:   ~35 MB
Overall reduction:      ~65%
```

**2. Run optimization:**
```bash
npm run optimize-images:backup  # Creates backup + optimizes
```

This creates `public/images-optimized/` with optimized JPEGs.

**3. Review quality:**
Open some images from `images-optimized/` and compare with originals.

**4. Replace originals:**
```bash
# Windows (PowerShell)
cd ../indiesmenu/public
Remove-Item images/*.jpg
Move-Item images-optimized/* images/
Remove-Item images-optimized

# Mac/Linux
cd ../indiesmenu/public
rm images/*.jpg images/*.png
mv images-optimized/* images/
rmdir images-optimized
```

**5. Done!** ✓ No code changes needed, DB references still work.

### Pros & Cons

✅ No database changes needed
✅ No code changes needed
✅ Simple and safe
✅ ~65% size reduction
❌ Not as efficient as WebP (~65% vs ~80% reduction)

---

## 🔷 Approach 2: WebP Conversion (Best Compression - Requires DB Migration)

### What It Does
- Converts images to WebP format
- Reduces size by ~80-90%
- Updates database to reference `.webp` files
- Requires running migration script

### Steps

**1. Enable WebP in optimization script:**

Edit `scripts/optimize-images.js` line 28-31:
```javascript
formats: {
  webp: true,   // Enable WebP
  jpeg: false,  // Disable JPEG
}
```

**2. Preview optimization:**
```bash
npm run optimize-images:preview
```

**Expected output:**
```
Total original size:    96.32 MB
Total optimized size:   ~20 MB
Overall reduction:      ~80%
```

**3. Preview database migration:**
```bash
npm run migrate-images:preview
```

**Expected output:**
```
Found 45 dishes and 18 drinks with images

Updating dishes:
  → Pulled Pork Sandwich: /images/pulledpork.jpg → /images/pulledpork.webp
  → Entrecôte Simmenthal: /images/entrecotesimmenthal.jpg → /images/entrecotesimmenthal.webp
  ...

Dishes updated: 45
Drinks updated: 18
```

**4. Run optimization:**
```bash
npm run optimize-images:backup
```

**5. Replace image files:**
```bash
# Windows (PowerShell)
cd ../indiesmenu/public
Remove-Item images/*.jpg
Move-Item images-optimized/* images/
Remove-Item images-optimized

# Mac/Linux
cd ../indiesmenu/public
rm images/*.jpg images/*.png
mv images-optimized/* images/
rmdir images-optimized
```

**6. Update database:**
```bash
npm run migrate-images
```

**7. Done!** ✓ Maximum compression achieved.

### Pros & Cons

✅ Best compression (~80-90% reduction)
✅ Modern image format
✅ Automatic migration script
❌ Requires database changes
❌ More complex rollback if issues occur

---

## After Optimization (Both Approaches)

### Update Code for Lazy Loading

**1. Update MenuItem.tsx** (line 92):

```typescript
// Before:
<img src={item.image} alt={item.name} className="menu-item-image" />

// After:
import Image from 'next/image';

<Image
  src={item.image}
  alt={item.name}
  width={800}
  height={600}
  className="menu-item-image"
  loading="lazy"  // Only load when scrolling near image
  quality={75}
/>
```

**2. Remove prefetch code** from `app/menu/page.tsx` (lines 805-829):

Delete this entire section:
```typescript
// Prefetch all menu images for offline caching
const prefetchImages = () => {
  // ... delete all this code ...
};
setTimeout(prefetchImages, 1000);
```

**Why?** The prefetch code loads ALL images immediately, which:
- Makes page load slower
- Wastes bandwidth
- Conflicts with lazy loading

---

## Performance Impact

| Metric | Before | After (JPEG) | After (WebP) |
|--------|--------|-------------|--------------|
| Total size | 96 MB | 35 MB | 20 MB |
| Avg image | 2.1 MB | 780 KB | 440 KB |
| Page load | 30-60s | 5-8s | 2-3s |
| Images on load | All 45 | ~6 visible | ~6 visible |

---

## Recommendation

**Start with Approach 1 (JPEG optimization):**
- Safer (no DB changes)
- Still gives 65% reduction
- Test on staging first

**Then consider Approach 2 (WebP)** if you want maximum optimization:
- Additional 15-20% space savings
- Better mobile performance
- Modern format for progressive web app

---

## Rollback Plan

### If Using JPEG (Approach 1)
```bash
# Restore from backup
rm public/images/*
cp public/images-backup/* public/images/
```

### If Using WebP (Approach 2)
```bash
# 1. Restore image files
rm public/images/*.webp
cp public/images-backup/* public/images/

# 2. Rollback database (edit paths back to .jpg)
# Run this SQL in your database:
UPDATE dishes SET image = REPLACE(image, '.webp', '.jpg') WHERE image LIKE '%.webp';
UPDATE drinks SET image = REPLACE(image, '.webp', '.jpg') WHERE image LIKE '%.webp';
```

---

## React Query Question Answered

> Would React Query help with image loading?

**No.** React Query handles JSON data fetching, not image optimization. Your image problem requires:

1. ✅ Image compression (this script)
2. ✅ Lazy loading (Next.js Image component)
3. ✅ Removing prefetch code

React Query **would** help with:
- Menu data caching (7-day cache as mentioned in PROJECT_STATUS.md)
- Balance fetching (currently duplicated in 3 places)
- Payment status polling
- Credential fetching
- Graceful Cache Storage fallback (your PWA offline strategy)

But for images specifically, you need the solutions in this guide.

---

## Questions?

Run with `--help` for more options:
```bash
node scripts/optimize-images.js --help
node scripts/migrate-images-to-webp.js --help
```
