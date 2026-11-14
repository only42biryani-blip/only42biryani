// Single source for the FAQ: shown on the page and published as FAQ structured data,
// so search and answer engines see exactly what visitors see.
export function getFaqItems(launched) {
  return [
    {
      q: 'What is Only42Biryani?',
      a: 'Only42Biryani is a Hyderabad kitchen that makes one thing: Hyderabadi chicken dum biryani, cooked in a single fresh batch of 42 plates a day. When the 42 plates are gone, the kitchen stops.',
    },
    {
      q: 'What kind of biryani do you make?',
      a: 'Hyderabadi chicken dum biryani: medium-grain rice and fresh boneless chicken breast slow-cooked in a sealed handi (dum), prepared fresh every day. It is the only item on the menu.',
    },
    {
      q: 'What chicken do you use?',
      a: 'Fresh boneless chicken breast, sourced from Sneha chicken. The chicken and the gravy are made fresh every day, never frozen.',
    },
    {
      q: 'How is the biryani packed?',
      a: 'In boxes made from sugarcane bagasse, the plant fibre left after sugarcane is pressed for juice. It is a plant-based alternative to plastic and foam containers.',
    },
    {
      q: 'Why only 42 plates a day?',
      a: 'Most cloud kitchens optimise for scale. We optimise for attention. After 42 plates, consistency starts to slip, so we stop cooking. No second batch, no shortcuts.',
    },
    {
      q: 'What happens when the 42 plates are gone?',
      a: launched
        ? 'The handi is empty and the kitchen stops for the day. You can pre-book tomorrow straight away, or join the waitlist so we message you when the next day’s plates go live.'
        : 'The handi is empty and the kitchen stops. The next drop is the next day, and waitlist members hear about it first.',
    },
    {
      q: 'How do I order?',
      a: launched
        ? 'Open the Order page, choose your plates, add your name, phone and address, and pay cash or UPI when it arrives. We are also on Zomato. Plates are limited to 42 a day.'
        : "We haven't opened orders yet. Join the waitlist and we'll message you the moment ordering goes live on Zomato.",
    },
    {
      q: 'How will I know when a drop is live?',
      a: launched
        ? 'If you joined the waitlist, we message you on WhatsApp (and sometimes email) when a day’s plates go live. You can also follow @only42biryani on Instagram.'
        : 'Waitlist members are notified using the phone number and email they signed up with, before the 42 plates are gone.',
    },
    ...(launched
      ? [
          {
            q: 'What is pre-booking?',
            a: 'If the kitchen is offline or today’s plates are gone, you can still order: pick tomorrow, or any day up to a week ahead. We confirm your booking, keep your plates aside and deliver fresh that day. You pay cash or UPI on delivery. Pre-booked plates count towards that day’s 42.',
          },
          {
            q: 'What is the waitlist for?',
            a: 'The waitlist is only for alerts. Join with your name, number and email and we message you when a day’s plates go live. It is not an order and it does not reserve a plate. To be sure of a plate, order or pre-book.',
          },
          {
            q: 'Where do you deliver and what does delivery cost?',
            a: 'We deliver only inside Hyderabad. The order form checks your address or live location before you order. Delivery is charged by distance and shown before you place the order.',
          },
          {
            q: 'How do I pay?',
            a: 'Cash or UPI when your order arrives, with nothing to pay in advance. If we switch on online payment, the order page will show it.',
          },
          {
            q: 'Can I order more than one plate?',
            a: 'Yes. Use the + button on the order page. There is a limit per order, and you can never order more than the plates left that day. For a bigger order, use “Request a call back” on the Contact page.',
          },
          {
            q: 'Can I cancel my order?',
            a: 'Yes, free of charge, before we pack it. Request a call back from the Contact page with your order code. See our Refund policy for details.',
          },
          {
            q: 'How do I contact you?',
            a: 'Email us, or use “Request a call back” on the Contact page and we will call or WhatsApp you. We do not publish a phone number.',
          },
        ]
      : []),
    {
      q: 'Is the gravy fresh?',
      a: 'Yes. Fresh masala, fresh chicken and fresh dum every day. We never use frozen gravy.',
    },
  ];
}
