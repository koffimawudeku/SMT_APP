import ThemeToggle from "../theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle variant="icon" />
      </div>
      {children}
    </div>
  );
}
