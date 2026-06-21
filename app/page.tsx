import Navbar from "./components/Navbar";
import Hero from "./components/sections/Hero";
import Vision from "./components/sections/Vision";
import PremiereVisite from "./components/sections/PremiereVisite";
import Horaires from "./components/sections/Horaires";
import Cultes from "./components/sections/Cultes";
import Pasteurs from "./components/sections/Pasteurs";
import Don from "./components/sections/Don";
import Contact from "./components/sections/Contact";
import Footer from "./components/sections/Footer";
import { getChurchSettings } from "@/lib/churchSettings";

export default async function Home() {
  const s = await getChurchSettings()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Church",
    "name": s.church_name,
    "url": "https://egliselarencontre.fr",
    "description": s.tagline,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": s.address_street,
      "postalCode": s.address_zip,
      "addressLocality": s.address_city,
      "addressCountry": "FR"
    },
    "openingHours": "Su 10:00-12:00",
    "email": s.email,
    "sameAs": s.youtube_url ? [s.youtube_url] : [],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main>
        <Hero />
        <Vision />
        <PremiereVisite />
        <Horaires />
        <Cultes />
        <Pasteurs />
        <Don />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
