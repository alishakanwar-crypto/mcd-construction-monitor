import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getUser, getActivityLabel, getMediaUrl } from '../utils/api';
import { FileText, MapPin, Calendar, Send, CheckCircle, AlertCircle, Camera, Upload, Loader, ImageIcon, X } from 'lucide-react';

const ZONES = ['North Zone', 'South Zone', 'East Zone', 'West Zone', 'Central Zone', 'New Delhi Zone', 'Shahdara North Zone', 'Shahdara South Zone', 'Narela Zone', 'Rohini Zone', 'Civil Lines Zone', 'Karol Bagh Zone'];
const ACTIVITY_TYPES = [
  { value: 'unauthorized_construction', label: 'Unauthorized Construction' },
  { value: 'unauthorized_urbanisation', label: 'Unauthorized Urbanisation' },
  { value: 'construction_on_govt_land', label: 'Construction on Govt Land' },
  { value: 'deviation_from_sanctioned_plan', label: 'Deviation from Sanctioned Plan' },
  { value: 'encroachment', label: 'Encroachment' },
  { value: 'other', label: 'Other' },
];
const OWNERSHIP_TYPES = ['Private', 'Government', 'Semi-Government', 'Trust', 'Society', 'Unknown'];

export default function DataEntry() {
  const user = getUser();
  const navigate = useNavigate();
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [recentReports, setRecentReports] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [autoFillStatus, setAutoFillStatus] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);

  const [form, setForm] = useState({
    property_address: '',
    zone: user?.zone || '',
    ward: '',
    visit_date: new Date().toISOString().slice(0, 16),
    activity_type: '',
    activity_description: '',
    owner_name: '',
    owner_contact: '',
    ownership_type: '',
    last_sanctioned_plan: '',
    sanctioned_plan_date: '',
    remarks: '',
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
    loadRecentReports();
  }, []);

  const loadRecentReports = async () => {
    try {
      const data = await api.getReports({ per_page: 5 });
      setRecentReports(data);
    } catch {}
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    setImageFile(file);
    setExtracting(true);
    setAutoFillStatus('Extracting data from image...');
    setError('');

    try {
      // Try to extract EXIF data via backend
      const formData = new FormData();
      formData.append('file', file);

      let extractedData = null;
      try {
        extractedData = await api.extractImageData(formData);
      } catch (err) {
        // If backend endpoint doesn't exist (production app), silently ignore
        console.log('Image extraction not available:', err.message);
      }

      if (extractedData) {
        const updates = {};

        // Auto-fill GPS from image EXIF
        if (extractedData.latitude && extractedData.longitude) {
          setLocation({ lat: extractedData.latitude, lng: extractedData.longitude });
          setAutoFillStatus('GPS extracted from image. Getting address...');
        } else if (location.lat && location.lng) {
          // Use device GPS and try reverse geocoding
          setAutoFillStatus('No GPS in image. Using device location...');
          try {
            const geoData = await api.geocodeCoordinates(location.lat, location.lng);
            if (geoData.address) {
              updates.property_address = geoData.address;
            }
            if (geoData.zone) {
              updates.zone = geoData.zone;
            }
          } catch {}
        }

        // Auto-fill address from reverse geocoding
        if (extractedData.address) {
          updates.property_address = extractedData.address;
        }

        // Auto-fill zone
        if (extractedData.zone) {
          updates.zone = extractedData.zone;
        }

        // Auto-fill visit date from EXIF timestamp
        if (extractedData.capture_time) {
          const dt = new Date(extractedData.capture_time);
          updates.visit_date = dt.toISOString().slice(0, 16);
        }

        if (Object.keys(updates).length > 0) {
          setForm(prev => ({ ...prev, ...updates }));
          const filled = [];
          if (updates.property_address) filled.push('address');
          if (updates.zone) filled.push('zone');
          if (updates.visit_date) filled.push('date/time');
          if (extractedData.latitude) filled.push('GPS');
          setAutoFillStatus(`Auto-filled: ${filled.join(', ')}`);
        } else if (extractedData.latitude) {
          setAutoFillStatus('GPS extracted. Address lookup returned no results.');
        } else {
          setAutoFillStatus('No EXIF data found in image. Please fill fields manually.');
        }
      } else {
        // Fallback: try device GPS for reverse geocoding
        if (location.lat && location.lng) {
          setAutoFillStatus('Using device GPS for address...');
          try {
            const geoData = await api.geocodeCoordinates(location.lat, location.lng);
            const updates = {};
            if (geoData.address) updates.property_address = geoData.address;
            if (geoData.zone) updates.zone = geoData.zone;
            if (Object.keys(updates).length > 0) {
              setForm(prev => ({ ...prev, ...updates }));
              setAutoFillStatus('Auto-filled address from device GPS.');
            }
          } catch {
            setAutoFillStatus('Image uploaded. Fill fields manually.');
          }
        } else {
          setAutoFillStatus('Image uploaded. Fill fields manually.');
        }
      }
    } catch (err) {
      setAutoFillStatus('Could not extract data. Please fill fields manually.');
    } finally {
      setExtracting(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
    setAutoFillStatus('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      setCameraStream(stream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      // Fallback: trigger file input with capture
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
      closeCamera();
      // Process like a normal image upload
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target.result);
      reader.readAsDataURL(file);
      setImageFile(file);
      setExtracting(true);
      setAutoFillStatus('Photo captured! Getting location...');
      setError('');
      try {
        const formData = new FormData();
        formData.append('file', file);
        let extractedData = null;
        try {
          extractedData = await api.extractImageData(formData);
        } catch (err) {
          console.log('Image extraction not available:', err.message);
        }
        // Use device GPS since camera captures won't have EXIF GPS
        if (location.lat && location.lng) {
          setLocation({ lat: location.lat, lng: location.lng });
          try {
            const geoData = await api.geocodeCoordinates(location.lat, location.lng);
            const updates = {};
            if (geoData.address) updates.property_address = geoData.address;
            if (geoData.zone) updates.zone = geoData.zone;
            updates.visit_date = new Date().toISOString().slice(0, 16);
            if (Object.keys(updates).length > 0) {
              setForm(prev => ({ ...prev, ...updates }));
              const filled = [];
              if (updates.property_address) filled.push('address');
              if (updates.zone) filled.push('zone');
              filled.push('date/time', 'GPS');
              setAutoFillStatus(`Auto-filled: ${filled.join(', ')}`);
            }
          } catch {
            setAutoFillStatus('Photo captured. Fill address manually.');
          }
        } else {
          setAutoFillStatus('Photo captured. Enable location for auto-fill.');
        }
      } catch {
        setAutoFillStatus('Photo captured. Fill fields manually.');
      } finally {
        setExtracting(false);
      }
    }, 'image/jpeg', 0.9);
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        ...form,
        visit_date: new Date(form.visit_date).toISOString(),
        latitude: location.lat,
        longitude: location.lng,
        sanctioned_plan_date: form.sanctioned_plan_date ? new Date(form.sanctioned_plan_date).toISOString() : null,
      };
      const report = await api.createReport(payload);

      // If there's an image, upload it as media for this report
      if (imageFile) {
        try {
          const mediaForm = new FormData();
          mediaForm.append('file', imageFile);
          if (location.lat) mediaForm.append('latitude', location.lat);
          if (location.lng) mediaForm.append('longitude', location.lng);
          mediaForm.append('capture_time', new Date().toISOString());
          await api.uploadMedia(report.id, mediaForm);
        } catch {}
      }

      setSuccess(`Report #${report.id} created successfully${imageFile ? ' with image attached' : ''}! You can add more images/videos from the Image/Video module.`);
      setForm({
        property_address: '', zone: user?.zone || '', ward: '',
        visit_date: new Date().toISOString().slice(0, 16),
        activity_type: '', activity_description: '', owner_name: '',
        owner_contact: '', ownership_type: '', last_sanctioned_plan: '',
        sanctioned_plan_date: '', remarks: '',
      });
      removeImage();
      loadRecentReports();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <FileText size={28} className="text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Data Entry Module</h2>
          <p className="text-gray-500 text-sm">Upload image to auto-fill details, or enter manually</p>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4 flex items-center gap-2 border border-green-200">
          <CheckCircle size={20} />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 flex items-center gap-2 border border-red-200">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Image Upload Section - Auto Fill */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Camera size={18} className="text-blue-500" />
            Step 1: Upload Site Image (Auto-fills fields)
          </h3>
          <p className="text-xs text-gray-500 mb-3">Upload a photo taken at the site. GPS location and timestamp will be extracted automatically to fill the form.</p>

          {!imagePreview ? (
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Camera Capture Button */}
              <button
                type="button"
                onClick={openCamera}
                className="flex-1 flex flex-col items-center justify-center h-36 border-2 border-dashed border-green-300 rounded-xl cursor-pointer bg-white hover:bg-green-50 transition-colors"
              >
                <div className="flex flex-col items-center gap-2">
                  <Camera size={36} className="text-green-500" />
                  <span className="text-sm font-semibold text-green-700">Take Photo</span>
                  <span className="text-xs text-gray-400">Open camera to capture</span>
                </div>
              </button>
              {/* Hidden file input for camera fallback */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />

              {/* Gallery Upload Button */}
              <label className="flex-1 flex flex-col items-center justify-center h-36 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer bg-white hover:bg-blue-50 transition-colors">
                <div className="flex flex-col items-center gap-2">
                  <Upload size={36} className="text-blue-500" />
                  <span className="text-sm font-semibold text-blue-700">Upload from Gallery</span>
                  <span className="text-xs text-gray-400">Choose existing image</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="relative">
              <div className="flex gap-4 items-start">
                <div className="relative w-40 h-40 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                  <img src={imagePreview} alt="Site" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="flex-1">
                  {extracting ? (
                    <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-3 rounded-lg">
                      <Loader size={18} className="animate-spin" />
                      <span className="text-sm">{autoFillStatus}</span>
                    </div>
                  ) : autoFillStatus && (
                    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
                      autoFillStatus.includes('Auto-filled') ? 'text-green-700 bg-green-50 border border-green-200' :
                      autoFillStatus.includes('No EXIF') || autoFillStatus.includes('manually') ? 'text-yellow-700 bg-yellow-50 border border-yellow-200' :
                      'text-blue-700 bg-blue-50 border border-blue-200'
                    }`}>
                      {autoFillStatus.includes('Auto-filled') ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                      {autoFillStatus}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">This image will be attached to the report when submitted.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Location & Visit Info */}
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-blue-500" />
            Location & Visit Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Property Address *</label>
              <textarea
                name="property_address"
                value={form.property_address}
                onChange={handleChange}
                required
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                placeholder="Enter full property address (auto-filled from image GPS)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Zone *</label>
              <select
                name="zone"
                value={form.zone}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              >
                <option value="">Select Zone</option>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Ward</label>
              <input
                type="text"
                name="ward"
                value={form.ward}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                placeholder="Ward number/name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Visit Date & Time *</label>
              <input
                type="datetime-local"
                name="visit_date"
                value={form.visit_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
            </div>
            {location.lat && (
              <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                <MapPin size={14} />
                GPS: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </div>
            )}
          </div>
        </div>

        {/* Unauthorized Activity Details */}
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Unauthorized Activity Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Type of Unauthorized Activity *</label>
              <select
                name="activity_type"
                value={form.activity_type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              >
                <option value="">Select Activity Type</option>
                {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Activity Description</label>
              <textarea
                name="activity_description"
                value={form.activity_description}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                placeholder="Describe the unauthorized activity in detail"
              />
            </div>
          </div>
        </div>

        {/* Ownership Details */}
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Ownership & Sanctioned Plan Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Owner Name</label>
              <input
                type="text"
                name="owner_name"
                value={form.owner_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                placeholder="Property owner name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Owner Contact</label>
              <input
                type="text"
                name="owner_contact"
                value={form.owner_contact}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                placeholder="Phone/Email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Ownership Type</label>
              <select
                name="ownership_type"
                value={form.ownership_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              >
                <option value="">Select Type</option>
                {OWNERSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Last Sanctioned Plan (if any)</label>
              <input
                type="text"
                name="last_sanctioned_plan"
                value={form.last_sanctioned_plan}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                placeholder="Plan number / reference"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Sanctioned Plan Date</label>
              <input
                type="date"
                name="sanctioned_plan_date"
                value={form.sanctioned_plan_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div className="p-6 border-b border-gray-100">
          <label className="block text-sm font-medium text-gray-600 mb-1">Remarks</label>
          <textarea
            name="remarks"
            value={form.remarks}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            placeholder="Any additional remarks"
          />
        </div>

        <div className="p-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg font-medium flex items-center gap-2 justify-center transition-colors disabled:opacity-50"
          >
            <Send size={18} />
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>

      {/* Recent Reports */}
      {recentReports.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-3">Recent Reports</h3>
          <div className="space-y-2">
            {recentReports.map(r => (
              <div key={r.id} onClick={() => navigate(`/report/${r.id}`)}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-700">#{r.id} - {r.property_address?.substring(0, 50)}</p>
                  <p className="text-xs text-gray-500">{r.zone} • {getActivityLabel(r.activity_type)}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    r.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}>{r.status}</span>
                  <p className="text-xs text-gray-400 mt-1">{r.media_count} media</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 bg-black/80">
            <h3 className="text-white font-semibold text-lg">Take Photo</h3>
            <button
              type="button"
              onClick={closeCamera}
              className="text-white bg-red-500 rounded-full p-2 hover:bg-red-600"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="p-6 bg-black/80 flex justify-center">
            <button
              type="button"
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-colors flex items-center justify-center"
            >
              <div className="w-14 h-14 rounded-full bg-white" />
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
