import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./workspace.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://markoum.app";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Markoum — Visualisasi Silsilah & Pembuat Pohon Keluarga Interaktif",
    template: "%s | Markoum",
  },
  description:
    "Markoum adalah aplikasi modern untuk membuat, mengelola, dan memvisualisasikan silsilah pohon keluarga (genealogi) secara interaktif, rapi, cepat, dan 100% privat langsung di peramban.",
  applicationName: "Markoum",
  authors: [{ name: "Markoum", url: siteUrl }],
  generator: "Next.js",
  keywords: [
    "markoum",
    "markoum app",
    "silsilah keluarga",
    "pohon keluarga",
    "pembuat pohon keluarga",
    "aplikasi silsilah keluarga",
    "bagan silsilah online",
    "family tree maker",
    "family tree builder",
    "genealogi indonesia",
    "tarombo",
    "tarombo batak",
    "diagram garis keturunan",
    "visualisasi silsilah interaktif",
    "pedigree chart maker",
    "free family tree generator",
  ],
  creator: "Markoum",
  publisher: "Markoum",
  category: "productivity",
  classification: "Family Tree Maker & Genealogy Visualization",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
    languages: {
      "id-ID": "/",
      "en-US": "/",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    alternateLocale: ["en_US"],
    url: "/",
    title: "Markoum — Visualisasi Silsilah & Pembuat Pohon Keluarga Interaktif",
    description:
      "Aplikasi studio silsilah pohon keluarga modern dan interaktif. Buat garis keturunan, kelola relasi keluarga, dan visualisasikan silsilah dengan mudah, cepat, dan privat.",
    siteName: "Markoum",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Markoum — Visualisasi Silsilah & Pembuat Pohon Keluarga Interaktif",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Markoum — Visualisasi Silsilah & Pembuat Pohon Keluarga",
    description:
      "Aplikasi studio pohon keluarga interaktif. Buat, kelola, dan visualisasikan silsilah keluarga Anda secara modern dan privat.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [{ url: "/favicon.ico?v=4" }],
    apple: "/apple-touch-icon.png?v=4",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Markoum",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#app`,
      name: "Markoum",
      alternateName: ["Markoum Family Tree", "Tarombo Markoum"],
      url: siteUrl,
      applicationCategory: "GenealogyApplication",
      operatingSystem: "All",
      description:
        "Aplikasi web modern untuk merancang, mengelola, dan memvisualisasikan silsilah pohon keluarga secara interaktif, rapi, dan privat.",
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      softwareVersion: "1.0.0",
      inLanguage: ["id", "en"],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "IDR",
        availability: "https://schema.org/InStock",
      },
      featureList: [
        "Visualisasi bagan silsilah pohon keluarga interaktif tak terbatas",
        "Mesin auto-layout cerdas untuk multi-generasi dan pernikahan majemuk",
        "Mode fokus leluhur (ancestor), keturunan (descendant), dan cabang keluarga",
        "Penyimpanan privat otomatis di peramban (Local Storage & File System Access API)",
        "Ekspor grafik SVG beresolusi tinggi dan pencadangan berkas JSON",
        "Pencarian anggota keluarga instan dan navigasi cepat",
      ],
      screenshot: `${siteUrl}/og-image.png`,
      author: {
        "@type": "Organization",
        name: "Markoum",
        url: siteUrl,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Markoum",
      description: "Visualisasi Silsilah & Pembuat Pohon Keluarga Interaktif",
      inLanguage: "id",
      publisher: {
        "@type": "Organization",
        name: "Markoum",
        url: siteUrl,
        logo: `${siteUrl}/apple-touch-icon.png`,
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "Apa itu Markoum?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Markoum adalah aplikasi modern berbasis web untuk membuat, mengelola, dan memvisualisasikan diagram silsilah pohon keluarga (genealogi) secara interaktif, rapi, dan mudah digunakan langsung di peramban.",
          },
        },
        {
          "@type": "Question",
          name: "Apakah data silsilah keluarga di Markoum aman dan privat?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Ya, sangat aman. Markoum memproses dan menyimpan data silsilah keluarga secara lokal di peramban Anda (Local Storage atau File System perangkat Anda), tanpa mengirimkan data pribadi anggota keluarga ke server eksternal.",
          },
        },
        {
          "@type": "Question",
          name: "Apakah Markoum gratis digunakan?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Ya, Markoum dapat digunakan secara gratis untuk membuat, menyunting, dan mengekspor bagan silsilah pohon keluarga.",
          },
        },
        {
          "@type": "Question",
          name: "Format apa saja yang didukung untuk mengekspor silsilah keluarga di Markoum?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Markoum mendukung ekspor berkas JSON untuk pencadangan data, serta ekspor visual berkualitas tinggi dalam format SVG dan PNG untuk dicetak atau dibagikan.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
