// Pure number-crunching for the admin "Today" summary, so it can be tested without a database.
const ACTIVE = ['new', 'confirmed', 'paid', 'preparing', 'ready', 'dispatched'];

// Start of today in IST (midnight), as a Date.
export function istDayStart(now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 5.5 * 60 * 60 * 1000);
}

// The day an order counts for: the pre-booked day if it has one, otherwise the day it was placed.
const dayOf = (o) => o.scheduled_for || new Date(new Date(o.created_at).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

export function summarize(orders, now = new Date()) {
  const todayStr = new Date(now.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  const today = orders.filter((o) => dayOf(o) === todayStr);
  const open = (o) => !['cancelled', 'refunded', 'expired', 'pending_payment'].includes(o.status);
  const tomorrowStr = new Date(now.getTime() + 5.5 * 3600 * 1000 + 86400000).toISOString().slice(0, 10);
  const bookedFor = (d) => orders.filter((o) => o.scheduled_for === d && open(o));
  const sumQty = (list) => list.reduce((t, o) => t + Number(o.qty || 0), 0);
  const by = {};
  for (const o of today) by[o.status] = (by[o.status] || 0) + 1;

  const sum = (list) => list.reduce((t, o) => t + Number(o.total || 0), 0);
  const plates = (list) => list.reduce((t, o) => t + Number(o.qty || 0), 0);

  const delivered = today.filter((o) => o.status === 'delivered');
  const cod = (o) => o.payment_mode === 'cod';
  const cash = delivered.filter((o) => cod(o) && o.paid_by === 'cash');
  const upi = delivered.filter((o) => cod(o) && o.paid_by === 'upi');
  const online = today.filter((o) => !cod(o) && ['paid', 'preparing', 'ready', 'dispatched', 'delivered'].includes(o.status));
  // Cash / UPI customers still owe on delivery: everything active that is cash-on-delivery.
  const toCollect = orders.filter((o) => cod(o) && ACTIVE.includes(o.status));

  return {
    orders: today.length,
    byStatus: by,
    waitingToConfirm: orders.filter((o) => o.status === 'new').length, // any day: these need you now
    active: orders.filter((o) => ACTIVE.includes(o.status)).length,
    delivered: delivered.length,
    cancelled: by.cancelled || 0,
    needsRefund: orders.filter((o) => o.status === 'paid_needs_refund').length,
    platesSold: plates(today.filter((o) => ACTIVE.concat(['delivered']).includes(o.status))),
    cashCollected: sum(cash),
    upiCollected: sum(upi),
    onlineCollected: sum(online),
    collectedTotal: sum(cash) + sum(upi) + sum(online),
    toCollect: sum(toCollect),
    toCollectCount: toCollect.length,
    // Pre-booked orders for today (already part of today's 42) and for tomorrow.
    prebookedToday: { orders: bookedFor(todayStr).length, plates: sumQty(bookedFor(todayStr)) },
    prebookedTomorrow: { orders: bookedFor(tomorrowStr).length, plates: sumQty(bookedFor(tomorrowStr)) },
  };
}
