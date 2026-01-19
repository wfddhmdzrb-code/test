import Card from '../components/common/Card'

export default function Settings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-slate-600 dark:text-slate-400">Configure system settings and preferences</p>
      </div>

      {/* Monitoring Settings */}
      <Card title="Monitoring Configuration">
        <div className="space-y-4">
          <div>
            <label htmlFor="check-interval" className="block text-sm font-medium mb-2">Check Interval (seconds)</label>
            <input id="check-interval" type="number" className="input" defaultValue="30" title="Check Interval in seconds" />
          </div>

          <div>
            <label htmlFor="ping-timeout" className="block text-sm font-medium mb-2">Ping Timeout (seconds)</label>
            <input id="ping-timeout" type="number" className="input" defaultValue="2" title="Ping Timeout in seconds" />
          </div>

          <div>
            <label htmlFor="latency-warning" className="block text-sm font-medium mb-2">Latency Warning (ms)</label>
            <input id="latency-warning" type="number" className="input" defaultValue="100" title="Latency Warning in milliseconds" />
          </div>

          <div>
            <label htmlFor="latency-critical" className="block text-sm font-medium mb-2">Latency Critical (ms)</label>
            <input id="latency-critical" type="number" className="input" defaultValue="500" title="Latency Critical in milliseconds" />
          </div>

          <button className="btn btn-primary" title="Save monitoring configuration changes">Save Changes</button>
        </div>
      </Card>

      {/* Alert Settings */}
      <Card title="Alert Settings">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="email-notif" className="font-medium">Email Notifications</label>
            <input id="email-notif" type="checkbox" className="w-4 h-4" defaultChecked title="Enable Email Notifications" />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="slack-notif" className="font-medium">Slack Notifications</label>
            <input id="slack-notif" type="checkbox" className="w-4 h-4" title="Enable Slack Notifications" />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="desktop-notif" className="font-medium">Desktop Notifications</label>
            <input id="desktop-notif" type="checkbox" className="w-4 h-4" defaultChecked title="Enable Desktop Notifications" />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
            <label htmlFor="quiet-hours" className="font-medium">Enable Quiet Hours</label>
            <input id="quiet-hours" type="checkbox" className="w-4 h-4" title="Enable Quiet Hours" />
          </div>

          <button className="btn btn-primary mt-4" title="Save alert notification preferences">Save Preferences</button>
        </div>
      </Card>

      {/* System Information */}
      <Card title="System Information">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Version</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Build</span>
            <span className="font-medium">Build 2025.12.16</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Last Updated</span>
            <span className="font-medium">2025-12-16</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
