import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getUser, getActivityLabel } from '../utils/api';
import { FileText, MapPin, Calendar, Send, CheckCircle, AlertCircle } from 'lucide-react';

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
      setSuccess(`Report #${report.id} created successfully! You can now upload images/videos for this report.`);
      setForm({
        property_address: '', zone: user?.zone || '', ward: '',
        visit_date: new Date().toISOString().slice(0, 16),
        activity_type: '', activity_description: '', owner_name: '',
        owner_contact: '', ownership_type: '', last_sanctioned_plan: '',
        sanctioned_plan_date: '', remarks: '',
      });
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
          <p className="text-gray-500 text-sm">Record unauthorized construction activity details</p>
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
                placeholder="Enter full property address"
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
    </div>
  );
}
