export default function Loading() {
  return (
    <div className="page-stack">
      <div className="route-loading">
        <div />
      </div>
      <div className="loading-panel">
        <div className="loading-line wide" />
        <div className="loading-line" />
        <div className="loading-table">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
