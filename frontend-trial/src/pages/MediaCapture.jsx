import React, { useState, useEffect, useRef } from 'react';
import { api, getMediaUrl } from '../utils/api';
import { Camera, Video, Upload, MapPin, Clock, Image, CheckCircle, AlertCircle, X } from 'lucide-react';

export default function MediaCapture() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState('');
  const [reportMedia, setReportMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [location, setLocation] = useState({ lat: null, lng: null });
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    loadReports();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    if (selectedReport) loadReportMedia(selectedReport);
  }, [selectedReport]);

  const loadReports = async () => {
    try {
      const data = await api.getReports({ per_page: 50 });
      setReports(data);
    } catch {}
  };

  const loadReportMedia = async (reportId) => {
    try {
      const data = await api.getReportMedia(reportId);
      setReportMedia(data);
    } catch {}
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files.length || !selectedReport) return;
    setUploading(true);
    setError('');
    setSuccess('');
    let uploaded = 0;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        if (location.lat) formData.append('latitude', location.lat);
        if (location.lng) formData.append('longitude', location.lng);
        formData.append('capture_time', new Date().toISOString());
        await api.uploadMedia(selectedReport, formData);
        uploaded++;
      } catch (err) {
        setError(`Failed to upload ${file.name}: ${err.message}`);
      }
    }

    if (uploaded > 0) {
      setSuccess(`${uploaded} file(s) uploaded successfully!`);
      loadReportMedia(selectedReport);
    }
    setUploading(false);
    // Reset file inputs
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleDeleteMedia = async (mediaId) => {
    if (!confirm('Delete this media?')) return;
    try {
      await api.deleteMedia(mediaId);
      loadReportMedia(selectedReport);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Camera size={28} className="text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Image & Video Capture</h2>
          <p className="text-gray-500 text-sm">Capture and upload evidence of unauthorized construction</p>
        </div>
      </div>

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

      {/* Select Report */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold text-gray-700 mb-3">Step 1: Select Report</h3>
        <select
          value={selectedReport}
          onChange={(e) => setSelectedReport(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
        >
          <option value="">-- Select a Report --</option>
          {reports.map(r => (
            <option key={r.id} value={r.id}>
              #{r.id} - {r.property_address?.substring(0, 60)} ({r.zone})
            </option>
          ))}
        </select>
        {location.lat && (
          <div className="flex items-center gap-2 text-xs text-green-600 mt-2">
            <MapPin size={14} />
            GPS Active: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </div>
        )}
      </div>

      {selectedReport && (
        <>
          {/* Capture Methods - Large mobile-friendly buttons */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="font-semibold text-gray-700 mb-4">Step 2: Capture / Upload Media</h3>
            <div className="space-y-4">
              {/* TAKE PHOTO - Opens native phone camera */}
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
                  onChange={handleFileUpload}
                  className="hidden"
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
                  onChange={handleFileUpload}
                  className="hidden"
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
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {uploading && (
              <div className="mt-4 text-center text-blue-600 text-sm">
                <div className="animate-spin inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2" />
                Uploading...
              </div>
            )}
          </div>

          {/* Media Gallery */}
          {reportMedia.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-700 mb-4">
                <Image size={18} className="inline mr-2" />
                Uploaded Media ({reportMedia.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {reportMedia.map(m => (
                  <div key={m.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                    {m.media_type === 'image' ? (
                      <img src={getMediaUrl(m.file_path)} alt={m.file_name} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 bg-gray-800 flex items-center justify-center">
                        <Video size={32} className="text-white" />
                      </div>
                    )}
                    <div className="p-2 bg-gray-50 text-xs">
                      <p className="text-gray-600 truncate">{m.file_name}</p>
                      <div className="flex items-center gap-1 text-gray-400 mt-1">
                        <Clock size={10} />
                        {m.capture_time ? new Date(m.capture_time).toLocaleString() : 'N/A'}
                      </div>
                      {m.latitude && (
                        <div className="flex items-center gap-1 text-gray-400">
                          <MapPin size={10} />
                          {m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteMedia(m.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
