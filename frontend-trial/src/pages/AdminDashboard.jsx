import React, { useState, useEffect } from 'react';
import { api, getActivityLabel, getRoleLabel, isAdmin } from '../utils/api';
import { LayoutDashboard, TrendingUp, Users, FileText, Image, MapPin, AlertTriangle, Trash2 } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [statsData, reports] = await Promise.all([
        api.getStats(),
        api.getReports({ per_page: 10 })
      ]);
      setStats(statsData);
      setRecentReports(reports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!confirm(`Are you sure you want to delete Report #${reportId}? This will also delete all associated media.`)) return;
    try {
      await api.deleteReport(reportId);
      loadDashboard();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <LayoutDashboard size={28} className="text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Admin Dashboard</h2>
          <p className="text-gray-500 text-sm">Overview of unauthorized construction monitoring</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.total_reports}</p>
                <p className="text-xs text-gray-500">Total Reports</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.today_reports}</p>
                <p className="text-xs text-gray-500">Today's Reports</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Image size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.total_media}</p>
                <p className="text-xs text-gray-500">Media Files</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stats.total_engineers}</p>
                <p className="text-xs text-gray-500">Engineers</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Breakdown + Zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {stats && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4">Report Status Breakdown</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                  <span className="text-sm text-gray-600">Pending</span>
                </div>
                <span className="font-bold text-gray-800">{stats.status_breakdown.pending}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-400 rounded-full h-2" style={{
                  width: `${stats.total_reports ? (stats.status_breakdown.pending / stats.total_reports * 100) : 0}%`
                }} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full" />
                  <span className="text-sm text-gray-600">Reviewed</span>
                </div>
                <span className="font-bold text-gray-800">{stats.status_breakdown.reviewed}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-400 rounded-full h-2" style={{
                  width: `${stats.total_reports ? (stats.status_breakdown.reviewed / stats.total_reports * 100) : 0}%`
                }} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full" />
                  <span className="text-sm text-gray-600">Action Taken</span>
                </div>
                <span className="font-bold text-gray-800">{stats.status_breakdown.action_taken}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-400 rounded-full h-2" style={{
                  width: `${stats.total_reports ? (stats.status_breakdown.action_taken / stats.total_reports * 100) : 0}%`
                }} />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
              <AlertTriangle size={24} className="text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Pending Review</p>
                <p className="text-2xl font-bold text-red-600">{stats?.status_breakdown.pending || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <MapPin size={24} className="text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Active Zones</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.total_zones || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reports Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700">Recent Reports</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">ID</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Address</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Zone</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Activity</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Engineer</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
                {isAdmin() && <th className="text-left px-4 py-3 text-gray-600 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentReports.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800 font-medium">#{r.id}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{r.property_address}</td>
                  <td className="px-4 py-3 text-gray-600">{r.zone}</td>
                  <td className="px-4 py-3 text-gray-600">{getActivityLabel(r.activity_type)}</td>
                  <td className="px-4 py-3 text-gray-600">{r.engineer_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      r.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.visit_date).toLocaleDateString()}</td>
                  {isAdmin() && (
                    <td className="px-4 py-3">
                      <button onClick={() => handleDeleteReport(r.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50" title="Delete Report">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {recentReports.length === 0 && (
                <tr><td colSpan={isAdmin() ? 8 : 7} className="text-center py-8 text-gray-400">No reports yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
