import Image from "next/image";

export default function WaveDivider({ color = "currentColor", className = "" }: { color?: string; className?: string }) {
  const isLight = color === "rgba(255,255,255,0.5)" || color === "rgba(255,255,255,0.2)";
  return (
    <div className={`w-full overflow-hidden flex justify-center ${className}`} style={{ height: "80px" }} aria-hidden>
      <Image
        src="/logo.png"
        alt=""
        width={400}
        height={400}
        className="w-auto object-cover object-center"
        style={{
          height: "320px",
          marginTop: "-120px",
          ...(isLight ? { opacity: 0.5 } : { filter: "invert(59%) sepia(31%) saturate(486%) hue-rotate(146deg) brightness(89%) contrast(95%)" })
        }}
      />
    </div>
  );
}
