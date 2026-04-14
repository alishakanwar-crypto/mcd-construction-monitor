import React, { useState, useEffect, useRef } from 'react';
import { api, getActivityLabel, getMediaUrl, getThumbnailUrl } from '../utils/api';
import { Monitor, RefreshCw, Maximize2, MapPin, Clock, Filter, Image, Video } from 'lucide-react';

export default function ControlPanel() {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterZone, setFilterZone] = useState('');
  const [filterType, setFilterType] = useState('');
  const [zones, setZones] = useState([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const containerRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    loadFeed();
    loadZones();
  }, [filterZone, filterType]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadFeed, 10000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, filterZone, filterType]);

  const loadFeed = async () => {
    try {
      const params = {};
      if (filterZone) params.zone = filterZone;
      if (filterType) params.media_type = filterType;
      params.limit = 100;
      const data = await api.getLiveFeed(params);
      setFeed(data.feed || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadZones = async () => {
    try {
      const data = await api.getZones();
      setZones(data);
    } catch {}
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  return (
    <div ref={containerRef} className={`${fullscreen ? 'bg-gray-900 p-4' : ''}`}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Monitor size={28} className={`${fullscreen ? 'text-blue-400' : 'text-blue-600'}`} />
          <div>
            <h2 className={`text-2xl font-bold ${fullscreen ? 'text-white' : 'text-gray-800'}`}>Live Control Panel</h2>
            <p className={`text-sm ${fullscreen ? 'text-gray-400' : 'text-gray-500'}`}>
              Real-time image & video feed from field engineers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={filterZone} onChange={e => setFilterZone(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
            <option value="">All Zones</option>
            {zones.map(z => <option key={z.zone} value={z.zone}>{z.zone} ({z.report_count})</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
            <option value="">All Media</option>
            <option value="image">Images Only</option>
            <option value="video">Videos Only</option>
          </select>
          <button onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
            <RefreshCw size={14} className={autoRefresh ? 'animate-spin' : ''} />
            {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
          </button>
          <button onClick={toggleFullscreen}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            <Maximize2 size={14} /> {fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* Live Feed Count */}
      <div className={`${fullscreen ? 'bg-gray-800' : 'bg-blue-50'} rounded-lg p-3 mb-4 flex items-center justify-between`}>
        <p className={`text-sm font-medium ${fullscreen ? 'text-blue-300' : 'text-blue-700'}`}>
          Showing {feed.length} media items
          {autoRefresh && <span className="ml-2 text-xs opacity-70">(refreshing every 10s)</span>}
        </p>
        <button onClick={loadFeed} className="text-blue-600 hover:text-blue-800 text-sm">
          <RefreshCw size={16} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading feed...</div>
      ) : feed.length === 0 ? (
        <div className={`text-center py-16 ${fullscreen ? 'text-gray-400' : 'text-gray-500'}`}>
          <Monitor size={48} className="mx-auto mb-3 opacity-30" />
          <p>No media available. Waiting for field engineers to upload...</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${fullscreen ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
          {feed.map(item => (
            <div
              key={item.id}
              onClick={() => setSelectedMedia(item)}
              className={`rounded-xl overflow-hidden cursor-pointer transition-transform hover:scale-105 ${
                fullscreen ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'
              }`}
            >
              {item.media_type === 'image' ? (
                <img src={getThumbnailUrl(item.file_path)} alt={item.file_name}
                  className="w-full h-40 object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-40 bg-gray-800 flex items-center justify-center">
                  <Video size={40} className="text-gray-400" />
                </div>
              )}
              <div className="p-3">
                <div className="flex items-center gap-1 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.media_type === 'image' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {item.media_type === 'image' ? <Image size={10} className="inline mr-1" /> : <Video size={10} className="inline mr-1" />}
                    {item.media_type}
                  </span>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    {getActivityLabel(item.activity_type).substring(0, 15)}
                  </span>
                </div>
                <p className={`text-xs truncate ${fullscreen ? 'text-gray-300' : 'text-gray-600'}`}>
                  {item.property_address}
                </p>
                <p className={`text-xs ${fullscreen ? 'text-gray-400' : 'text-gray-500'}`}>
                  {item.zone} • {item.engineer_name}
                </p>
                <div className={`flex items-center gap-2 mt-1 text-xs ${fullscreen ? 'text-gray-500' : 'text-gray-400'}`}>
                  <Clock size={10} />
                  {item.capture_time ? new Date(item.capture_time).toLocaleString() : 'N/A'}
                </div>
                {item.latitude && (
                  <div className={`flex items-center gap-1 text-xs ${fullscreen ? 'text-gray-500' : 'text-gray-400'}`}>
                    <MapPin size={10} />
                    {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Media Detail Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedMedia(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {selectedMedia.media_type === 'image' ? (
              <img src={getMediaUrl(selectedMedia.file_path)} alt="" className="w-full max-h-[60vh] object-contain bg-black" />
            ) : (
              <video src={getMediaUrl(selectedMedia.file_path)} controls className="w-full max-h-[60vh]" />
            )}
            <div className="p-6">
              <h3 className="font-semibold text-lg text-gray-800 mb-2">{selectedMedia.property_address}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Zone:</span> <span className="font-medium">{selectedMedia.zone}</span></div>
                <div><span className="text-gray-500">Activity:</span> <span className="font-medium">{getActivityLabel(selectedMedia.activity_type)}</span></div>
                <div><span className="text-gray-500">Engineer:</span> <span className="font-medium">{selectedMedia.engineer_name}</span></div>
                <div><span className="text-gray-500">Role:</span> <span className="font-medium">{selectedMedia.engineer_role}</span></div>
                <div><span className="text-gray-500">Captured:</span> <span className="font-medium">{selectedMedia.capture_time ? new Date(selectedMedia.capture_time).toLocaleString() : 'N/A'}</span></div>
                {selectedMedia.latitude && (
                  <div><span className="text-gray-500">GPS:</span> <span className="font-medium">{selectedMedia.latitude.toFixed(6)}, {selectedMedia.longitude.toFixed(6)}</span></div>
                )}
              </div>
              <button onClick={() => setSelectedMedia(null)}
                className="mt-4 w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
