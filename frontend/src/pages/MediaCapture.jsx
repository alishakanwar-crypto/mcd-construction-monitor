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
  const [captureMode, setCaptureMode] = useState(null); // 'camera', 'video', 'upload'
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadReports();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
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

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setStream(mediaStream);
      setCaptureMode('camera');
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      }, 100);
    } catch (err) {
      setError('Camera access denied. Please allow camera access.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setCaptureMode(null);
  };

  const dataURLtoFile = (dataUrl, filename) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const uploadCapturedImage = async () => {
    if (!selectedReport || !capturedImage) return;
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const file = dataURLtoFile(capturedImage, `capture_${Date.now()}.jpg`);
      const formData = new FormData();
      formData.append('file', file);
      if (location.lat) formData.append('latitude', location.lat);
      if (location.lng) formData.append('longitude', location.lng);
      formData.append('capture_time', new Date().toISOString());
      await api.uploadMedia(selectedReport, formData);
      setSuccess('Image uploaded successfully!');
      setCapturedImage(null);
      loadReportMedia(selectedReport);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
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
    if (fileInputRef.current) fileInputRef.current.value = '';
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
          {/* Capture Methods */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="font-semibold text-gray-700 mb-4">Step 2: Capture / Upload Media</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={startCamera}
                className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-blue-300 rounded-xl hover:bg-blue-50 transition-colors"
              >
                <Camera size={32} className="text-blue-500" />
                <span className="text-sm font-medium text-gray-700">Take Photo</span>
                <span className="text-xs text-gray-400">Use device camera</span>
              </button>

              <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-green-300 rounded-xl hover:bg-green-50 transition-colors cursor-pointer">
                <Upload size={32} className="text-green-500" />
                <span className="text-sm font-medium text-gray-700">Upload Files</span>
                <span className="text-xs text-gray-400">Images & Videos</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-purple-300 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer">
                <Video size={32} className="text-purple-500" />
                <span className="text-sm font-medium text-gray-700">Record Video</span>
                <span className="text-xs text-gray-400">From gallery</span>
                <input
                  ref={fileInputRef}
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

          {/* Camera Preview */}
          {captureMode === 'camera' && (
            <div className="bg-black rounded-xl overflow-hidden mb-6">
              <video ref={videoRef} autoPlay playsInline className="w-full" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex items-center justify-center gap-4 p-4 bg-gray-900">
                <button onClick={capturePhoto}
                  className="bg-white text-gray-900 px-6 py-2 rounded-full font-medium hover:bg-gray-200">
                  📸 Capture
                </button>
                <button onClick={stopCamera}
                  className="bg-red-500 text-white px-6 py-2 rounded-full font-medium hover:bg-red-600">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Captured Image Preview */}
          {capturedImage && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">Captured Image Preview</h3>
              <img src={capturedImage} alt="Captured" className="w-full max-h-96 object-contain rounded-lg mb-4" />
              <div className="flex gap-3">
                <button onClick={uploadCapturedImage} disabled={uploading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </button>
                <button onClick={() => setCapturedImage(null)}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-300">
                  Discard
                </button>
              </div>
            </div>
          )}

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
