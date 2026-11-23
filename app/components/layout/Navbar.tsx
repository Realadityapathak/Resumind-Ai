import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { usePuterStore } from "~/services/puter/store";
import Icon from "~/components/ui/Icon";

export default function Navbar() {
  const { auth, puterReady, isLoading } = usePuterStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = puterReady && !isLoading && auth.isAuthenticated;
  const username = auth.user?.username || "User";
  const userInitials = username.slice(0, 2).toUpperCase();

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  // Close menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setUserDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside user dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userDropdownOpen]);

  const handleSignOut = async () => {
    await auth.signOut();
    setUserDropdownOpen(false);
    navigate("/");
  };

  const isHome = location.pathname === "/";

  const desktopLinkClass = (active: boolean) =>
    `relative text-[13px] transition-colors ${
      active
        ? "text-blue-600 font-semibold after:absolute after:-bottom-1.5 after:left-0 after:right-0 after:h-px after:bg-cobalt"
        : "nav-link-underline text-ink-3 font-medium hover:text-ink"
    }`;

  const marketingLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Testimonials", href: "#testimonials" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-rule bg-paper">
      <nav className="navbar transition-all">
        {/* Brand */}
        <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2 shrink-0 py-2.5 -my-2.5">
          <span className="text-[17px] font-bold text-ink tracking-[-0.045em]">RESUMIND</span>
          <span className="bg-cobalt text-paper text-[9px] font-bold leading-none px-1 py-0.5 rounded-[2px]">
            AI
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-7">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className={desktopLinkClass(location.pathname === "/dashboard")}>
                Dashboard
              </Link>
              <Link
                to="/workspace"
                className={desktopLinkClass(
                  location.pathname.startsWith("/workspace") || location.pathname.startsWith("/resume")
                )}
              >
                AI Workspace
              </Link>
              <Link to="/profile" className={desktopLinkClass(location.pathname === "/profile")}>
                Profile
              </Link>
            </>
          ) : isHome ? (
            marketingLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="nav-link-underline text-[13px] font-medium text-ink-3 transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            ))
          ) : (
            marketingLinks.map((link) => (
              <Link
                key={link.href}
                to={`/${link.href}`}
                className="nav-link-underline text-[13px] font-medium text-ink-3 transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))
          )}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link to="/upload" className="primary-button !px-4 !py-2 text-[13px]">
                <Icon name="plus" size={15} />
                Upload Resume
              </Link>

              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1 pl-1.5 rounded-[3px] border border-transparent hover:border-rule hover:bg-surface focus:outline-none cursor-pointer transition-colors"
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="true"
                  aria-label="User menu"
                >
                  <span className="w-7 h-7 rounded-full bg-cobalt text-paper flex items-center justify-center font-semibold text-[10px] tracking-wide">
                    {userInitials}
                  </span>
                  <span className="text-[13px] font-medium text-ink-2 pr-1">@{username}</span>
                  <Icon name="chevron-down" size={14} className="text-ink-4" />
                </button>

                {userDropdownOpen && (
                  <div
                    className="menu-pop absolute right-0 z-50 mt-2 w-56 rounded-[3px] border border-rule bg-surface p-1.5"
                    data-testid="user-dropdown-menu"
                  >
                    <div className="px-2.5 py-2 border-b border-rule">
                      <p className="text-[11px] text-ink-3 font-medium">Signed in as</p>
                      <p className="text-sm font-semibold text-ink truncate">@{username}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2.5 px-2.5 py-2 text-[13px] text-ink-2 hover:bg-surface-2 hover:text-ink rounded-[2px]"
                      >
                        <Icon name="grid" size={15} />
                        My Dashboard
                      </Link>
                      <Link
                        to="/workspace"
                        className="flex items-center gap-2.5 px-2.5 py-2 text-[13px] text-ink-2 hover:bg-surface-2 hover:text-ink rounded-[2px]"
                      >
                        <Icon name="sparkle" size={15} />
                        AI Workspace
                      </Link>
                      <Link
                        to="/profile"
                        className="flex items-center gap-2.5 px-2.5 py-2 text-[13px] text-ink-2 hover:bg-surface-2 hover:text-ink rounded-[2px]"
                      >
                        <Icon name="user" size={15} />
                        Profile & Settings
                      </Link>
                    </div>
                    <div className="pt-1 border-t border-rule">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2.5 text-left px-2.5 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 rounded-[2px] cursor-pointer"
                      >
                        <Icon name="logout" size={15} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/auth?next=/dashboard"
                className="text-[13px] font-semibold text-ink-2 hover:text-ink px-3 py-2 transition-colors"
              >
                Sign In
              </Link>
              <Link to="/upload" className="primary-button !px-4 !py-2 text-[13px]">
                Get Started Free
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-[3px] p-2.5 text-ink-2 transition-[color,background-color,transform] duration-200 hover:bg-surface-2 hover:text-ink focus:outline-none active:scale-95"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <Icon name={mobileMenuOpen ? "close" : "menu"} size={22} />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" data-testid="mobile-menu-drawer">
          <div
            className="backdrop-in fixed inset-0 bg-ink/45 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
            data-testid="mobile-menu-backdrop"
          />

          <div className="drawer-in fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col justify-between overflow-y-auto border-l border-rule bg-paper">
            <div>
              <div className="flex items-center justify-between px-5 py-4 border-b border-rule">
                <span className="text-[17px] font-bold text-ink tracking-[-0.045em]">RESUMIND</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 -mr-2 rounded-[3px] text-ink-3 hover:text-ink hover:bg-surface-2 cursor-pointer"
                  aria-label="Close menu"
                >
                  <Icon name="close" size={20} />
                </button>
              </div>

              <div className="flex flex-col py-2">
                {isAuthenticated ? (
                  <>
                    <div className="mx-5 my-3 p-3 bg-surface border border-rule rounded-[3px] flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-cobalt text-paper flex items-center justify-center font-semibold text-[11px]">
                        {userInitials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-ink-3 font-medium">Signed in</p>
                        <p className="text-sm font-semibold text-ink truncate">@{username}</p>
                      </div>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-5 py-3.5 text-[15px] font-medium text-ink-2 hover:text-ink hover:bg-surface border-b border-rule"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/workspace"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-5 py-3.5 text-[15px] font-medium text-ink-2 hover:text-ink hover:bg-surface border-b border-rule"
                    >
                      AI Workspace
                    </Link>
                    <Link
                      to="/upload"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-5 py-3.5 text-[15px] font-medium text-ink-2 hover:text-ink hover:bg-surface border-b border-rule"
                    >
                      Upload Resume
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-5 py-3.5 text-[15px] font-medium text-ink-2 hover:text-ink hover:bg-surface border-b border-rule"
                    >
                      Profile & Settings
                    </Link>
                  </>
                ) : (
                  marketingLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-5 py-3.5 text-[15px] font-medium text-ink-2 hover:text-ink hover:bg-surface border-b border-rule"
                    >
                      {link.label}
                    </a>
                  ))
                )}
              </div>
            </div>

            <div className="p-5 border-t border-rule flex flex-col gap-3">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-3 rounded-[3px] border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 text-center cursor-pointer transition-colors"
                >
                  Sign Out
                </button>
              ) : (
                <>
                  <Link
                    to="/upload"
                    onClick={() => setMobileMenuOpen(false)}
                    className="primary-button text-center text-sm font-semibold py-3"
                  >
                    Analyze Resume Free
                  </Link>
                  <Link
                    to="/auth?next=/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-3 rounded-[3px] border border-rule-strong text-sm font-semibold text-ink hover:bg-surface-2 transition-colors"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
