import Image from "next/image";
import WaveDivider from "../WaveDivider";

export default function Pasteurs() {
  return (
    <section id="pasteurs" className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto text-center">
        <p className="font-sans text-xs tracking-[0.3em] uppercase text-teal mb-3">
          L&apos;équipe
        </p>
        <h2 className="font-display text-4xl md:text-5xl font-light text-dark mb-1">
          Nos pasteurs
        </h2>
        <WaveDivider color="#5A9EA6" className="mb-2" />

        <div className="flex flex-col items-center">
          <div className="rounded-xl overflow-hidden mb-6 ring-4 ring-teal-light">
            <Image
              src="/audrey_nico.png"
              alt="Audrey et Nicolas Salafranque"
              width={600}
              height={400}
              className="w-full max-w-lg h-auto object-cover"
            />
          </div>
          <h3 className="font-display text-2xl font-semibold text-dark">
            Audrey et Nicolas Salafranque
          </h3>
        </div>
      </div>
    </section>
  );
}
