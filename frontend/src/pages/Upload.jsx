import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { API_URL } from '../config';
import { useLocation, useNavigate } from 'react-router-dom';
import { Upload as UploadCloud, Paperclip, X, ChevronLeft, Loader2, FolderPlus } from 'lucide-react';
import { useToast } from '../components/Toast';
import CustomSelect from '../components/CustomSelect';

function Upload() {
  const { user } = useAuth();
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [folder, setFolder]           = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [folders, setFolders]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [dragOver, setDragOver]       = useState(false);
  const [customFolderName, setCustomFolderName] = useState('');
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const params   = new URLSearchParams(location.search);
  const folderId = params.get('folder');
  const selectedCategory = localStorage.getItem('selectedCategory');

  useEffect(() => {
    if (!selectedCategory) navigate('/choose-category');
    else fetchFolders();
  }, [selectedCategory]);

  useEffect(() => { if (folderId) setFolder(folderId); }, [folderId]);

  const fetchFolders = async () => {
    try {
      const res = await fetch(`${API_URL}/api/folders/root?category=${encodeURIComponent(selectedCategory)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) setFolders(await res.json());
    } catch { /* silent */ }
  };

  const handleFileSelect = (file) => { if (file) { setSelectedFile(file); } };
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Please enter a title');
    if (!selectedFile) return toast.error('Please select a file');
    if (folder === '__new__' && !customFolderName.trim()) return toast.error('Please enter a folder name');
    setLoading(true);
    try {
      let resolvedFolder = folder;

      if (folder === '__new__' && customFolderName.trim()) {
        const folderRes = await fetch(`${API_URL}/api/folders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ name: customFolderName.trim(), category: selectedCategory, isPublic: true }),
        });
        if (!folderRes.ok) { toast.error('Could not create folder'); setLoading(false); return; }
        const newFolder = await folderRes.json();
        resolvedFolder = newFolder._id;
        setFolders(prev => [...prev, newFolder]);
        setFolder(newFolder._id);
        setCustomFolderName('');
      }

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', selectedCategory);
      if (resolvedFolder) formData.append('folder', resolvedFolder);
      formData.append('file', selectedFile);

      const res = await fetch(`${API_URL}/api/resources`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Upload failed'); }
      else {
        toast.success('Resource uploaded! Pending admin approval.');
        setTitle(''); setDescription(''); setSelectedFile(null); setFolder('');
      }
    } catch { toast.error('Connection error. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Upload to {selectedCategory}</h1>
        <p>Share your {selectedCategory} study materials with the community</p>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/category-dashboard')}>
            <ChevronLeft size={14} /> Dashboard
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/choose-category')}>
            Change Category
          </button>
        </div>
      </div>

      <div className="page-body-sm">
        <div className="card">
          <form onSubmit={handleSubmit}>
            {/* Drop Zone */}
            <div
              className={`upload-area ${dragOver ? 'dragover' : ''} ${selectedFile ? 'has-file' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !selectedFile && document.getElementById('fileInput').click()}
            >
              <div className="upload-icon-wrap">
                <UploadCloud size={36} color="var(--primary)" strokeWidth={1.5} />
              </div>
              <h3>Drag &amp; drop your file here</h3>
              <p>or click to browse files</p>
              <p className="upload-hint">PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, ZIP, images · Max 100 MB</p>
              <input
                type="file"
                id="fileInput"
                className="file-input"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.jpg,.jpeg,.png"
              />
            </div>

            {selectedFile && (
              <div className="selected-file-info">
                <Paperclip size={18} color="var(--primary)" />
                <div>
                  <div className="file-name">{selectedFile.name}</div>
                  <div className="file-size">{formatSize(selectedFile.size)}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => setSelectedFile(null)}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <div className="form-group">
                <label>Resource Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Physics Chapter 5 Notes"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description <span className="optional-label">(optional)</span></label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description of this resource…"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Folder <span className="optional-label">(optional)</span></label>
                <CustomSelect value={folder} onChange={e => { setFolder(e.target.value); if (e.target.value !== '__new__') setCustomFolderName(''); }}>
                  <option value="">No folder selected</option>
                  {folders.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                  <option value="__new__">+ Create new folder…</option>
                </CustomSelect>
                {folder === '__new__' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <FolderPlus size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <input
                      type="text"
                      value={customFolderName}
                      onChange={e => setCustomFolderName(e.target.value)}
                      placeholder="New folder name…"
                      autoFocus
                      style={{ flex: 1, padding: '9px 12px', border: '1.5px solid var(--primary)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <><Loader2 size={14} className="spin" /> Uploading…</> : `Upload to ${selectedCategory}`}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => { setSelectedFile(null); setTitle(''); setDescription(''); setFolder(''); setCustomFolderName(''); }}
                >
                  Clear
                </button>
              </div>

              <p className="form-hint" style={{ marginTop: 16 }}>
                Your resource will be visible after admin approval. This usually takes less than 24 hours.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Upload;
