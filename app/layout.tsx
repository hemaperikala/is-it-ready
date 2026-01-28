import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Is It Ready? - Tailor Shop Management',
  description: 'Professional SaaS for managing tailor shop orders',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}