import { Alert, Card, Badge, Button } from '@repo/ui';
import { useLocalStorage } from '@repo/hooks';
import { useState } from 'react';

export function Settings() {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
  const [notifications, setNotifications] = useLocalStorage('notifications', true);
  const [showAlert, setShowAlert] = useState(true);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-6">Settings</h1>

      {showAlert && (
        <Alert variant="info" onClose={() => setShowAlert(false)}>
          Your settings are saved automatically using localStorage
        </Alert>
      )}

      <div className="mt-6 space-y-6">
        <Card>
          <h2 className="text-2xl font-semibold mb-4">Appearance</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Theme <Badge variant={theme === 'dark' ? 'secondary' : 'primary'}>{theme}</Badge>
              </label>
              <div className="flex gap-2">
                <Button
                  onClick={() => setTheme('light')}
                  variant={theme === 'light' ? 'primary' : 'secondary'}
                >
                  Light
                </Button>
                <Button
                  onClick={() => setTheme('dark')}
                  variant={theme === 'dark' ? 'primary' : 'secondary'}
                >
                  Dark
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold mb-4">Notifications</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Enable notifications</span>
            <Button
              onClick={() => setNotifications(!notifications)}
              variant={notifications ? 'success' : 'secondary'}
            >
              {notifications ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
