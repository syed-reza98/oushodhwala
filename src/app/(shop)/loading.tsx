export default function ShopLoading() {
  return (
    <div className="animate-pulse space-y-4 pt-5" aria-busy="true" aria-label="Loading">
      <div className="h-48 rounded-2xl bg-secondary lg:h-72" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-secondary" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-secondary" />
        ))}
      </div>
    </div>
  );
}