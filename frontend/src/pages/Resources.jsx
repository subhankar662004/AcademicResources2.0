import React, { useState, useEffect } from 'react';
import CustomSelect from '../components/CustomSelect';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { API_URL } from '../config';
import { useToast } from '../components/Toast';
import {
  Search, FolderOpen, FileText, FileImage,
  FileSpreadsheet, Archive, Download, Upload, Plus,
  ChevronLeft, BookOpen, Loader2, Heart, X, Eye,
  AlertCircle, MoreVertical,
} from 'lucide-react';

const SAVED_KEY = 'acadhub_saved_resources';
function getSaved() { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); } catch { return []; } }
function setSaved(ids) { localStorage.setItem(SAVED_KEY, JSON.stringify(ids)); }

const EXT_COLORS = {
  PDF: '#dc2626', DOC: '#2563eb', DOCX: '#2563eb', PPT: '#d97706',
  PPTX: '#d97706', XLS: '#059669', XLSX: '#059669', ZIP: '#7c3aed',
  RAR: '#7c3aed', JPG: '#0891b2', JPEG: '#0891b2', PNG: '#0891b2',
  GIF: '#0891b2', WEBP: '#0891b2',
};

const IMAGE_EXTS  = ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'];
const SHEET_EXTS  = ['XLS', 'XLSX'];
const ZIP_EXTS    = ['ZIP', 'RAR'];

function getExt(resource) {
  if (resource.fileName?.includes('.')) return resource.fileName.split('.').pop().toUpperCase();
  if (resource.fileUrl) {
    const e = resource.fileUrl.split('.').pop().split('?')[0].toUpperCase();
    if (e.length <= 5) return e;
  }
  return resource.fileType?.split('/').pop().toUpperCase() || '';
}

function FileIcon({ ext, size = 20 }) {
  if (IMAGE_EXTS.includes(ext))  return <FileImage size={size} color={EXT_COLORS[ext] || '#64748b'} />;
  if (SHEET_EXTS.includes(ext))  return <FileSpreadsheet size={size} color={EXT_COLORS[ext] || '#64748b'} />;
  if (ZIP_EXTS.includes(ext))    return <Archive size={size} color={EXT_COLORS[ext] || '#64748b'} />;
  return <FileText size={size} color={EXT_COLORS[ext] || '#64748b'} />;
}

