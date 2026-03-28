import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Menu, X, User as UserIcon, LogOut } from "lucide-react";

type PublicHeaderPage = "home" | "plan" | "how-it-works";

interface PublicHeaderProps {
  user: any;
  onAuthClick: () => void;
  onSignOut?: () => void;
  onNavigateHome?: () => void;
  onNavigatePlan?: () => void;
  onNavigateHowItWorks?: () => void;
  activePage?: PublicHeaderPage;
}

export function PublicHeader({
  user,
  onAuthClick,
  onSignOut,
  onNavigateHome,
  onNavigatePlan,
  onNavigateHowItWorks,
  activePage = "home",
}: PublicHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAuthenticated = Boolean(user);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
      return;
    }
    window.location.href = "/";
  };

  const handlePlan = () => {
    if (onNavigatePlan) {
      onNavigatePlan();
      return;
    }
    window.location.href = "/plan";
  };

  const handleHowItWorks = () => {
    if (onNavigateHowItWorks) {
      onNavigateHowItWorks();
      return;
    }
    window.location.href = "/how-it-works";
  };

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/80 backdrop-blur-xl py-4 shadow-2xl" : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
        <button
          onClick={handleHome}
          className="text-2xl font-headline font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary"
        >
          Zupiq
        </button>

        <div className="hidden md:flex gap-8 items-center font-headline font-medium">
          <button
            onClick={handleHome}
            className={activePage === "home" ? "text-primary border-b-2 border-primary pb-1" : "text-on-surface-variant hover:text-on-surface transition-colors"}
          >
            Home
          </button>
          <button
            onClick={handlePlan}
            className={activePage === "plan" ? "text-primary border-b-2 border-primary pb-1" : "text-on-surface-variant hover:text-on-surface transition-colors"}
          >
            Pricing
          </button>
          <button
            onClick={handleHowItWorks}
            className={activePage === "how-it-works" ? "text-primary border-b-2 border-primary pb-1" : "text-on-surface-variant hover:text-on-surface transition-colors"}
          >
            How it Works
          </button>
          <a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">Community</a>
        </div>

        <div className="hidden md:flex gap-4 items-center">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <UserIcon className="w-5 h-5" />
                <span className="text-sm font-medium">{user.full_name || user.email}</span>
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="text-on-surface-variant hover:text-secondary transition-colors p-2"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={onAuthClick}
                className="text-on-surface-variant hover:text-on-surface transition-colors px-4 py-2"
              >
                Log In
              </button>
              <button
                onClick={onAuthClick}
                className="bg-gradient-to-r from-primary to-secondary text-on-primary font-bold px-6 py-2 rounded-full hover:opacity-90 transition-opacity"
              >
                Get Started
              </button>
            </>
          )}
        </div>

        <button className="md:hidden text-on-surface" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-full left-0 w-full bg-surface-container-highest border-t border-white/5 p-8 flex flex-col gap-6"
        >
          <button onClick={handleHome} className="text-left text-on-surface-variant">Home</button>
          <button onClick={handlePlan} className="text-left text-on-surface-variant">Pricing</button>
          <button onClick={handleHowItWorks} className="text-left text-on-surface-variant">How it Works</button>
          <a href="#" className="text-on-surface-variant">Community</a>
          <hr className="border-white/5" />
          {isAuthenticated ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-on-surface">
                <UserIcon className="w-5 h-5" />
                <span>{user.full_name || user.email}</span>
              </div>
              {onSignOut && <button onClick={onSignOut} className="text-secondary text-left">Sign Out</button>}
            </div>
          ) : (
            <>
              <button onClick={onAuthClick} className="text-on-surface-variant text-left">Log In</button>
              <button
                onClick={onAuthClick}
                className="bg-gradient-to-r from-primary to-secondary text-on-primary font-bold px-6 py-3 rounded-full text-center"
              >
                Get Started
              </button>
            </>
          )}
        </motion.div>
      )}
    </nav>
  );
}
