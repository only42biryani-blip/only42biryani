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
      a: 'Hyderabadi chicken dum biryani: long-grain basmati rice and chicken slow-cooked together in a sealed handi (dum), prepared fresh every day. It is the only item on the menu.',
    },
    {
      q: 'Why only 42 plates a day?',
      a: 'Most cloud kitchens optimise for scale. We optimise for attention. After 42 plates, consistency starts to slip, so we stop cooking. No second batch, no shortcuts.',
    },
    {
      q: 'What happens when the 42 plates are gone?',
      a: 'The handi is empty and the kitchen stops. The next drop is the next day, and waitlist members hear about it first.',
    },
    {
      q: 'How do I order?',
      a: launched
        ? 'Order through our listing on Zomato using the order button at the top of the page. Plates are limited to 42 a day.'
        : "We haven't opened orders yet. Join the waitlist and we'll message you the moment ordering goes live on Zomato.",
    },
    {
      q: 'How will I know when a drop is live?',
      a: 'Waitlist members are notified using the phone number and email they signed up with, before the 42 plates are gone.',
    },
    {
      q: 'Is the gravy fresh?',
      a: 'Yes. Fresh masala, fresh chicken and fresh dum every day. We never use frozen gravy.',
    },
  ];
}
