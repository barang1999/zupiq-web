import { Menu } from "lucide-react";

export function Header() {
  return (
    <header className="fixed top-0 w-full z-50 bg-slate-950/60 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-between px-6 h-16">
      <div className="flex items-center gap-4">
        <Menu className="w-6 h-6 text-primary-fixed active:scale-95 transition-transform cursor-pointer" />
        <h1 className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary-fixed to-secondary font-headline uppercase">
          NEURAL ENGINE
        </h1>
      </div>
      <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/30">
        <img
          alt="User Profile"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGWX7pERyRyft9dVEBr1YGNWPkhytpkIzwZXJQOZH4h8Q8Dcod-gdEcsfn7_cm7I-BAq2SR4VHe4yqLFTvD7L1T0puCXD1hmQ7XT9QjyBCEZQWDJHQ81FmPathzS2B1KPspDV_P4_waoIRr66yOeCBvv9MUNBm2abU8i_NiHv42QV1eIDA8j5usiPoNuhWYp8mb94Ed6TCZVjyThu0C4LismVvlin2tWXPlgqLeCBnnV7RSW_I5E_wEoZdtpccv9iihkNyrMXrJSE"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    </header>
  );
}
