export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#002D42] via-[#092A3D] to-[#0a3a54] p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
