import type { Metadata } from 'next';import type { ReactNode } from 'react';
import './globals.css';
export const metadata: Metadata = { title: 'AVIO — Creative Marketing That Moves', description: 'AVIO — Motion graphics, Meta campaign setup and social media marketing.', icons: { icon: '/avio-logo.svg', shortcut: '/avio-logo.svg', apple: '/avio-logo.svg' } };
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
