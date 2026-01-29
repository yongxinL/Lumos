import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal';
import { ShortcutSettings } from './components/ShortcutSettings';
import './App.css';

/**
 * Main application component
 * Sets up routing, keyboard shortcuts, and UI
 */
function AppContent() {
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Initialize keyboard shortcuts with command palette handler
  useKeyboardShortcuts(() => {
    setShowShortcutsModal(true);
  });

  return (
    <>
      <div className="app-container">
        <header className="app-header">
          <h1>Lumos</h1>
          <p>AI-powered assistant for ServiceNow</p>
        </header>

        <nav className="app-nav">
          <ul>
            <li>
              <a href="/chat">Chat (⌘1)</a>
            </li>
            <li>
              <a href="/activity">Activity (⌘2)</a>
            </li>
            <li>
              <a href="/permissions">Permissions (⌘3)</a>
            </li>
            <li>
              <a href="/skills">Skills (⌘4)</a>
            </li>
            <li>
              <a href="/settings">Settings (⌘5)</a>
            </li>
          </ul>
        </nav>

        <main className="app-main">
          <Routes>
            <Route path="/chat" element={<ChatView />} />
            <Route path="/activity" element={<ActivityView />} />
            <Route path="/permissions" element={<PermissionsView />} />
            <Route path="/skills" element={<SkillsView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/" element={<HomeView />} />
          </Routes>
        </main>
      </div>

      <ShortcutsHelpModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

// Placeholder components for each view
function HomeView() {
  return (
    <div className="view">
      <h2>Welcome to Lumos</h2>
      <p>Use the keyboard shortcuts below for faster navigation:</p>
      <ul>
        <li>
          <kbd>⌘1</kbd> - Chat
        </li>
        <li>
          <kbd>⌘2</kbd> - Activity
        </li>
        <li>
          <kbd>⌘3</kbd> - Permissions
        </li>
        <li>
          <kbd>⌘4</kbd> - Skills
        </li>
        <li>
          <kbd>⌘5</kbd> - Settings
        </li>
        <li>
          <kbd>⌘K</kbd> - Command Palette
        </li>
        <li>
          <kbd>⌘/</kbd> - Show Shortcuts Help
        </li>
      </ul>
    </div>
  );
}

function ChatView() {
  return (
    <div className="view">
      <h2>Chat</h2>
      <p>Chat with Lumos AI Assistant</p>
    </div>
  );
}

function ActivityView() {
  return (
    <div className="view">
      <h2>Activity</h2>
      <p>View your recent activities</p>
    </div>
  );
}

function PermissionsView() {
  return (
    <div className="view">
      <h2>Permissions</h2>
      <p>Manage ServiceNow permissions</p>
    </div>
  );
}

function SkillsView() {
  return (
    <div className="view">
      <h2>Skills</h2>
      <p>Available AI skills and capabilities</p>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="view">
      <h2>Settings</h2>
      <ShortcutSettings />
    </div>
  );
}
