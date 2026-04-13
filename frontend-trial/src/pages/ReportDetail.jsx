import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getActivityLabel, getRoleLabel, getUser, getMediaUrl, isAdmin } from '../utils/api';
import { ArrowLeft, MapPin, Calendar, User, FileText, Image, Video, Clock, Trash2 } from 'lucide-react';

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = getUser();

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const [reportData, mediaData] = await Promise.all([
        api.getReport(id),
        api.getReportMedia(id)
      ]);
      setReport(reportData);
      setMedia(mediaData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      await api.updateReportStatus(id, status);
      loadReport();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteReport = async () => {
    if (!confirm(`Are you sure you want to delete Report #${id}? This will also delete all associated media.`)) return;
    try {
      await api.deleteReport(id);
      navigate('/admin');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading report...</div>;
  }

  if (!report) {
    return <div className="text-center py-12 text-gray-500">Report not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 text-sm">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-blue-900 text-white p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold">Report #{report.id}</h2>
              <p className="text-blue-200 text-sm mt-1">{report.property_address}</p>
            </div>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${
              report.status === 'pending' ? 'bg-yellow-400 text-yellow-900' :
              report.status === 'reviewed' ? 'bg-blue-400 text-blue-900' :
              'bg-green-400 text-green-900'
            }`}>{report.status.toUpperCase()}</span>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">Location Details</h3>
            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="text-sm font-medium text-gray-800">{report.property_address}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Zone</p>
                <p className="font-medium text-gray-800">{report.zone}</p>
              </div>
              <div>
                <p className="text-gray-500">Ward</p>
                <p className="font-medium text-gray-800">{report.ward || 'N/A'}</p>
              </div>
            </div>
            {report.latitude && (
              <div className="bg-green-50 p-2 rounded-lg text-xs text-green-700 flex items-center gap-1">
                <MapPin size={12} /> GPS: {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">Activity Details</h3>
            <div className="text-sm">
              <p className="text-gray-500">Activity Type</p>
              <p className="font-medium text-gray-800">{getActivityLabel(report.activity_type)}</p>
            </div>
            {report.activity_description && (
              <div className="text-sm">
                <p className="text-gray-500">Description</p>
                <p className="text-gray-800">{report.activity_description}</p>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Calendar size={16} className="text-gray-400 mt-0.5" />
              <div className="text-sm">
                <p className="text-gray-500">Visit Date</p>
                <p className="font-medium text-gray-800">{new Date(report.visit_date).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">Ownership Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Owner Name</p>
                <p className="font-medium text-gray-800">{report.owner_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Contact</p>
                <p className="font-medium text-gray-800">{report.owner_contact || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Ownership Type</p>
                <p className="font-medium text-gray-800">{report.ownership_type || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">Sanctioned Plan & Engineer</h3>
            <div className="text-sm">
              <p className="text-gray-500">Last Sanctioned Plan</p>
              <p className="font-medium text-gray-800">{report.last_sanctioned_plan || 'N/A'}</p>
            </div>
            <div className="flex items-start gap-2">
              <User size={16} className="text-gray-400 mt-0.5" />
              <div className="text-sm">
                <p className="text-gray-500">Reported By</p>
                <p className="font-medium text-gray-800">{report.engineer_name} ({getRoleLabel(report.engineer_role)})</p>
              </div>
            </div>
            {report.remarks && (
              <div className="text-sm">
                <p className="text-gray-500">Remarks</p>
                <p className="text-gray-800">{report.remarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Actions */}
        {(currentUser?.role === 'admin' || currentUser?.role === 'executive_engineer') && (
          <div className="px-6 pb-6">
            <h3 className="font-semibold text-gray-700 mb-3">Update Status</h3>
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => handleStatusUpdate('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${report.status === 'pending' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}>
                Pending
              </button>
              <button onClick={() => handleStatusUpdate('reviewed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${report.status === 'reviewed' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                Mark Reviewed
              </button>
              <button onClick={() => handleStatusUpdate('action_taken')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${report.status === 'action_taken' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                Action Taken
              </button>
            </div>
          </div>
        )}

        {/* Delete Report - Admin Only */}
        {isAdmin() && (
          <div className="px-6 pb-6 border-t border-gray-100 pt-4">
            <button onClick={handleDeleteReport}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600">
              <Trash2 size={16} /> Delete Report
            </button>
          </div>
        )}
      </div>

      {/* Media Section */}
      {media.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
          <h3 className="font-semibold text-gray-700 mb-4">
            <Image size={18} className="inline mr-2" />
            Attached Media ({media.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {media.map(m => (
              <div key={m.id} className="rounded-lg overflow-hidden border border-gray-200">
                {m.media_type === 'image' ? (
                  <img src={getMediaUrl(m.file_path)} alt={m.file_name} className="w-full h-48 object-cover" />
                ) : (
                  <video src={getMediaUrl(m.file_path)} controls className="w-full h-48 object-cover" />
                )}
                <div className="p-2 bg-gray-50 text-xs">
                  <p className="text-gray-600 truncate">{m.file_name}</p>
                  <div className="flex items-center gap-1 text-gray-400 mt-1">
                    <Clock size={10} />
                    {m.capture_time ? new Date(m.capture_time).toLocaleString() : 'N/A'}
                  </div>
                  {m.latitude && (
                    <div className="flex items-center gap-1 text-gray-400">
                      <MapPin size={10} /> {m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
