import type { Metadata } from 'next';import type { ReactNode } from 'react';
import './globals.css';
export const metadata: Metadata = { title: 'AVIO — Creative Marketing That Moves', description: 'Motion graphics, Meta campaign setup and social media marketing.' };
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
