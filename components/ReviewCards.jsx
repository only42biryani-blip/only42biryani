// Presentational only (no data fetching), so it is easy to preview and restyle.
export function Stars({ value, size = 'text-base' }) {
  const full = Math.round(value);
  return (
    <span className={`${size} tracking-wider text-saffron`} role="img" aria-label={`${value} out of 5 stars`}>
      {'★'.repeat(full)}
      <span className="text-white/20">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

const when = (d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

export default function ReviewCards({ reviews, average, count }) {
  if (!reviews.length) return null;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="font-grotesk text-4xl font-extrabold text-[#F5F1E8]">{average.toFixed(1)}</span>
        <Stars value={average} size="text-2xl" />
        <span className="text-white/50 text-sm">{count} review{count === 1 ? '' : 's'}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <figure key={r.id} className="hud-box p-5 flex flex-col gap-3">
            <Stars value={r.rating} />
            <blockquote className="text-white/80 text-sm leading-relaxed break-words">{r.comment}</blockquote>
            <figcaption className="text-white/45 text-xs mt-auto">
              {r.name} · {when(r.created_at)}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
