import Card from '../components/common/Card'
import { Download, FileText } from 'lucide-react'

export default function Reports() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-slate-600 dark:text-slate-400">Generate and manage network reports</p>
      </div>

      {/* Report Generator */}
      <Card title="Generate Report">
        <div className="space-y-4">
          <div>
            <label htmlFor="report-type" className="block text-sm font-medium mb-2">Report Type</label>
            <select id="report-type" className="input" title="Select report type">
              <option>Daily Report</option>
              <option>Weekly Report</option>
              <option>Monthly Report</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Period</label>
            <div className="flex gap-2">
              <input type="date" className="input" title="Start date for report" />
              <span className="self-center">to</span>
              <input type="date" className="input" title="End date for report" />
            </div>
          </div>

          <div>
            <label htmlFor="export-format" className="block text-sm font-medium mb-2">Export Format</label>
            <select id="export-format" className="input" title="Select export format">
              <option>PDF</option>
              <option>Excel</option>
              <option>CSV</option>
            </select>
          </div>

          <button className="btn btn-primary w-full">
            <Download className="w-4 h-4" />
            Generate Report
          </button>
        </div>
      </Card>

      {/* Recent Reports */}
      <Card title="Recent Reports">
        <div className="space-y-2">
          {[
            { date: '2025-12-16', type: 'Daily', format: 'PDF', downloads: 1 },
            { date: '2025-12-15', type: 'Daily', format: 'PDF', downloads: 3 },
            { date: '2025-12-10', type: 'Weekly', format: 'Excel', downloads: 5 },
            { date: '2025-12-01', type: 'Monthly', format: 'PDF', downloads: 2 },
          ].map((report, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium">{report.type} Report - {report.date}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{report.format} • {report.downloads} downloads</p>
                </div>
              </div>
              <button className="btn btn-secondary text-sm" title="Download report">
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
