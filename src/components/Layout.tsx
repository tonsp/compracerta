import { NavLink, Outlet } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { logout } from "../lib/auth";
import {
  LayoutDashboard,
  ShoppingCart,
  History,
  User,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  Download,
} from "lucide-react";
import { useState, useEffect } from "react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/lists", label: "Minhas Listas", icon: ShoppingCart },
  { to: "/history", label: "Histórico", icon: History },
  { to: "/profile", label: "Perfil", icon: User },
];

export default function Layout() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    const result = await installPrompt.prompt();
    if (result.outcome === "accepted") {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
    installPrompt.userChoice.then(() => {
      setInstallPrompt(null);
    });
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-8">
          <ShoppingCart className="w-7 h-7 text-primary-600" />
          <span className="text-xl font-bold text-primary-600">
            CompraCerta
          </span>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${
                  isActive
                    ? "bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-medium"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
            {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
          </button>
          {showInstallBanner && (
            <button
              onClick={handleInstall}
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors"
            >
              <Download className="w-5 h-5" />
              Instalar App
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden flex items-center justify-between bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary-600" />
            <span className="text-lg font-bold text-primary-600">
              CompraCerta
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </header>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${
                    isActive
                      ? "bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-medium"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sair
            </button>
          </div>
        )}

        {/* Install banner */}
        {showInstallBanner && (
          <div className="md:hidden bg-primary-600 text-white px-4 py-2.5 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Instale o app na tela inicial</p>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleInstall}
                className="bg-white text-primary-700 px-3 py-1 rounded-lg text-xs font-bold"
              >
                Instalar
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="text-white/70 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
