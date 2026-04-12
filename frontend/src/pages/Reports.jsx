import React, { useState, useEffect } from 'react';
import { api, getActivityLabel } from '../utils/api';
import { BarChart3, Calendar, Download, ChevronDown, ChevronUp } from 'lucide-react';

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [expandedZone, setExpandedZone] = useState(null);
  const [zoneDetails, setZoneDetails] = useState({});

  useEffect(() => {
    loadSummary();
  }, [selectedDate]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await api.getDailySummary(selectedDate);
      setSummary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadZoneDetails = async (zone) => {
    if (expandedZone === zone) {
      setExpandedZone(null);
      return;
    }
    try {
      const data = await api.getZoneReport(zone, {
        date_from: selectedDate,
        date_to: selectedDate,
      });
      setZoneDetails(prev => ({ ...prev, [zone]: data }));
      setExpandedZone(zone);
    } catch (err) {
      console.error(err);
    }
  };

  const exportReport = () => {
    if (!summary) return;
    let csv = 'Zone,Total Reports,Engineers,Media Files,Activity Breakdown\n';
    summary.zones.forEach(z => {
      const breakdown = Object.entries(z.activity_breakdown)
        .map(([k, v]) => `${getActivityLabel(k)}: ${v}`)
        .join('; ');
      csv += `"${z.zone}",${z.total_reports},${z.engineer_count},${z.media_count},"${breakdown}"\n`;
    });
    csv += `\nGrand Total,${summary.grand_total},,\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MCD_Daily_Report_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 size={28} className="text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Daily Summary Report</h2>
            <p className="text-gray-500 text-sm">Zone-wise summary of unauthorized construction reports</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <button onClick={exportReport}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading summary...</div>
      ) : summary ? (
        <>
          {/* Grand Total Card */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-blue-200 text-sm">Date</p>
                <p className="text-2xl font-bold">{new Date(summary.date).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
              </div>
              <div className="text-center">
                <p className="text-blue-200 text-sm">Total Reports</p>
                <p className="text-4xl font-bold">{summary.grand_total}</p>
              </div>
              <div className="text-center">
                <p className="text-blue-200 text-sm">Active Zones</p>
                <p className="text-4xl font-bold">{summary.zones.length}</p>
              </div>
            </div>
          </div>

          {/* Zone-wise Details */}
          {summary.zones.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-200">
              No reports found for this date.
            </div>
          ) : (
            <div className="space-y-3">
              {summary.zones.map(zone => (
                <div key={zone.zone} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => loadZoneDetails(zone.zone)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <span className="text-blue-700 font-bold text-lg">{zone.total_reports}</span>
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-800">{zone.zone}</h3>
                        <p className="text-xs text-gray-500">
                          {zone.engineer_count} engineer(s) • {zone.media_count} media files
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden md:flex gap-2 flex-wrap justify-end">
                        {Object.entries(zone.activity_breakdown).map(([key, val]) => (
                          <span key={key} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            {getActivityLabel(key)}: {val}
                          </span>
                        ))}
                      </div>
                      {expandedZone === zone.zone ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </div>
                  </button>

                  {expandedZone === zone.zone && zoneDetails[zone.zone] && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {Object.entries(zoneDetails[zone.zone].activity_summary || {}).map(([key, val]) => (
                          <div key={key} className="bg-white p-3 rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-500">{getActivityLabel(key)}</p>
                            <p className="text-xl font-bold text-gray-800">{val}</p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {(zoneDetails[zone.zone].reports || []).map(r => (
                          <div key={r.id} className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-700">#{r.id} - {r.property_address?.substring(0, 50)}</p>
                              <p className="text-xs text-gray-500">{getActivityLabel(r.activity_type)} • Owner: {r.owner_name || 'N/A'}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              r.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>{r.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
