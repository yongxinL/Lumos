import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUserStore } from '../store/userStore';

/**
 * Main layout component with sidebar navigation
 * AC-1.2.2.6: Basic layout component with navigation
 */
export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { userName, themePreference } = useUserStore();

  const navigationItems = [
    { href: '/chat', label: 'Chat', icon: '💬', shortcut: '⌘1' },
    { href: '/activity', label: 'Activity', icon: '📊', shortcut: '⌘2' },
    { href: '/permissions', label: 'Permissions', icon: '🔐', shortcut: '⌘3' },
    { href: '/skills', label: 'Skills', icon: '⚡', shortcut: '⌘4' },
    { href: '/settings', label: 'Settings', icon: '⚙️', shortcut: '⌘5' },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-secondary border-r border-border transition-all duration-300 flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className={`${!sidebarOpen && 'hidden'}`}>
              <h1 className="text-xl font-bold text-primary">Lumos</h1>
              <p className="text-xs text-muted-foreground">AI Assistant</p>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title="Toggle sidebar"
            >
              {sidebarOpen ? '←' : '→'}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive(item.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-foreground'
              }`}
              title={item.label}
            >
              <span className="text-lg">{item.icon}</span>
              <span className={`text-sm font-medium ${!sidebarOpen && 'hidden'}`}>
                {item.label}
              </span>
              {sidebarOpen && (
                <span className="ml-auto text-xs text-muted-foreground">{item.shortcut}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* User Profile */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              {userName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className={`${!sidebarOpen && 'hidden'}`}>
              <p className="text-sm font-medium text-foreground">{userName || 'User'}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-muted border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {navigationItems.find((item) => isActive(item.href))?.label || 'Lumos'}
            </h2>
            <p className="text-sm text-muted-foreground">Welcome back, {userName || 'User'}!</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              className={`text-sm font-medium px-3 py-2 rounded-md transition-colors ${
                themePreference === 'dark'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary text-foreground'
              }`}
              title="Theme preference"
            >
              {themePreference === 'dark' ? '🌙' : '☀️'}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      </div>
    </div>
  );
}
