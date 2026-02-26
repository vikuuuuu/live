export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 20 }}>
        {children}
      </body>
    </html>
  );
}