import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://loloat-sanhour.com'),
  title: "لؤلؤة سنهور | كشري وطواجن على أصولها بالفيوم",
  description: "المنيو الإلكتروني الفاخر لمطعم لؤلؤة سنهور - أشهى طواجن الفرن وكشري زمان وإضافات ملكية، مع خدمة التوصيل السريع لجميع أنحاء سنهور والفيوم والدفع الفوري عبر إنستاباي ومحافظ الكاش.",
  keywords: ["كشري", "طواجن", "لؤلؤة سنهور", "الفيوم", "سنهور", "منيو كشري", "أكل مصري", "طواجن فرن"],
  authors: [{ name: "لؤلؤة سنهور" }],
  openGraph: {
    title: "لؤلؤة سنهور - كشري وطواجن على أصولها",
    description: "اطلب الآن أشهى كشري وطواجن فخار ساخنة من لؤلؤة سنهور مع توصيل سريع لجميع المناطق.",
    url: "https://loloat-sanhour.com",
    siteName: "لؤلؤة سنهور",
    images: [
      {
        url: "/logo.jpg",
        width: 800,
        height: 800,
        alt: "شعار لؤلؤة سنهور - كشري وطواجن",
      },
    ],
    locale: "ar_EG",
    type: "website",
  },
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full bg-[#f8f9fb]">
      <head>
        <link rel="apple-touch-icon" href="/logo.jpg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-full flex flex-col bg-[#f8f9fb] text-slate-900 selection:bg-rose-600 selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
