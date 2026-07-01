// ============================================
// Settings Page - Application Settings
// ============================================

import { useState } from 'react';
import { 
  User, 
  Bell, 
  Shield, 
  Palette,
  Key,
  Smartphone,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';
import { Card, Button } from '../components/ui';
import { cn } from '../utils/helpers';

type SettingsSection = 'profile' | 'notifications' | 'security' | 'appearance' | 'api';

interface ToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

function Toggle({ enabled, onToggle }: ToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors',
        enabled ? 'bg-blue-600' : 'bg-gray-700'
      )}
    >
      <span
        className={cn(
          'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
          enabled ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

const sections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'api', label: 'API Keys', icon: Key },
] as const;

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    tradeConfirmations: true,
    marketNews: false,
    weeklyReport: true,
  });
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [twoFactor, setTwoFactor] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-gray-400 text-xs sm:text-sm mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Settings Navigation - Horizontal scroll on mobile */}
        <div className="lg:col-span-3">
          <Card>
            <div className="p-2 flex lg:block gap-1 overflow-x-auto lg:overflow-visible">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors lg:w-full',
                    activeSection === section.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  )}
                >
                  <section.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{section.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-9">
          {activeSection === 'profile' && (
            <Card>
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Profile Settings
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white">
                    JD
                  </div>
                  <div>
                    <Button variant="secondary" size="sm">Change Avatar</Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">First Name</label>
                    <input
                      type="text"
                      defaultValue="John"
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Last Name</label>
                    <input
                      type="text"
                      defaultValue="Doe"
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue="john.doe@example.com"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="pt-4">
                  <Button>Save Changes</Button>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'notifications' && (
            <Card>
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-500" />
                  Notification Preferences
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <div>
                    <p className="text-white font-medium">Price Alerts</p>
                    <p className="text-sm text-gray-400">Get notified when prices hit your targets</p>
                  </div>
                  <Toggle
                    enabled={notifications.priceAlerts}
                    onToggle={() => setNotifications(n => ({ ...n, priceAlerts: !n.priceAlerts }))}
                  />
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <div>
                    <p className="text-white font-medium">Trade Confirmations</p>
                    <p className="text-sm text-gray-400">Receive confirmation for completed trades</p>
                  </div>
                  <Toggle
                    enabled={notifications.tradeConfirmations}
                    onToggle={() => setNotifications(n => ({ ...n, tradeConfirmations: !n.tradeConfirmations }))}
                  />
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <div>
                    <p className="text-white font-medium">Market News</p>
                    <p className="text-sm text-gray-400">Stay updated with latest market news</p>
                  </div>
                  <Toggle
                    enabled={notifications.marketNews}
                    onToggle={() => setNotifications(n => ({ ...n, marketNews: !n.marketNews }))}
                  />
                </div>
                
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-white font-medium">Weekly Report</p>
                    <p className="text-sm text-gray-400">Get weekly portfolio performance summary</p>
                  </div>
                  <Toggle
                    enabled={notifications.weeklyReport}
                    onToggle={() => setNotifications(n => ({ ...n, weeklyReport: !n.weeklyReport }))}
                  />
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'security' && (
            <Card>
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  Security Settings
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between py-4 px-4 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-white font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-400">Add an extra layer of security</p>
                    </div>
                  </div>
                  <Toggle enabled={twoFactor} onToggle={() => setTwoFactor(!twoFactor)} />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Change Password</label>
                  <input
                    type="password"
                    placeholder="Current Password"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <Button>Update Password</Button>
              </div>
            </Card>
          )}

          {activeSection === 'appearance' && (
            <Card>
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-blue-500" />
                  Appearance
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-4">Theme</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setTheme('light')}
                      className={cn(
                        'flex-1 p-4 rounded-lg border-2 transition-colors flex flex-col items-center gap-2',
                        theme === 'light'
                          ? 'border-blue-500 bg-blue-600/10'
                          : 'border-gray-700 hover:border-gray-600'
                      )}
                    >
                      <Sun className="w-6 h-6 text-yellow-500" />
                      <span className="text-sm text-white font-medium">Light</span>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={cn(
                        'flex-1 p-4 rounded-lg border-2 transition-colors flex flex-col items-center gap-2',
                        theme === 'dark'
                          ? 'border-blue-500 bg-blue-600/10'
                          : 'border-gray-700 hover:border-gray-600'
                      )}
                    >
                      <Moon className="w-6 h-6 text-blue-400" />
                      <span className="text-sm text-white font-medium">Dark</span>
                    </button>
                    <button
                      onClick={() => setTheme('system')}
                      className={cn(
                        'flex-1 p-4 rounded-lg border-2 transition-colors flex flex-col items-center gap-2',
                        theme === 'system'
                          ? 'border-blue-500 bg-blue-600/10'
                          : 'border-gray-700 hover:border-gray-600'
                      )}
                    >
                      <Monitor className="w-6 h-6 text-gray-400" />
                      <span className="text-sm text-white font-medium">System</span>
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Language</label>
                  <select className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>English (US)</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                    <option>Japanese</option>
                  </select>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'api' && (
            <Card>
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-blue-500" />
                  API Keys
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="p-4 bg-yellow-600/10 border border-yellow-600/30 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    Keep your API keys secure. Never share them with anyone.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">API Key</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value="sk-****************************abcd"
                      readOnly
                      className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 font-mono text-sm"
                    />
                    <Button variant="secondary">Copy</Button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Secret Key</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value="sk-secret-************************"
                      readOnly
                      className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 font-mono text-sm"
                    />
                    <Button variant="secondary">Reveal</Button>
                  </div>
                </div>
                
                <div className="pt-4 flex gap-3">
                  <Button>Generate New Keys</Button>
                  <Button variant="ghost">Revoke All Keys</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
