function LoadingScreen({ label = "Loading" }) {
  return (
    <div className="flex min-h-64 items-center justify-center px-4" role="status" aria-live="polite">
      <div className="flex flex-col items-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-2 border-border" aria-hidden="true" />
          <span className="loading-ring absolute inset-0 rounded-full border-2 border-transparent border-t-accent border-r-accent" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-wide text-primary">NH</span>
        </div>
        <span className="mt-3 text-xs font-normal text-text-secondary/40">{label}...</span>
      </div>
    </div>
  );
}

export default LoadingScreen;
