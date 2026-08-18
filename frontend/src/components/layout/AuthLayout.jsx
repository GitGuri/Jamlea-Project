// Shared background for the public auth pages (Login/Register) -- a looping
// muted video behind a dark overlay, with the actual page content (the white
// card) on top. playsInline is required for autoplay to work on iOS Safari;
// muted is required for autoplay to work in any browser at all.
export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/loginscreen.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-ink/70" />
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  );
}
