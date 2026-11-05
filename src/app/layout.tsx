import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'MitrAI — a little life, a world of possibility',
  description:
    'Create a character. Shape it through shared experience. Discover a story worth continuing.',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
