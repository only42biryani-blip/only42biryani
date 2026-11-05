# ONLY42BIRYANI

Premium scarcity-based chicken biryani brand.

Only 42 plates daily.

---

## TECH STACK

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (inventory + waitlist)
- **Hosting**: Vercel

---

## PROJECT STRUCTURE

```
only42biryani/
├── app/
│   ├── layout.jsx        ← Root layout + SEO metadata
│   ├── page.jsx          ← Main landing page
│   ├── globals.css       ← Global styles + animations
│   └── admin/
│       └── page.jsx      ← Admin dashboard route
├── components/
│   ├── InventoryBox.jsx  ← Live inventory counter
│   ├── WaitlistForm.jsx  ← Signup form + success modal
│   ├── CountdownTimer.jsx← Next drop countdown
│   ├── TiltCard.jsx      ← 3D tilt + sheen effect
│   └── AdminDashboard.jsx← PIN-locked admin controls
├── lib/
│   └── supabase.js       ← Supabase client singleton
├── public/
│   ├── images/           ← favicon.png, biryani photos
│   ├── robots.txt
│   └── sitemap.xml
└── _backup/              ← Original HTML/CSS/JS files
```

---

## RUNNING LOCALLY

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Admin dashboard: [http://localhost:3000/admin](http://localhost:3000/admin)
Admin PIN: **4242**

---

## FEATURES

- Pre-launch mode (flip `PRE_LAUNCH_MODE` in `components/InventoryBox.jsx`)
- Real-time Supabase inventory sync (every 3 seconds)
- VIP Waitlist with live counter + Supabase storage
- Countdown timer to next 12:30 PM drop (shows on sold-out)
- 3D card tilt with moving sheen reflection
- Scroll reveal animations
- Cursor glow effect
- PIN-protected admin dashboard
- Full SEO + Open Graph + JSON-LD

---

## DEPLOY TO VERCEL

1. Push to GitHub
2. Import repo in Vercel
3. Framework Preset → **Next.js** (auto-detected)
4. Deploy ✓

---

## BRAND PRINCIPLE

Only42Biryani is built around:

- controlled scarcity
- consistency
- single-product obsession
- premium dark identity

When the deg is empty, we stop cooking.
