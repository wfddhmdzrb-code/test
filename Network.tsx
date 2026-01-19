import Card from '../components/common/Card'
import StatusBadge from '../components/common/StatusBadge'
import { Wifi, Activity, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'
import { deviceAPI } from '../services/api'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './Network.css'

export default function Network() {
  const [isLive, setIsLive] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  // تم إزالة loadingDetails غير المستخدم
  const [, setLoadingDetails] = useState(false)

  const [latencyHistory, setLatencyHistory] = useState<any[]>([])
  const [packetLossHistory, setPacketLossHistory] = useState<any[]>([])
  
  const [networkStats, setNetworkStats] = useState({
    avgLatency: 0,
    avgPacketLoss: 0,
    upDevices: 0,
  })

  const [liveNetworkData, setLiveNetworkData] = useState({
    bandwidth: { download: 0, upload: 0 },
    jitter: 0,
    dns: 0,
    segments: [
        { name: 'Core Network', status: 'up', devices: 0, latency: 0 },
        { name: 'Building A', status: 'up', devices: 0, latency: 0 },
    ]
  })

  const refreshLiveStats = async () => {
    if (!isLive) return;

    setLoadingDetails(true)
    try {
      const token = localStorage.getItem('access_token')
      
      // تحديث حالة الأجهزة
      await fetch('http://127.0.0.1:5000/api/devices/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      // جلب بيانات الشبكة التفصيلية
      const statusRes = await fetch('http://127.0.0.1:5000/api/network/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const statusData = await statusRes.json()
      if (statusData.success) {
        setLiveNetworkData(statusData.data)
      }

      // جلب بيانات الأجهزة للحسابات
      const devicesRes = await deviceAPI.getAll()
      const rawData = devicesRes.data?.data || devicesRes.data || []
      updateStatsAndCharts(rawData)
      
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to refresh live stats:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  const updateStatsAndCharts = (devicesData: any[]) => {
    const validLatencies = devicesData
      .filter((d: any) => d.latency_ms !== undefined && d.latency_ms !== null)
      .map((d: any) => d.latency_ms as number)
    
    const currentAvgLatency = validLatencies.length > 0
      ? validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length
      : 0

    const validPacketLoss = devicesData
      .filter((d: any) => d.packet_loss_percent !== undefined && d.packet_loss_percent !== null)
      .map((d: any) => d.packet_loss_percent as number)
    
    const currentAvgPacketLoss = validPacketLoss.length > 0
      ? validPacketLoss.reduce((a, b) => a + b, 0) / validPacketLoss.length
      : 0

    setNetworkStats({
      avgLatency: parseFloat(currentAvgLatency.toFixed(2)),
      avgPacketLoss: parseFloat(currentAvgPacketLoss.toFixed(2)),
      upDevices: devicesData.filter((d: any) => d.status === 'up').length,
    })

    const timeLabel = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" })
    
    setLatencyHistory(prev => {
      const newData = [...prev, { time: timeLabel, latency: currentAvgLatency }]
      if (newData.length > 10) newData.shift()
      return newData
    })

    setPacketLossHistory(prev => {
      const newData = [...prev, { time: timeLabel, loss: currentAvgPacketLoss }]
      if (newData.length > 10) newData.shift()
      return newData
    })
  }

  useEffect(() => {
    refreshLiveStats()
  }, [])

  useEffect(() => {
    if (!isLive) return
    const interval = setInterval(() => {
      refreshLiveStats()
    }, 5000)
    return () => clearInterval(interval)
  }, [isLive])

  // حساب نسبة Bandwidth للعرض الديناميكي دون Inline Style
  const bandwidthPercentage = Math.min((liveNetworkData.bandwidth.download / 1000) * 100, 100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Network</h1>
            {isLive && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-semibold animate-pulse border border-red-200">
                <Zap className="w-3 h-3" />
                LIVE
              </div>
            )}
          </div>
          <p className="text-slate-600 dark:text-slate-400">Overall network status and performance</p>
        </div>
        
        <button 
          onClick={() => setIsLive(!isLive)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isLive 
              ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          {isLive ? 'إيقاف التحديث' : 'تفعيل التحديث الحي'}
        </button>
      </div>

      {/* Internet Connection */}
      <Card title="Internet Connection">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wifi className="w-6 h-6 text-blue-500" />
              <div>
                <p className="font-semibold">Connection Status</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Primary ISP</p>
              </div>
            </div>
            <StatusBadge status="up" label="Connected" />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Download Speed</p>
              <p className="text-2xl font-bold mt-1">{liveNetworkData.bandwidth.download.toFixed(0)} Mbps</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Upload Speed</p>
              <p className="text-2xl font-bold mt-1">{liveNetworkData.bandwidth.upload.toFixed(0)} Mbps</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Ping to Gateway</p>
              <p className="text-2xl font-bold mt-1">15 ms</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Avg Network Latency</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{networkStats.avgLatency} ms</p>
            </div>
          </div>
          {lastUpdated && (
            <p className="text-xs text-slate-400 mt-2 text-center">
              آخر تحديث: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
      </Card>

      {/* Network Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Bandwidth Usage">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Current Usage</span>
                <span className="text-sm font-bold">{liveNetworkData.bandwidth.download.toFixed(0)} Mbps / 1000 Mbps</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                {/* تم تعديل التنسيق المباشر إلى صنف Tailwind ديناميكي */}
                <div className={`bg-blue-500 h-2 rounded-full transition-all duration-500 w-[${bandwidthPercentage}%] bandwidth-usage-bar`}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Peak Usage (Today)</span>
                <span className="text-sm font-bold">850 Mbps</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div className="bg-warning-500 h-2 rounded-full bandwidth-peak-bar"></div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Network Quality">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Packet Loss</span>
              <span className={`font-bold ${networkStats.avgPacketLoss > 1 ? 'text-danger-500' : networkStats.avgPacketLoss > 0.5 ? 'text-warning-500' : 'text-success-500'}`}>
                {networkStats.avgPacketLoss}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Jitter</span>
              <span className={`font-bold ${liveNetworkData.jitter > 20 ? 'text-danger-500' : 'text-success-500'}`}>
                {liveNetworkData.jitter.toFixed(1)} ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">DNS Response</span>
              <span className="font-bold">{liveNetworkData.dns.toFixed(0)} ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Overall Quality</span>
              <StatusBadge 
                status={liveNetworkData.jitter > 30 ? 'down' : networkStats.avgPacketLoss > 1 ? 'warning' : 'up'} 
                label={liveNetworkData.jitter > 30 ? 'Poor' : networkStats.avgPacketLoss > 1 ? 'Good' : 'Excellent'} 
                size="sm" 
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Live Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Average Latency (Live)" noPadding>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={latencyHistory} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="latency" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          {latencyHistory.length === 0 && <div className="text-center py-10 text-slate-400">Waiting for live data...</div>}
        </Card>

        <Card title="Packet Loss (Live)" noPadding>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={packetLossHistory} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="loss" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
          {packetLossHistory.length === 0 && <div className="text-center py-10 text-slate-400">Waiting for live data...</div>}
        </Card>
      </div>

      {/* Network Segments */}
      <Card title="Network Segments">
        <div className="space-y-3">
          {liveNetworkData.segments.length === 0 ? (
             <div className="text-center py-4 text-slate-500">No segments detected</div>
          ) : (
            liveNetworkData.segments.map(segment => (
              <div key={segment.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div>
                  <p className="font-medium">{segment.name}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{segment.devices} devices</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Latency</p>
                    <p className="font-bold">{segment.latency}ms</p>
                  </div>
                  <StatusBadge status={segment.status as any} label="" size="sm" />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}