export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      {/* Ảnh nền thương hiệu + lớp phủ tối cho dễ đọc */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: "url('/brand/banner-fermat.png')" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-slate-950/70"
      />
      {/* Nền trang trí */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl"
      />
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  );
}
