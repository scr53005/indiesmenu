export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        colorScheme: 'light',
        background: '#f3f4f6',
        color: '#1f2937',
        minHeight: '100vh',
      }}
    >
      {children}
    </div>
  );
}
