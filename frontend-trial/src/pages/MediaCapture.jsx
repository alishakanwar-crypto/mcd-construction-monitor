import React, { useState, useEffect, useRef } from 'react';
import { api, getMediaUrl, getActivityLabel } from '../utils/api';
import { Camera, Video, Upload, MapPin, Clock, Image, CheckCircle, AlertCircle, X, Edit3, Save, ChevronDown, ChevronUp } from 'lucide-react';

const MCD_ZONES = [
  "Central Zone", "City-SP Zone", "Civil Lines", "Karol Bagh",
  "Keshav Puram", "Najafgarh Zone", "Narela", "North Shahdara Zone",
  "Rohini", "South Shahdara Zone", "South Zone", "West Zone"
];

const ACTIVITY_TYPES = [
  { value: "unauthorized_construction", label: "Unauthorized Construction" },
  { value: "unauthorized_urbanisation", label: "Unauthorized Urbanisation" },
  { value: "construction_on_govt_land", label: "Construction on Govt Land" },
  { value: "deviation_from_sanctioned_plan", label: "Deviation from Sanctioned Plan" },
  { value: "encroachment", label: "Encroachment" },
  { value: "other", label: "Other" },
];

export default function MediaCapture() {
  const [captures, setCaptures] = useState([]); // Today's captures grouped by report
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [editingReport, setEditingReport] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [expandedReport, setExpandedReport] = useState(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    // Get GPS location
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, maximumAge: 30000 }
      );
    }
    // Load today's captures
    loadTodayCaptures();
  }, []);

  const loadTodayCaptures = async () => {
    try {
      const reports = await api.getReports({ per_page: 50 });
      // Load media for each report
      const capturesWithMedia = await Promise.all(
        reports.map(async (r) => {
          try {
            const media = await api.getReportMedia(r.id);
            return { ...r, mediaList: media };
          } catch {
            return { ...r, mediaList: [] };
          }
        })
      );
      setCaptures(capturesWithMedia.filter(c => c.mediaList.length > 0 || c.media_count > 0));
    } catch {}
  };

  const handleQuickCapture = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    setUploading(true);
    setError('');
    setSuccess('');
    let uploaded = 0;
    let lastResult = null;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        if (location.lat) formData.append('latitude', location.lat);
        if (location.lng) formData.append('longitude', location.lng);
        formData.append('capture_time', new Date().toISOString());
        lastResult = await api.quickCapture(formData);
        uploaded++;
      } catch (err) {
        setError(`Failed to upload ${file.name}: ${err.message}`);
      }
    }

    if (uploaded > 0) {
      if (lastResult?.report_created) {
        setSuccess(`${uploaded} file(s) captured! New report #${lastResult.report_id} created automatically with GPS location & zone.`);
      } else {
        setSuccess(`${uploaded} file(s) added to existing report #${lastResult?.report_id} (same location detected).`);
      }
      loadTodayCaptures();
      // Auto-expand the report that was just created/updated
      if (lastResult?.report_id) {
        setExpandedReport(lastResult.report_id);
      }
    }
    setUploading(false);
    // Reset file inputs
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleDeleteMedia = async (mediaId, reportId) => {
    if (!confirm('Delete this media?')) return;
    try {
      await api.deleteMedia(mediaId);
      loadTodayCaptures();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEditing = (report) => {
    setEditingReport(report.id);
    setEditForm({
      property_address: report.property_address || '',
      zone: report.zone || '',
      ward: report.ward || '',
      visit_date: report.visit_date ? report.visit_date.slice(0, 16) : '',
      activity_type: report.activity_type || 'unauthorized_construction',
      activity_description: report.activity_description || '',
      owner_name: report.owner_name || '',
      owner_contact: report.owner_contact || '',
      ownership_type: report.ownership_type || '',
      last_sanctioned_plan: report.last_sanctioned_plan || '',
      latitude: report.latitude,
      longitude: report.longitude,
      remarks: report.remarks || '',
    });
  };

  const saveEditing = async (reportId) => {
    try {
      await api.updateReport(reportId, {
        ...editForm,
        visit_date: editForm.visit_date ? new Date(editForm.visit_date).toISOString() : new Date().toISOString(),
      });
      setEditingReport(null);
      setSuccess('Report details updated successfully!');
      loadTodayCaptures();
    } catch (err) {
      setError(`Failed to update: ${err.message}`);
    }
  };

  const clearMessages = () => {
    setTimeout(() => { setSuccess(''); setError(''); }, 5000);
  };

  useEffect(() => {
    if (success || error) clearMessages();
  }, [success, error]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Camera size={28} className="text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Quick Capture</h2>
          <p className="text-gray-500 text-sm">Capture photos/videos — report auto-created from GPS</p>
        </div>
      </div>

      {/* Status Messages */}
      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4 flex items-center gap-2 border border-green-200">
          <CheckCircle size={20} /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 flex items-center gap-2 border border-red-200">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* GPS Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        {location.lat ? (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <MapPin size={16} />
            <span className="font-medium">GPS Active:</span> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-orange-500 text-sm">
            <MapPin size={16} />
            <span className="font-medium">GPS Locating...</span> Please allow location access
          </div>
        )}
      </div>

      {/* Capture Buttons - Always visible, no report selection needed */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold text-gray-700 mb-2">Capture / Upload Media</h3>
        <p className="text-xs text-gray-400 mb-4">Just tap to capture — zone, address & report details are filled automatically from your GPS location</p>
        <div className="space-y-4">
          {/* TAKE PHOTO */}
          <label className="flex items-center gap-4 p-5 bg-blue-50 border-2 border-blue-400 rounded-xl cursor-pointer active:bg-blue-100">
            <div className="bg-blue-500 text-white rounded-full p-4 flex-shrink-0">
              <Camera size={28} />
            </div>
            <div className="flex-1">
              <span className="text-lg font-bold text-blue-700 block">📷 Take Photo</span>
              <span className="text-sm text-blue-500">Opens your phone camera</span>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleQuickCapture}
              className="hidden"
              disabled={uploading}
            />
          </label>

          {/* UPLOAD FROM GALLERY */}
          <label className="flex items-center gap-4 p-5 bg-green-50 border-2 border-green-400 rounded-xl cursor-pointer active:bg-green-100">
            <div className="bg-green-500 text-white rounded-full p-4 flex-shrink-0">
              <Upload size={28} />
            </div>
            <div className="flex-1">
              <span className="text-lg font-bold text-green-700 block">📁 Upload from Gallery</span>
              <span className="text-sm text-green-500">Choose images or videos</span>
            </div>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleQuickCapture}
              className="hidden"
              disabled={uploading}
            />
          </label>

          {/* RECORD VIDEO */}
          <label className="flex items-center gap-4 p-5 bg-purple-50 border-2 border-purple-400 rounded-xl cursor-pointer active:bg-purple-100">
            <div className="bg-purple-500 text-white rounded-full p-4 flex-shrink-0">
              <Video size={28} />
            </div>
            <div className="flex-1">
              <span className="text-lg font-bold text-purple-700 block">🎥 Record Video</span>
              <span className="text-sm text-purple-500">Opens your phone camera for video</span>
            </div>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              onChange={handleQuickCapture}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {uploading && (
          <div className="mt-4 text-center text-blue-600 text-sm">
            <div className="animate-spin inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2" />
            Uploading & creating report...
          </div>
        )}
      </div>

      {/* Today's Captures - Grouped by Report/Location */}
      {captures.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700 text-lg">
            <Image size={20} className="inline mr-2" />
            Recent Captures ({captures.length} reports)
          </h3>
          
          {captures.map(report => {
            const isExpanded = expandedReport === report.id;
            const isEditing = editingReport === report.id;
            
            return (
              <div key={report.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Report Header - clickable to expand */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                  onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        #{report.id}
                      </span>
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        {report.zone}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {report.mediaList?.length || report.media_count} media
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-1">
                      {report.property_address?.substring(0, 80) || 'Address pending'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {getActivityLabel(report.activity_type)} • {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditing(report); setExpandedReport(report.id); }}
                        className="p-2 text-gray-400 hover:text-blue-500"
                        title="Edit report details"
                      >
                        <Edit3 size={16} />
                      </button>
                    )}
                    {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {/* Editable Report Details */}
                    {isEditing ? (
                      <div className="p-4 bg-blue-50 space-y-3">
                        <h4 className="font-medium text-blue-700 text-sm">Edit Report Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Address</label>
                            <input
                              type="text"
                              value={editForm.property_address}
                              onChange={(e) => setEditForm({...editForm, property_address: e.target.value})}
                              className="w-full px-3 py-2 text-sm border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Zone</label>
                            <select
                              value={editForm.zone}
                              onChange={(e) => setEditForm({...editForm, zone: e.target.value})}
                              className="w-full px-3 py-2 text-sm border rounded-lg"
                            >
                              {MCD_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Activity Type</label>
                            <select
                              value={editForm.activity_type}
                              onChange={(e) => setEditForm({...editForm, activity_type: e.target.value})}
                              className="w-full px-3 py-2 text-sm border rounded-lg"
                            >
                              {ACTIVITY_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Ward</label>
                            <input
                              type="text"
                              value={editForm.ward}
                              onChange={(e) => setEditForm({...editForm, ward: e.target.value})}
                              className="w-full px-3 py-2 text-sm border rounded-lg"
                              placeholder="Enter ward name"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Owner Name</label>
                            <input
                              type="text"
                              value={editForm.owner_name}
                              onChange={(e) => setEditForm({...editForm, owner_name: e.target.value})}
                              className="w-full px-3 py-2 text-sm border rounded-lg"
                              placeholder="Enter owner name"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Owner Contact</label>
                            <input
                              type="text"
                              value={editForm.owner_contact}
                              onChange={(e) => setEditForm({...editForm, owner_contact: e.target.value})}
                              className="w-full px-3 py-2 text-sm border rounded-lg"
                              placeholder="Enter contact number"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Description</label>
                            <input
                              type="text"
                              value={editForm.activity_description}
                              onChange={(e) => setEditForm({...editForm, activity_description: e.target.value})}
                              className="w-full px-3 py-2 text-sm border rounded-lg"
                              placeholder="Describe the activity"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Remarks</label>
                            <input
                              type="text"
                              value={editForm.remarks}
                              onChange={(e) => setEditForm({...editForm, remarks: e.target.value})}
                              className="w-full px-3 py-2 text-sm border rounded-lg"
                              placeholder="Any remarks"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => saveEditing(report.id)}
                            className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                          >
                            <Save size={14} /> Save Changes
                          </button>
                          <button
                            onClick={() => setEditingReport(null)}
                            className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 text-xs text-gray-500 grid grid-cols-2 md:grid-cols-3 gap-2">
                        <div><span className="font-medium">Zone:</span> {report.zone}</div>
                        <div><span className="font-medium">Type:</span> {getActivityLabel(report.activity_type)}</div>
                        <div><span className="font-medium">Status:</span> {report.status}</div>
                        {report.latitude && (
                          <div><span className="font-medium">GPS:</span> {report.latitude.toFixed(4)}, {report.longitude?.toFixed(4)}</div>
                        )}
                        {report.owner_name && (
                          <div><span className="font-medium">Owner:</span> {report.owner_name}</div>
                        )}
                        <div>
                          <button
                            onClick={(e) => { e.stopPropagation(); startEditing(report); }}
                            className="text-blue-500 hover:underline"
                          >
                            Edit details →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Media Gallery */}
                    <div className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {(report.mediaList || []).map(m => (
                          <div key={m.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                            {m.media_type === 'image' ? (
                              <img src={getMediaUrl(m.file_path)} alt={m.file_name} className="w-full h-28 object-cover" />
                            ) : (
                              <div className="w-full h-28 bg-gray-800 flex items-center justify-center">
                                <Video size={28} className="text-white" />
                              </div>
                            )}
                            <div className="p-2 bg-gray-50 text-xs">
                              <p className="text-gray-600 truncate">{m.file_name}</p>
                              <div className="flex items-center gap-1 text-gray-400 mt-1">
                                <Clock size={10} />
                                {m.capture_time ? new Date(m.capture_time).toLocaleString() : 'N/A'}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteMedia(m.id, report.id)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
