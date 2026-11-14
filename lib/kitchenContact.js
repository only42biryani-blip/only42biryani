// SERVER ONLY. The kitchen's own phone number is NOT shown anywhere on the website. It is revealed to one
// visitor only after you approve their contact request in /admin -> Requests (see /api/contact/request/[code]).
// Never import this file into a component marked 'use client', or the number would end up in the page code.
// Set CONTACT_PHONE in Vercel (digits with 91, for example 918999449765) to change it without a code change.
const digits = (s) => String(s || '').replace(/\D/g, '');
const DEFAULT = '918999449765';

export function kitchenContact() {
  const d = digits(process.env.CONTACT_PHONE) || DEFAULT;
  return { phone: `+${d}`, tel: `tel:+${d}`, whatsapp: `https://wa.me/${d}` };
}
