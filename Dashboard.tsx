import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Card from '../components/common/Card'
import StatCard from '../components/common/StatCard'
import StatusBadge from '../components/common/StatusBadge'
import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { alertAPI } from '../services/api'

export default function Dashboard() {
  const { devices } = useStore()
  const [statusDistribution, setStatusDistribution] = useState([
    { name: 'Up', value: 0, color: '#10b981' },
    { name: 'Warning', value: 0, color: '#f59e0b' },
    { name: 'Down', value: 0, color: '#ef4444' },
  ])
  const [stats, setStats] = useState({
    availability: 0,
    upCount: 0,
    avgLatency: 0,
    packetLoss: 0,
  })
  const [latencyData, setLatencyData] = useState<any[]>([])
  const [packetLossData, setPacketLossData] = useState<any[]>([])
  const [recentAlerts, setRecentAlerts] = useState<any[]>([])

  useEffect(() => {
    fetchAlerts()
  }, [])

  useEffect(() => {
    if (devices && devices.length > 0) {
      calculateStats()
    }
  }, [devices])

  const fetchAlerts = async () => {
    try {
      const response = await alertAPI.getAll(undefined, 5)
      const rawData = response.data?.data || response.data || []
      const formatted = (Array.isArray(rawData) ? rawData : []).map((a: any) => ({
        id: a.id,
        device: a.device?.name || a.device_name || 'Unknown',
        message: a.title || a.message || 'Alert',
        time: a.created_at ? new Date(a.created_at).toLocaleTimeString() : 'Unknown',
        severity: (a.severity || a.level || 'info').toLowerCase() as any,
      }))
      setRecentAlerts(formatted.slice(0, 5))
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    }
  }

  const calculateStats = () => {
    const totalDevices = devices.length
    const upCount = devices.filter(d => d.status === 'up').length
    const downCount = devices.filter(d => d.status === 'down').length
    const availability = totalDevices > 0 ? ((upCount / totalDevices) * 100).toFixed(1) : 0

    const validLatencies = devices
      .filter(d => d.latency_ms !== undefined && d.latency_ms !== null)
      .map(d => d.latency_ms as number)
    const avgLatency = validLatencies.length > 0
      ? (validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length).toFixed(2)
      : 0

    const validPacketLoss = devices
      .filter(d => d.packet_loss_percent !== undefined && d.packet_loss_percent !== null)
      .map(d => d.packet_loss_percent as number)
    const avgPacketLoss = validPacketLoss.length > 0
      ? (validPacketLoss.reduce((a, b) => a + b, 0) / validPacketLoss.length).toFixed(2)
      : 0

    setStats({
      availability: parseFloat(availability as string),
      upCount,
      avgLatency: parseFloat(avgLatency as string),
      packetLoss: parseFloat(avgPacketLoss as string),
    })

    setStatusDistribution([
      { name: 'Up', value: upCount, color: '#10b981' },
      { name: 'Warning', value: Math.max(0, totalDevices - upCount - downCount), color: '#f59e0b' },
      { name: 'Down', value: downCount, color: '#ef4444' },
    ])

    generateChartData()
  }

  const generateChartData = () => {
    const now = new Date()
    const latencyChart = Array.from({ length: 7 }, (_, i) => {
      const hour = ((now.getHours() - (6 - i)) + 24) % 24
      const latencies = devices
        .filter(d => d.latency_ms !== undefined && d.latency_ms !== null)
        .map(d => d.latency_ms as number)
      const avg = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0
      return {
        time: `${hour}h`,
        latency: parseFloat(avg.toFixed(1)),
      }
    })
    setLatencyData(latencyChart)

    const packetChart = Array.from({ length: 7 }, (_, i) => {
      const hour = ((now.getHours() - (6 - i)) + 24) % 24
      const losses = devices
        .filter(d => d.packet_loss_percent !== undefined && d.packet_loss_percent !== null)
        .map(d => d.packet_loss_percent as number)
      const avg = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0
      return {
        time: `${hour}h`,
        loss: parseFloat(avg.toFixed(2)),
      }
    })
    setPacketLossData(packetChart)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400">System overview and network status</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Overall Status" value={stats.availability.toFixed(1)} unit="%" />
        <StatCard label="Devices Up" value={stats.upCount} unit={`/${devices.length}`} change={0} trend="stable" />
        <StatCard label="Avg Latency" value={stats.avgLatency.toFixed(2)} unit="ms" change={0} trend="stable" />
        <StatCard label="Packet Loss" value={stats.packetLoss.toFixed(2)} unit="%" change={0} trend="stable" />
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Device Status" className="lg:col-span-1">
          <div className="space-y-3">
            {statusDistribution.map((status) => (
              <div key={status.name} className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">{status.name}</span>
                <span className="font-bold text-lg">{status.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Network Status" className="lg:col-span-1">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Internet</span>
              <StatusBadge status="up" label="Connected" size="sm" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Download</span>
              <span className="font-bold">950 Mbps</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Upload</span>
              <span className="font-bold">450 Mbps</span>
            </div>
          </div>
        </Card>

        <Card title="Status Distribution" className="lg:col-span-1">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Average Latency (ms)" noPadding>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={latencyData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="latency" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Packet Loss (%)" noPadding>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={packetLossData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="loss" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Alerts */}
      <Card title="Recent Alerts" subtitle="Last activities on your network">
        <div className="space-y-3">
          {recentAlerts.length === 0 ? (
            <div className="text-center py-6 text-slate-600 dark:text-slate-400">
              No alerts at this time
            </div>
          ) : (
            recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    alert.severity === 'up' ? 'bg-success-500' :
                    alert.severity === 'warning' ? 'bg-warning-500' :
                    'bg-danger-500'
                  }`}></div>
                  <div>
                    <p className="font-medium">{alert.device}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{alert.message}</p>
                  </div>
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">{alert.time}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
