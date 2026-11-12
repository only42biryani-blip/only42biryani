// Single place for launch switches and business details.
// Anything set to null is simply not rendered on the site, so nothing is invented.

// true  -> "coming soon" preview, order buttons show as launching soon
// false -> live: order buttons become real links, live inventory is used
export const PRE_LAUNCH_MODE = true;

// Plates cooked and sold per day (one batch). Used by the status, pre-booking and daily-reset code and the dashboard.
export const TOTAL_PLATES = 42;

// Only this Google account gets admin tools. The page check is for display;
// the real enforcement is the Supabase row-level-security policies (see README-admin SQL).
export const ADMIN_EMAIL = 'only42biryani@gmail.com';
export const CONTACT_EMAIL = 'only42biryani@gmail.com';
export const SITE_URL = 'https://only42biryani.com';
// Registered business name that owns the brand, exactly as on your Razorpay / PAN / GST records.
// Shown as "Only42Biryani is a brand of ..." in the footer, policy pages and Contact page.
export const LEGAL_NAME = 'Shadab Akil Sheikh'; // registered business name on Razorpay (Individual)

// Fallbacks used only if the launch settings can't be read from the database.
// Normally the launch switch, date and banner are controlled from /admin.
export const LAUNCH_DATE = null; // e.g. '2026-11-12T12:30:00+05:30'

export const ZOMATO_URL = 'https://zomato.onelink.me/xqzv/3b36afgc';
export const SWIGGY_URL = null;

export const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/only42biryani';
export const INSTAGRAM_REEL_URL = 'https://www.instagram.com/reel/DfNV6ezTIz_/';

export const WHATSAPP_NUMBER = '918999449765'; // digits only with country code, e.g. '919XXXXXXXXX'
export const PHONE = '+918999449765'; // e.g. '+919XXXXXXXXX'
export const AREA = 'Near Khairatabad Metro Station, Hyderabad, Telangana'; // e.g. 'Banjara Hills, Hyderabad'
export const FSSAI_LICENSE = null; // 14-digit licence number
export const GSTIN = null; // 15-character GST number, printed on bills if you have one. null = not shown.

// Fallback price and offer, used only until you set them in /admin (Delivery & pay -> Price and offer), which wins.
// Offer applied to every plate on the order page and printed on every bill. percent 0 = no offer.
export const OFFER = { percent: 50, label: 'Launch offer: 50% OFF' };

// Plate details. Leave null until decided; only filled rows are shown.
export const PLATE = {
  price: '₹400',
  portion: null, // e.g. 'Serves 1 (about 450 g)'
  spice: null, // e.g. 'Medium'
};
