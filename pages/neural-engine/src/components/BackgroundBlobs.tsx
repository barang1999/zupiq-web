export function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
      <div className="absolute top-1/4 -right-20 w-64 h-64 bg-secondary-container/10 blur-[100px] rounded-full" />
      <div className="absolute bottom-1/4 -left-20 w-64 h-64 bg-primary-container/10 blur-[100px] rounded-full" />
    </div>
  );
}
