import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal';
import { ShortcutSettings } from './components/ShortcutSettings';
import { useUserStore } from './store/userStore';
import { useConversationStore } from './store/conversationStore';
import { useSettingsStore } from './store/settingsStore';
import './App.css';

/**
 * Main application component
 * AC-1.2.2.1: React 18 application bootstrapped
 * AC-1.2.2.2: React Router configured with 5 main views
 * AC-1.2.2.3: Zustand stores integrated
 */
function AppContent() {
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const { userId, setUser } = useUserStore();
  useConversationStore();
  useSettingsStore();

  // Initialize keyboard shortcuts
  useKeyboardShortcuts(() => {
    setShowShortcutsModal(true);
  });

  // Initialize user if not already set
  useEffect(() => {
    if (!userId) {
      setUser('user-1', 'John Doe', 'john@example.com');
    }
  }, [userId, setUser]);

  return (
    <>
      <Layout>
        <div className="p-6 md:p-8">
          <Routes>
            <Route path="/chat" element={<ChatView />} />
            <Route path="/activity" element={<ActivityView />} />
            <Route path="/permissions" element={<PermissionsView />} />
            <Route path="/skills" element={<SkillsView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/" element={<HomeView />} />
          </Routes>
        </div>
      </Layout>

      <ShortcutsHelpModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}

// View components
function HomeView() {
  const { userName } = useUserStore();

  return (
    <div className="view">
      <h2>Welcome to Lumos</h2>
      <p>
        Hello, {userName}! Lumos is your AI-powered assistant for ServiceNow. Use the keyboard
        shortcuts below for faster navigation:
      </p>
      <ul className="grid md:grid-cols-2 gap-4 mt-6">
        <li className="bg-secondary p-3 rounded-md">
          <kbd>⌘1</kbd> - Navigate to Chat
        </li>
        <li className="bg-secondary p-3 rounded-md">
          <kbd>⌘2</kbd> - Navigate to Activity
        </li>
        <li className="bg-secondary p-3 rounded-md">
          <kbd>⌘3</kbd> - Navigate to Permissions
        </li>
        <li className="bg-secondary p-3 rounded-md">
          <kbd>⌘4</kbd> - Navigate to Skills
        </li>
        <li className="bg-secondary p-3 rounded-md">
          <kbd>⌘5</kbd> - Navigate to Settings
        </li>
        <li className="bg-secondary p-3 rounded-md">
          <kbd>⌘K</kbd> - Open Command Palette
        </li>
        <li className="bg-secondary p-3 rounded-md">
          <kbd>⌘/</kbd> - Show Shortcuts Help
        </li>
        <li className="bg-secondary p-3 rounded-md">
          <kbd>⌘Shift+L</kbd> - Toggle Window
        </li>
      </ul>
    </div>
  );
}

function ChatView() {
  const { conversations } = useConversationStore();

  return (
    <div className="view">
      <h2>Chat</h2>
      <p>Chat with Lumos AI Assistant for ServiceNow automation and insights.</p>
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <div className="bg-secondary p-6 rounded-lg border border-border">
          <h3 className="font-semibold mb-2">Recent Conversations</h3>
          <p className="text-sm text-muted-foreground">
            {conversations.length === 0
              ? 'No conversations yet. Start a new chat!'
              : `${conversations.length} conversation(s)`}
          </p>
        </div>
        <div className="bg-primary text-primary-foreground p-6 rounded-lg">
          <h3 className="font-semibold mb-2">Quick Actions</h3>
          <button className="text-sm px-3 py-2 bg-primary-foreground text-primary rounded mt-2">
            New Chat
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityView() {
  return (
    <div className="view">
      <h2>Activity</h2>
      <p>View your recent activities and Lumos interactions.</p>
      <div className="bg-secondary p-6 rounded-lg border border-border mt-4">
        <p className="text-sm text-muted-foreground">No recent activities yet.</p>
      </div>
    </div>
  );
}

function PermissionsView() {
  return (
    <div className="view">
      <h2>Permissions</h2>
      <p>Manage ServiceNow permissions and trust levels for Lumos operations.</p>
      <div className="bg-secondary p-6 rounded-lg border border-border mt-4">
        <h3 className="font-semibold mb-2">Connected Instances</h3>
        <p className="text-sm text-muted-foreground">No ServiceNow instances connected yet.</p>
      </div>
    </div>
  );
}

function SkillsView() {
  return (
    <div className="view">
      <h2>Skills</h2>
      <p>Available AI skills and capabilities for ServiceNow automation.</p>
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <div className="bg-secondary p-4 rounded-lg border border-border">
          <h3 className="font-semibold text-sm mb-1">Incident Management</h3>
          <p className="text-xs text-muted-foreground">Create, update, and resolve incidents</p>
        </div>
        <div className="bg-secondary p-4 rounded-lg border border-border">
          <h3 className="font-semibold text-sm mb-1">Change Management</h3>
          <p className="text-xs text-muted-foreground">Manage change requests</p>
        </div>
        <div className="bg-secondary p-4 rounded-lg border border-border">
          <h3 className="font-semibold text-sm mb-1">Knowledge Base</h3>
          <p className="text-xs text-muted-foreground">Search and create knowledge articles</p>
        </div>
      </div>
    </div>
  );
}

function SettingsView() {
  const { audioEnabled, notificationsEnabled, expertModelSelection } = useSettingsStore();

  return (
    <div className="view">
      <h2>Settings</h2>
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold mb-3">Application Settings</h3>
          <div className="bg-secondary p-4 rounded-lg border border-border space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm">Audio Enabled</label>
              <input type="checkbox" checked={audioEnabled} readOnly className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">Notifications Enabled</label>
              <input type="checkbox" checked={notificationsEnabled} readOnly className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">Expert Model</label>
              <select value={expertModelSelection} disabled className="text-sm">
                <option>gpt-4</option>
                <option>gpt-4-turbo</option>
                <option>gpt-3.5-turbo</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Keyboard Shortcuts</h3>
          <ShortcutSettings />
        </div>
      </div>
    </div>
  );
}
