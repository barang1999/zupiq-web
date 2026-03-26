import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Menu, X, Brain, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { useAuth } from "../../hooks/useAuth";
import { useAppStore } from "../../store/app.store";
import { NAV_ITEMS } from "../../constants/routes";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { navigateTo, openAuthModal, currentPage } = useAppStore();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = NAV_ITEMS.filter(
    (item) => !item.requiresAuth || isAuthenticated
  );

  return (
    <nav
      className={[
        "fixed top-0 w-full z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/80 backdrop-blur-xl py-4 shadow-2xl"
          : "bg-transparent py-6",
      ].join(" ")}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        {/* Logo */}
        <button
          onClick={() => navigateTo(isAuthenticated ? "dashboard" : "landing")}
          className="text-2xl font-headline font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary"
        >
          Zupiq
        </button>

        {/* Desktop nav links */}
        {isAuthenticated && (
          <div className="hidden md:flex gap-6 items-center font-medium">
            {navLinks.slice(0, 5).map((item) => (
              <button
                key={item.page}
                onClick={() => navigateTo(item.page)}
                className={[
                  "transition-colors text-sm",
                  currentPage === item.page
                    ? "text-primary border-b border-primary pb-0.5"
                    : "text-on-surface-variant hover:text-on-surface",
                ].join(" ")}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Auth / User section */}
        <div className="hidden md:flex gap-3 items-center">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigateTo("profile")}
                className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <Avatar src={user?.avatar_url} name={user?.full_name} size="sm" />
                <span className="text-sm font-medium hidden lg:block">
                  {user?.full_name?.split(" ")[0]}
                </span>
              </button>
              <button
                onClick={logout}
                className="text-on-surface-variant hover:text-secondary transition-colors p-2"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={openAuthModal}>
                Log In
              </Button>
              <Button variant="primary" size="sm" onClick={openAuthModal}>
                Get Started
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-on-surface p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-full left-0 w-full bg-surface-container-highest border-t border-white/5 p-6 flex flex-col gap-4"
        >
          {isAuthenticated
            ? navLinks.map((item) => (
                <button
                  key={item.page}
                  onClick={() => {
                    navigateTo(item.page);
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-on-surface-variant hover:text-on-surface text-left transition-colors py-1"
                >
                  {item.label}
                </button>
              ))
            : null}
          <hr className="border-white/5" />
          {isAuthenticated ? (
            <button
              onClick={() => { logout(); setIsMobileMenuOpen(false); }}
              className="text-secondary text-left"
            >
              Sign Out
            </button>
          ) : (
            <>
              <button
                onClick={() => { openAuthModal(); setIsMobileMenuOpen(false); }}
                className="text-on-surface-variant text-left"
              >
                Log In
              </button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => { openAuthModal(); setIsMobileMenuOpen(false); }}
              >
                Get Started
              </Button>
            </>
          )}
        </motion.div>
      )}
    </nav>
  );
}
