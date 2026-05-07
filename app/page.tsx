import Navbar from "./components/Navbar";
import Hero from "./components/sections/Hero";
import Horaires from "./components/sections/Horaires";
import Cultes from "./components/sections/Cultes";
import Pasteurs from "./components/sections/Pasteurs";
import Contact from "./components/sections/Contact";
import Footer from "./components/sections/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Horaires />
        <Cultes />
        <Pasteurs />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
