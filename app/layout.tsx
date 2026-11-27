import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'AVIO — Creative Marketing That Moves', description: 'Motion graphics, Meta campaign setup and social media marketing.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
