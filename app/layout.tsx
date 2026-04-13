import type { Metadata } from "next";
import { Archivo_Black, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { ConvexClientProvider } from "./providers";
import "./globals.css";

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo-black",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-space-grotesk",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "DESKSIDE",
  description:
    "1,400+ live concerts. Classified by genre, mood, and vibe. Flip through like a TV.",
  openGraph: {
    title: "DESKSIDE",
    description: "1,400+ live concerts. Classified by genre, mood, and vibe. Flip through like a TV.",
    images: ["/api/og?title=DESKSIDE&subtitle=Every+live+concert.+Every+genre.+Flip+through."],
  },
  twitter: {
    card: "summary_large_image",
    title: "DESKSIDE",
    description: "1,400+ live concerts. Classified by genre, mood, and vibe.",
    images: ["/api/og?title=DESKSIDE&subtitle=Every+live+concert.+Every+genre.+Flip+through."],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivoBlack.variable} ${spaceGrotesk.variable} ${plexMono.variable} h-full`}
    >
      <body className="min-h-full bg-bg text-text-primary font-sans antialiased">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