/* ── Preview Modal ── */
function PreviewModal({ resource, onClose, onDownload, downloading }) {
  const ext = getExt(resource);
  const isPDF   = ext === 'PDF';
  const isImage = IMAGE_EXTS.includes(ext);

  // Close on backdrop click
  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'var(--bg-white)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 860,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <FileIcon ext={ext} size={20} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {resource.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {ext} · By {resource.uploadedBy?.name || 'Unknown'}
              {resource.fileSize ? ` · ${(resource.fileSize / 1024).toFixed(1)} KB` : ''}
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onDownload(resource)}
            disabled={downloading}
            style={{ flexShrink: 0 }}
          >
            {downloading ? <Loader2 size={13} className="spin" /> : <Download size={13} />}
            {downloading ? 'Downloading…' : 'Download'}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 8, width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <X size={16} color="var(--text-muted)" />
          </button>
        </div>

        {/* Preview body */}
        <div style={{ flex: 1, overflow: 'auto', background: '#f8fafc' }}>
          {isPDF && (
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(resource.fileUrl)}&embedded=true`}
              title={resource.title}
              style={{ width: '100%', height: '100%', minHeight: 520, border: 'none' }}
            />
          )}

          {isImage && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, minHeight: 400 }}>
              <img
                src={resource.fileUrl}
                alt={resource.title}
                style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
              />
            </div>
          )}

          {!isPDF && !isImage && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 16, padding: 48, minHeight: 300,
              textAlign: 'center',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: 'var(--primary-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertCircle size={28} color="var(--primary)" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 8 }}>
                  Preview not available for {ext} files
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 360 }}>
                  This file type cannot be previewed in the browser. Download it to view the full content.
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => onDownload(resource)}
                disabled={downloading}
              >
                {downloading ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
                {downloading ? 'Downloading…' : 'Download File'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
function Resources() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const selectedCategory = localStorage.getItem('selectedCategory');

  const [searchTerm, setSearchTerm]           = useState('');
  const [selectedFolder, setSelectedFolder]   = useState(null);
  const [folders, setFolders]                 = useState([]);
  const [resources, setResources]             = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName]     = useState('');
  const [creatingFolder, setCreatingFolder]   = useState(false);
  const [savedIds, setSavedIds]               = useState(() => getSaved());
  const [activeTab, setActiveTab]             = useState('all');
  const toast = useToast();
  const [downloading, setDownloading]         = useState({}); // { [id]: true }
  const [previewResource, setPreviewResource] = useState(null);
  const [folderMenu, setFolderMenu]           = useState(null); // folder._id with open menu
  const [zippingFolder, setZippingFolder]     = useState({}); // { [id]: true }

  const toggleBookmark = (id) => {
    setSavedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      setSaved(next);
      return next;
    });
  };

  useEffect(() => {
    if (!selectedCategory) { navigate('/choose-category'); return; }
    fetchData();
  }, [selectedFolder, selectedCategory]);

  const fetchData = async () => {
    try {
      setLoading(true); setError('');
      const folderUrl = selectedFolder
        ? `${API_URL}/api/folders/parent/${selectedFolder._id}?category=${encodeURIComponent(selectedCategory)}`
        : `${API_URL}/api/folders/root?category=${encodeURIComponent(selectedCategory)}`;
      const [fRes, rRes] = await Promise.all([
        fetch(folderUrl, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch(`${API_URL}/api/resources?category=${encodeURIComponent(selectedCategory)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
      ]);
      if (fRes.ok) setFolders(await fRes.json());
      if (rRes.ok) setResources(await rRes.json());
      else setError('Failed to load resources');
    } catch (err) { setError('Connection error: ' + err.message); }
    finally { setLoading(false); }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault(); setError('');
    if (!newFolderName.trim()) return setError('Enter a folder name');
    setCreatingFolder(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return setError('You must be logged in');
      const res = await fetch(`${API_URL}/api/folders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName, isPublic: true, parentFolder: selectedFolder?._id || null, category: selectedCategory }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.message || 'Failed');
      else { setNewFolderName(''); setShowCreateFolder(false); fetchData(); }
    } catch { setError('Connection error'); }
    finally { setCreatingFolder(false); }
  };

  /* Close folder menu when clicking outside */
  useEffect(() => {
    if (!folderMenu) return;
    const close = () => setFolderMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [folderMenu]);

  /* Download all resources in a folder as ZIP */
  const handleDownloadFolderZip = async (folder) => {
    if (zippingFolder[folder._id]) return;
    setZippingFolder(prev => ({ ...prev, [folder._id]: true }));
    setFolderMenu(null);
    try {
      const res = await fetch(`${API_URL}/api/folders/${folder._id}/download-zip`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to download folder ZIP');
        return;
      }
      const blob    = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link    = document.createElement('a');
      link.href     = blobUrl;
      link.download = `${folder.name}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch {
      toast.error('Connection error. Please try again.');
    } finally {
      setZippingFolder(prev => ({ ...prev, [folder._id]: false }));
    }
  };

  /* Single-click download — fetches as blob so the browser saves directly */
  const handleDownload = async (resource) => {
    if (!user) { navigate('/login'); return; }
    if (downloading[resource._id]) return;

    setDownloading(prev => ({ ...prev, [resource._id]: true }));
    try {
      // Get the Cloudinary fl_attachment URL from backend
      const res  = await fetch(`${API_URL}/api/resources/download/${resource._id}`);
      const data = await res.json();
      const url  = data.url || resource.fileUrl;

      try {
        // Attempt blob fetch (works when Cloudinary CORS allows it)
        const blobRes  = await fetch(url);
        const blob     = await blobRes.blob();
        const blobUrl  = URL.createObjectURL(blob);
        const link     = document.createElement('a');
        link.href      = blobUrl;
        link.download  = resource.fileName || resource.title;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      } catch {
        // CORS fallback — create hidden anchor with download attribute
        const link    = document.createElement('a');
        link.href     = url;
        link.download = resource.fileName || resource.title;
        link.target   = '_blank';
        link.rel      = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      // Last resort
      window.open(resource.fileUrl, '_blank');
    } finally {
      setDownloading(prev => ({ ...prev, [resource._id]: false }));
    }
  };

  const baseResources = selectedFolder
    ? resources.filter(r => {
        const fId = typeof r.folder === 'object' ? r.folder?._id : r.folder;
        return fId === selectedFolder._id;
      })
    : resources;

  const filtered = {
    folders: activeTab === 'saved' ? [] : folders.filter(f => f.name?.toLowerCase().includes(searchTerm.toLowerCase())),
    resources: baseResources.filter(r => {
      const matchSearch = r.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSaved  = activeTab === 'saved' ? savedIds.includes(r._id) : true;
      return matchSearch && matchSaved;
    }),
  };
  const pgResources = usePagination(filtered.resources, 12);

  if (!selectedCategory) return null;

  return (
    <div>
      {/* Preview Modal */}
      {previewResource && (
        <PreviewModal
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
          onDownload={handleDownload}
          downloading={!!downloading[previewResource._id]}
        />
      )}

      <div className="page-header">
        <h1>{selectedCategory} Resources</h1>
        <p>Browse and download approved {selectedCategory} study materials</p>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/category-dashboard')}>
            <ChevronLeft size={14} /> Dashboard
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/choose-category')}>
            Change Category
          </button>
        </div>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-error">{error}</div>}

        {/* Toolbar */}
        <div className="toolbar">
          <div className="rc-tabs">
            <button className={`rc-tab${activeTab === 'all' ? ' active' : ''}`} onClick={() => setActiveTab('all')}>
              All
            </button>
            <button className={`rc-tab${activeTab === 'saved' ? ' active' : ''}`} onClick={() => setActiveTab('saved')}>
              <Heart size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              Saved {savedIds.length > 0 && <span className="rc-tab-badge">{savedIds.length}</span>}
            </button>
          </div>
          <div className="search-input-wrap" style={{ flex: 1, minWidth: 240 }}>
            <Search size={15} />
            <input
              type="text"
              placeholder={`Search ${selectedCategory} resources…`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <CustomSelect
            value={selectedFolder?._id || ''}
            onChange={e => {
              setSearchTerm('');
              setSelectedFolder(e.target.value ? folders.find(f => f._id === e.target.value) : null);
            }}
          >
            <option value="">All Folders</option>
            {folders.map(f => <option key={f._id} value={f._id}>{f.name} ({f.resourceCount || 0})</option>)}
          </CustomSelect>

          {user && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setShowCreateFolder(v => !v)}>
                <Plus size={14} /> Folder
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate(selectedFolder ? `/upload?folder=${selectedFolder._id}` : '/upload')}>
                <Upload size={14} /> Upload
              </button>
            </div>
          )}
        </div>

        {/* Create Folder */}
        {showCreateFolder && (
          <div className="create-folder-panel">
            <h4>Create New Folder in {selectedCategory}</h4>
            <form onSubmit={handleCreateFolder} className="create-folder-form">
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="Folder name…"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={creatingFolder}>
                {creatingFolder ? <Loader2 size={14} className="spin" /> : 'Create'}
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setShowCreateFolder(false); setNewFolderName(''); }}>
                Cancel
              </button>
            </form>
          </div>
        )}

        {selectedFolder && (
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={() => setSelectedFolder(null)}>
            <ChevronLeft size={14} /> Back to All Folders
          </button>
        )}

        {/* Folders */}
        {!loading && filtered.folders.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <h2 className="section-heading">Folders <span className="count-badge">{filtered.folders.length}</span></h2>
            <div className="grid-cards">
              {filtered.folders.map(folder => (
                <div
                  key={folder._id}
                  className={`folder-card ${selectedFolder?._id === folder._id ? 'selected' : ''}`}
                  onClick={() => { setSelectedFolder(folder); setSearchTerm(''); }}
                  style={{ position: 'relative' }}
                >
                  {/* Three-dot menu button */}
                  <button
                    title="Folder options"
                    onClick={e => { e.stopPropagation(); setFolderMenu(prev => prev === folder._id ? null : folder._id); }}
                    style={{
                      position: 'absolute', top: 10, right: 10,
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center',
                      color: 'var(--text-muted)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    {zippingFolder[folder._id]
                      ? <Loader2 size={16} className="spin" color="var(--primary)" />
                      : <MoreVertical size={16} />
                    }
                  </button>

                  {/* Dropdown menu */}
                  {folderMenu === folder._id && (
                    <div
                      onClick={e => e.stopPropagation()}
                      style={{
                        position: 'absolute', top: 36, right: 10, zIndex: 50,
                        background: 'var(--bg-white)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        minWidth: 210,
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        onClick={() => handleDownloadFolderZip(folder)}
                        disabled={zippingFolder[folder._id]}
                        style={{
                          width: '100%', padding: '11px 16px',
                          display: 'flex', alignItems: 'center', gap: 10,
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 14, color: 'var(--text)', textAlign: 'left',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        {zippingFolder[folder._id]
                          ? <Loader2 size={15} className="spin" color="var(--primary)" />
                          : <Download size={15} color="var(--primary)" />
                        }
                        {zippingFolder[folder._id]
                          ? 'Preparing ZIP…'
                          : `Download all as ZIP`
                        }
                      </button>
                    </div>
                  )}

                  <div className="folder-icon-wrap">
                    <FolderOpen size={22} color="#2563eb" strokeWidth={1.8} />
                  </div>
                  <div className="folder-name">{folder.name}</div>
                  <div className="folder-count">
                    {folder.subfolderCount || 0} folders · {folder.resourceCount || 0} files
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resources */}
        <h2 className="section-heading">
          {selectedFolder ? `${selectedFolder.name} Resources` : `All ${selectedCategory} Resources`}
          <span className="count-badge">{filtered.resources.length}</span>
        </h2>

        {loading ? (
          <div className="loading-state">
            <Loader2 size={28} className="spin" color="var(--primary)" />
            <p>Loading resources…</p>
          </div>
        ) : pgResources.total > 0 ? (
          <div className="grid-cards">
            {pgResources.slice.map(resource => {
              const ext      = getExt(resource);
              const extColor = EXT_COLORS[ext] || '#64748b';
              const isDown   = !!downloading[resource._id];
              return (
                <div key={resource._id} className="resource-card">
                  <div className="resource-card-top">
                    <div className="resource-icon-wrap">
                      <FileIcon ext={ext} size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="resource-title">{resource.title}</div>
                    </div>
                    {ext && (
                      <span className="ext-badge" style={{ background: extColor + '18', color: extColor }}>
                        {ext}
                      </span>
                    )}
                    <button
                      className="rc-bookmark-btn"
                      title={savedIds.includes(resource._id) ? 'Remove from saved' : 'Save resource'}
                      onClick={e => { e.stopPropagation(); toggleBookmark(resource._id); }}
                    >
                      <Heart
                        size={15}
                        fill={savedIds.includes(resource._id) ? '#ef4444' : 'none'}
                        color={savedIds.includes(resource._id) ? '#ef4444' : 'var(--text-muted)'}
                      />
                    </button>
                  </div>

                  <div className="resource-meta">
                    <span>By {resource.uploadedBy?.name || 'Unknown'}</span>
                    <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
                  </div>

                  {resource.fileSize && (
                    <div className="resource-size">{(resource.fileSize / 1024).toFixed(1)} KB</div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => setPreviewResource(resource)}
                    >
                      <Eye size={13} /> Preview
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => handleDownload(resource)}
                      disabled={isDown}
                    >
                      {isDown
                        ? <><Loader2 size={13} className="spin" /> Downloading…</>
                        : <><Download size={13} /> Download</>
                      }
                    </button>
                  </div>
                </div>
              );
            })}
            <Pagination {...pgResources} />
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon"><BookOpen size={40} color="var(--primary)" strokeWidth={1.5} /></div>
            <h3>No Resources Found</h3>
            <p>{searchTerm ? `No results for "${searchTerm}"` : `No resources in ${selectedCategory} yet`}</p>
            {user && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/upload')}>
                <Upload size={14} /> Upload First Resource
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Resources;
