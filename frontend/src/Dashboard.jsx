import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import './index.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  ArcElement
);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const resolveImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  if (path.startsWith('/static/')) {
    return `${API_BASE_URL}${path}`;
  }
  return path;
};

function Dashboard({ onLogout, userId, theme = 'dark' }) {
  const username = localStorage.getItem('user_username') || localStorage.getItem('user_email')?.split('@')[0] || 'User';
  const [activeTab, setActiveTab] = useState('USER HUB');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showExtractionModal, setShowExtractionModal] = useState(false);
  const chartRef = useRef(null);
  const resultsRef = useRef(null);
  const [resultsSubTab, setResultsSubTab] = useState('ALL'); // 'ALL' | 'OVERVIEW' | 'SECTIONS' | 'DIAGNOSTICS' | 'RAW'
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const progressIntervalRef = useRef(null);
  
  // Image Check State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageResult, setImageResult] = useState(null);
  
  // Targeted Scan State
  const [showTargetedModal, setShowTargetedModal] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzingTargeted, setIsAnalyzingTargeted] = useState(false);
  const [targetedResult, setTargetedResult] = useState(null);


  // Discovery Scan State
  const [careerMode, setCareerMode] = useState(null); // 'TARGETED' | 'DISCOVERY' | null
  const [isAnalyzingDiscovery, setIsAnalyzingDiscovery] = useState(false);
  const [selectedJobReasoning, setSelectedJobReasoning] = useState(null);
  const [discoveryResult, setDiscoveryResult] = useState(null);

  // Benchmark State
  const [userScore, setUserScore] = useState(51); // Can be adjusted or set via props/analysis result
  const benchmarkScore = 70;

  const [dbStatus, setDbStatus] = useState({ connected: false, provider: 'Checking...' });
  const [historyList, setHistoryList] = useState([]);
  const [showTop1PreviewModal, setShowTop1PreviewModal] = useState(false);
  const [imageHistory, setImageHistory] = useState([]);
  const [selectedImageRankingPreview, setSelectedImageRankingPreview] = useState(null);

  const [chartData, setChartData] = useState({
    labels: ['v1', 'v2', 'v3'],
    datasets: []
  });

  const safeFetchJson = async (url, retries = 1, delayMs = 1200) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, delayMs));
        return safeFetchJson(url, retries - 1, delayMs);
      }
      return null;
    }
  };

  const fetchDbStatus = async () => {
    const data = await safeFetchJson(`${API_BASE_URL}/api/db-status`);
    if (data && data.status === 'success') {
      setDbStatus({ connected: data.connected, provider: data.provider });
    } else {
      setDbStatus({ connected: false, provider: 'Disconnected' });
    }
  };

  const fetchHistory = async () => {
    if (!userId) {
      setHistoryList([]);
      return;
    }
    const data = await safeFetchJson(`${API_BASE_URL}/api/history/${userId}`);
    if (data && Array.isArray(data.data) && data.data.length > 0) {
      setHistoryList(data.data);
      const sorted = data.data.slice().reverse(); // chronological
      const scores = sorted.map(r => r.ats_score || 0);
      const labels = sorted.map((r, i) => `v${i+1}`);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
      
      setChartData({
        labels: labels.length ? labels : ['v1'],
        datasets: [{
          label: 'ATS Compatibility Score',
          data: scores.length ? scores : [0],
          fill: true,
          backgroundColor: gradient,
          borderColor: '#3b82f6',
          borderWidth: 3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#3b82f6',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          tension: 0.4,
        }]
      });
    } else {
      setHistoryList([]);
      setChartData({
        labels: ['v1'],
        datasets: [{
          label: 'ATS Compatibility Score',
          data: [0],
          fill: true,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          pointRadius: 4,
          tension: 0.4,
        }]
      });
    }
  };

  const fetchLatestAnalysis = async () => {
    if (!userId) {
      setResult(null);
      setUserScore(0);
      return;
    }
    const data = await safeFetchJson(`${API_BASE_URL}/api/latest-analysis/${userId}`);
    if (data && data.data) {
      setResult(data.data);
      if (data.data.parsed_content?.ats_score) {
        setUserScore(data.data.parsed_content.ats_score);
      }
    } else {
      setResult(null);
      setUserScore(0);
    }
  };

  const fetchLatestTargetedScan = async () => {
    if (!userId) {
      setTargetedResult(null);
      return;
    }
    const data = await safeFetchJson(`${API_BASE_URL}/api/latest-targeted-scan/${userId}`);
    if (data && data.data) {
      setTargetedResult(data.data);
    } else {
      setTargetedResult(null);
    }
  };

  const fetchLatestDiscoveryScan = async () => {
    if (!userId) {
      setDiscoveryResult(null);
      return;
    }
    const data = await safeFetchJson(`${API_BASE_URL}/api/latest-discovery-scan/${userId}`);
    if (data && data.data && data.data.results_data) {
      setDiscoveryResult(data.data.results_data);
    } else {
      setDiscoveryResult(null);
    }
  };

  const fetchImageHistory = async () => {
    if (!userId) {
      setImageHistory([]);
      return;
    }
    const data = await safeFetchJson(`${API_BASE_URL}/api/history/images/${userId}`);
    if (data && Array.isArray(data.data)) {
      setImageHistory(data.data);
    } else {
      setImageHistory([]);
    }
  };

  useEffect(() => {
    // Reset all user-specific state upon user ID change
    setResult(null);
    setFile(null);
    setHistoryList([]);
    setImageHistory([]);
    setImageResult(null);
    setImagePreview(null);
    setImageFile(null);
    setTargetedResult(null);
    setDiscoveryResult(null);
    setUserScore(0);

    fetchDbStatus();
    if (userId) {
      fetchHistory();
      fetchImageHistory();
      fetchLatestAnalysis();
      fetchLatestTargetedScan();
      fetchLatestDiscoveryScan();
      
      const storedCareerMode = localStorage.getItem(`careerMode_${userId}`);
      if (storedCareerMode) {
        setCareerMode(storedCareerMode);
      } else {
        setCareerMode(null);
      }
    }
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'USER HUB' || activeTab === 'DASHBOARD') {
      fetchHistory();
    }
    if (activeTab === 'IMAGE') {
      fetchImageHistory();
    }
  }, [activeTab, userId]);

  // Auto-scroll down smoothly to Results section when analysis completes
  useEffect(() => {
    if (result && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [result]);


  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: theme === 'light' ? '#0f172a' : '#1e293b',
        titleFont: { size: 14, family: 'Inter' },
        bodyFont: { size: 14, family: 'Inter' },
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `Score: ${context.parsed.y}%`;
          }
        }
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: {
          color: theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: theme === 'light' ? '#475569' : '#94a3b8',
          font: { family: 'Inter' }
        }
      },
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: theme === 'light' ? '#475569' : '#94a3b8',
          font: { family: 'Inter' }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  // Robust parsed_content and personal_info extraction
  const parsedContent = React.useMemo(() => {
    if (!result?.parsed_content) return null;
    let content = result.parsed_content;
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch (e) {
        console.error("Error parsing parsed_content JSON:", e);
        return null;
      }
    }
    return content;
  }, [result]);

  const personalInfo = React.useMemo(() => {
    const rawInfo = parsedContent?.personal_info || {};
    const text = result?.extracted_text || '';
    
    // Extract heuristics if missing
    const emailMatch = !rawInfo.email ? text.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/) : null;
    const phoneMatch = !rawInfo.phone ? text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,9}/) : null;
    
    let inferredName = rawInfo.full_name;
    if (!inferredName && text) {
      const firstLines = text.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of firstLines.slice(0, 5)) {
        if (line.length < 50 && !/summary|education|experience|skills|http|@|resume|curriculum/i.test(line)) {
          inferredName = line;
          break;
        }
      }
    }

    const linkedinMatch = !rawInfo.linkedin ? text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-_]+/i) : null;
    const githubMatch = !rawInfo.portfolio ? text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-_]+/i) : null;

    return {
      full_name: rawInfo.full_name || inferredName || null,
      email: rawInfo.email || (emailMatch ? emailMatch[0] : null),
      phone: rawInfo.phone || (phoneMatch ? phoneMatch[0] : null),
      address: rawInfo.address || null,
      linkedin: rawInfo.linkedin || (linkedinMatch ? linkedinMatch[0] : null),
      portfolio: rawInfo.portfolio || (githubMatch ? githubMatch[0] : null)
    };
  }, [parsedContent, result?.extracted_text]);

  const currentScore = parsedContent?.ats_score || 0;
  const missingScore = Math.max(0, 100 - currentScore - 10);
  const fixingScore = 100 - currentScore - missingScore;

  // Top 3 highest performing resumes ranking
  const topResumes = React.useMemo(() => {
    let list = Array.isArray(historyList) ? [...historyList] : [];

    // Ensure the current active analysis is represented
    if (result && result.parsed_content) {
      const activeFilename = result.filename || file?.name || 'Current_Active_Resume.pdf';
      const activeScore = result.parsed_content.ats_score || currentScore;
      const alreadyInList = list.some(
        (r) => (result.id && r.id === result.id) || (r.filename === activeFilename && r.ats_score === activeScore)
      );
      if (!alreadyInList && activeScore > 0) {
        list.push({
          id: result.id || 'active',
          filename: activeFilename,
          ats_score: activeScore,
          parsed_data: result.parsed_content,
          thumbnail: result.thumbnail || result.parsed_content?.thumbnail,
          created_at: new Date().toISOString(),
        });
      }
    }

    // Sort descending by ats_score (only real user scans)
    const sorted = [...list].sort((a, b) => (Number(b.ats_score) || 0) - (Number(a.ats_score) || 0));

    return sorted.slice(0, 3);
  }, [historyList, result, file, currentScore]);

  // Helper to reliably resolve uploaded/backend images
  const resolveImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('blob:')) return path;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/static/')) return `${API_BASE_URL}${path}`;
    if (path.startsWith('static/')) return `${API_BASE_URL}/${path}`;
    if (path.startsWith('/')) return path;
    return `${API_BASE_URL}/${path}`;
  };

  // Top 3 highest performing formal images ranking (real user scans only)
  const topImages = React.useMemo(() => {
    let list = Array.isArray(imageHistory) ? [...imageHistory] : [];

    // Ensure any active upload is reflected if present
    if (imageResult && imagePreview) {
      const activeScore = imageResult.score || 0;
      const activeFilename = imageFile?.name || 'Current_Analyzed_Photo.jpg';
      const alreadyInList = list.some(
        (img) => (img.image_path === imagePreview || img.filename === activeFilename) && Number(img.score) === Number(activeScore)
      );
      if (!alreadyInList) {
        list.push({
          id: 'active-upload',
          filename: activeFilename,
          image_path: imagePreview,
          thumbnail: imageResult.thumbnail || imagePreview,
          score: activeScore,
          created_at: new Date().toISOString(),
          feedback_data: imageResult,
        });
      }
    }

    // Sort descending by score
    const sorted = [...list].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    return sorted.slice(0, 3);
  }, [imageHistory, imageResult, imagePreview, imageFile]);

  const doughnutData = {
    labels: ['Good', 'Need Fixing', 'Missing'],
    datasets: [
      {
        data: [currentScore, fixingScore, missingScore],
        backgroundColor: [
          '#10b981', // success green
          '#fbbf24', // warning yellow
          '#ef4444', // danger red
        ],
        borderWidth: 0,
        hoverOffset: 4
      },
    ],
  };

  const doughnutOptions = {
    cutout: '75%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1e293b',
        bodyFont: { size: 14, family: 'Inter' },
        padding: 12,
        callbacks: {
          label: (context) => ` ${context.label}: ${context.raw}%`
        }
      }
    },
    maintainAspectRatio: false,
  };

  const benchmarkChartData = {
    labels: ['Your Score', 'Industry Benchmark(70%<)'],
    datasets: [
      {
        data: [userScore, benchmarkScore],
        backgroundColor: ['#3b82f6', '#fcd34d'], // blue, yellow
        borderRadius: 4,
        barThickness: 80,
      }
    ]
  };

  const benchmarkChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1e293b',
        bodyFont: { size: 14, family: 'Inter' },
        padding: 12,
        callbacks: {
          label: (context) => ` Score: ${context.raw}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 80, // setting max slightly above 70 to match image perspective
        title: {
          display: true,
          text: 'ATS SCORE',
          color: '#f8fafc',
          font: { family: 'Inter', weight: 'bold', size: 14 }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: { color: '#94a3b8', font: { family: 'Inter' } }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { family: 'Inter' } }
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const startProgressSimulation = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setAnalysisProgress(1);
    progressIntervalRef.current = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 95) return 95;
        let increment = 1;
        if (prev < 20) {
          increment = Math.floor(Math.random() * 3) + 2; // 2-4%
        } else if (prev < 50) {
          increment = Math.floor(Math.random() * 2) + 1; // 1-2%
        } else if (prev < 75) {
          increment = Math.floor(Math.random() * 2) + 1; // 1-2%
        } else if (prev < 90) {
          increment = 1;
        } else {
          increment = Math.random() > 0.5 ? 1 : 0; // slowly crawl up to 95%
        }
        return Math.min(prev + increment, 95);
      });
    }, 120);
  };

  const completeProgress = (onDone) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setAnalysisProgress(100);
    setTimeout(() => {
      if (onDone) onDone();
      setLoading(false);
      setAnalysisProgress(0);
    }, 500);
  };

  const cancelProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setAnalysisProgress(0);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    startProgressSimulation();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        completeProgress(() => {
          setResult(data.data);
          if (data.data.parsed_content?.ats_score) {
            setUserScore(data.data.parsed_content.ats_score);
          }
          fetchHistory();
        });
      } else {
        cancelProgress();
        setLoading(false);
        setError(data.message || "An error occurred during analysis.");
      }
    } catch (err) {
      cancelProgress();
      setLoading(false);
      setError("Failed to connect to the server. Is the backend running?");
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setImageResult(null);
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile) return;
    setIsAnalyzingImage(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('user_id', userId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze/image`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        setImageResult(data.data.feedback_data);
        setImagePreview(`${API_BASE_URL}${data.data.image_path}`);
        fetchImageHistory();
      } else {
        setError(data.message || 'Image analysis failed.');
      }
    } catch (err) {
      setError('Could not connect to server.');
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleTargetedScanSubmit = async () => {
    if (!jobTitle || !jobDescription) return;
    setIsAnalyzingTargeted(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze/targeted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          job_title: jobTitle,
          job_description: jobDescription
        })
      });
      const data = await response.json();
      if (response.ok) {
        setTargetedResult(data.data);
        setCareerMode('TARGETED');
        localStorage.setItem(`careerMode_${userId}`, 'TARGETED');
        setActiveTab('CAREER');
        setShowTargetedModal(false);
      } else {
        setError(data.message || 'Targeted analysis failed.');
      }
    } catch (err) {
      setError('Could not connect to server.');
    } finally {
      setIsAnalyzingTargeted(false);
    }
  };


  const handleDiscoveryScanSubmit = async () => {
    setIsAnalyzingDiscovery(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze/discovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      const data = await response.json();
      if (response.ok && data.data) {
        setDiscoveryResult(data.data.results_data);
        setCareerMode('DISCOVERY');
        localStorage.setItem(`careerMode_${userId}`, 'DISCOVERY');
        setActiveTab('CAREER');
      } else {
        setError(data.message || 'Discovery scan failed.');
      }
    } catch (err) {
      setError('Could not connect to server.');
    } finally {
      setIsAnalyzingDiscovery(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/new uthm.png" alt="UTHM Logo" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          <a 
            href="#" 
            className={`nav-link nav-header ${activeTab === 'USER HUB' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('USER HUB'); }}
          >
            USER HUB
          </a>
          <a 
            href="#" 
            className={`nav-link ${activeTab === 'DASHBOARD' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('DASHBOARD'); }}
          >
            DASHBOARD
          </a>
          <a 
            href="#" 
            className={`nav-link ${activeTab === 'CAREER' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('CAREER'); }}
          >
            CAREER
          </a>
          <a 
            href="#" 
            className={`nav-link ${activeTab === 'BENCHMARK' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('BENCHMARK'); }}
          >
            BENCHMARK
          </a>
          <a 
            href="#" 
            className={`nav-link ${activeTab === 'IMAGE' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('IMAGE'); }}
          >
            IMAGE
          </a>
        </nav>
        <div className="sidebar-footer">
          <div className="db-indicator" style={{ marginBottom: '1rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: dbStatus.connected ? (dbStatus.provider === 'Supabase' ? '#10b981' : '#3b82f6') : '#ef4444',
              boxShadow: dbStatus.connected ? `0 0 8px ${dbStatus.provider === 'Supabase' ? '#10b981' : '#3b82f6'}` : 'none'
            }}></span>
            {dbStatus.connected ? `${dbStatus.provider} Active` : 'DB Disconnected'}
          </div>
          <button onClick={onLogout} className="btn-logout">⏻ Log out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'USER HUB' && (
          <>
            <header className="content-header">
              <h1 style={{ textTransform: 'none' }}>Welcome, <span className="gradient-text">{username}</span></h1>
            </header>

            <section className="dashboard-grid">
              {/* Chart Section */}
              <div className="glass-panel chart-panel">
                <h3 className="section-title">RESUME IMPROVEMENT TREND</h3>
                <div className="chart-container">
                  {chartData.datasets.length > 0 && (
                    <Line ref={chartRef} data={chartData} options={chartOptions} />
                  )}
                </div>
              </div>

              {/* Upload Section */}
              <div className="glass-panel upload-panel">
                <div className="upload-zone">
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileChange} 
                    className="file-input"
                    id="resume-upload"
                  />
                  <label htmlFor="resume-upload" className="upload-label">
                    <div className="upload-icon">☁️</div>
                    <div className="upload-text">Drag & Drop your resume (PDF) or Click to Upload</div>
                  </label>
                </div>
                
                {file && (
                  <div className="file-status">
                    Selected: <span className="text-accent">{file.name}</span>
                  </div>
                )}
                
                {error && (
                  <div className="error-banner">
                    {typeof error === 'string' && (error.toLowerCase().includes('extract text') || error.toLowerCase().includes('failed to extract')) ? (
                      <>
                        Failed to extract text from the PDF.{' '}
                        <button 
                          type="button" 
                          className="know-why-btn" 
                          onClick={() => setShowExtractionModal(true)}
                          title="Click to understand why PDF parsing failed and view solutions"
                        >
                          Know why
                        </button>
                      </>
                    ) : (
                      error
                    )}
                  </div>
                )}

                <button 
                  className={`btn-analyze ${loading ? 'btn-analyze-in-progress' : ''}`} 
                  onClick={handleUpload} 
                  disabled={loading || !file}
                >
                  {loading ? (
                    <>
                      <div 
                        className="btn-analyze-progress-fill" 
                        style={{ width: `${Math.max(analysisProgress, 2)}%` }}
                      />
                      <span className="btn-analyze-progress-content">
                        {analysisProgress === 100 ? (
                          <>
                            <span className="btn-analyze-check">✓</span>
                            <span>COMPLETE 100%</span>
                          </>
                        ) : (
                          <>
                            <span className="btn-analyze-spinner">⚡</span>
                            <span>ANALYZING...</span>
                            <span className="btn-analyze-percent-num">{analysisProgress}%</span>
                          </>
                        )}
                      </span>
                    </>
                  ) : (
                    "RUN GENERAL ANALYSIS"
                  )}
                </button>

                {loading && (
                  <div className="btn-analyze-status-subtext fade-in-up">
                    <span className="status-dot-pulse"></span>
                    <span>
                      {analysisProgress < 25 && "Stage 1/4: Extracting PDF text & structure coordinates..."}
                      {analysisProgress >= 25 && analysisProgress < 55 && "Stage 2/4: Gemini deep neural parsing in progress..."}
                      {analysisProgress >= 55 && analysisProgress < 80 && "Stage 3/4: Classifying sections & verifying ATS skills..."}
                      {analysisProgress >= 80 && analysisProgress < 95 && "Stage 4/4: Computing ATS benchmark compatibility..."}
                      {analysisProgress >= 95 && analysisProgress < 100 && "Finalizing comprehensive report..."}
                      {analysisProgress === 100 && "Report ready! Loading dashboard..."}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Scanning Progress Loader */}
            {loading && (
              <section className="glass-panel scanning-loader-panel fade-in-up">
                <div className="scanning-pulse-circle">
                  {analysisProgress === 100 ? (
                    <span className="scanning-check-icon">✓</span>
                  ) : (
                    <span className="scanning-percent-number">{analysisProgress}%</span>
                  )}
                </div>
                <h3 className="scanning-title">
                  {analysisProgress === 100 ? "Analysis Complete!" : "AI ATS Scanner in Progress..."}
                </h3>
                <p className="scanning-subtitle">
                  {analysisProgress < 25 && "Extracting text structure and layout coordinates from your PDF..."}
                  {analysisProgress >= 25 && analysisProgress < 55 && "Running Deep Gemini AI model to analyze semantic content and experience..."}
                  {analysisProgress >= 55 && analysisProgress < 80 && "Classifying sections, identifying core skills, and verifying ATS keyword taxonomy..."}
                  {analysisProgress >= 80 && analysisProgress < 95 && "Calculating benchmark compatibility score and formatting actionable recommendations..."}
                  {analysisProgress >= 95 && analysisProgress < 100 && "Finalizing comprehensive analysis report..."}
                  {analysisProgress === 100 && "All done! Generating your detailed dashboard report..."}
                </p>

                {/* Progress Bar Container */}
                <div className="scanning-progress-bar-container">
                  <div className="scanning-progress-bar-header">
                    <span className="progress-label-text">
                      {analysisProgress < 25 && "Stage 1/4: Text Extraction"}
                      {analysisProgress >= 25 && analysisProgress < 55 && "Stage 2/4: Gemini Neural Parsing"}
                      {analysisProgress >= 55 && analysisProgress < 80 && "Stage 3/4: Section Classification"}
                      {analysisProgress >= 80 && analysisProgress < 95 && "Stage 4/4: ATS Scoring"}
                      {analysisProgress >= 95 && analysisProgress < 100 && "Finalizing Report"}
                      {analysisProgress === 100 && "Complete"}
                    </span>
                    <span className="progress-percent-badge">{analysisProgress}%</span>
                  </div>
                  <div className="scanning-progress-track">
                    <div 
                      className="scanning-progress-fill" 
                      style={{ width: `${Math.max(analysisProgress, 2)}%` }}
                    >
                      <div className="progress-light-glow"></div>
                    </div>
                  </div>
                </div>

                <div className="scanning-steps">
                  <span className={`scanning-step-item ${analysisProgress > 25 ? 'completed' : analysisProgress >= 1 ? 'active' : ''}`}>
                    {analysisProgress > 25 ? '✓' : '📄'} 1. PDF Text Extraction
                  </span>
                  <span className={`scanning-step-item ${analysisProgress > 55 ? 'completed' : analysisProgress >= 25 ? 'active' : ''}`}>
                    {analysisProgress > 55 ? '✓' : '🧠'} 2. Deep Gemini Analysis
                  </span>
                  <span className={`scanning-step-item ${analysisProgress > 80 ? 'completed' : analysisProgress >= 55 ? 'active' : ''}`}>
                    {analysisProgress > 80 ? '✓' : '📇'} 3. Section Classification
                  </span>
                  <span className={`scanning-step-item ${analysisProgress >= 95 ? 'completed' : analysisProgress >= 80 ? 'active' : ''}`}>
                    {analysisProgress >= 95 ? '✓' : '📊'} 4. ATS Scoring & Diagnostics
                  </span>
                </div>
              </section>
            )}

            {/* Results Section (Only shows when results are parsed and available) */}
            {!loading && result && (parsedContent || (result.extracted_text && result.extracted_text.trim())) && (
              <section className="glass-panel results-panel fade-in-up" ref={resultsRef}>
                <div className="results-header-container">
                  <h2 className="section-title" style={{ textAlign: 'left', margin: 0 }}>Analysis Results</h2>
                  
                  {/* Results SubTabs for Easy Navigation & Responsiveness */}
                  <div className="results-subtabs">
                    <button 
                      className={`subtab-btn ${resultsSubTab === 'ALL' ? 'active' : ''}`}
                      onClick={() => setResultsSubTab('ALL')}
                    >
                      <span>📑</span> Full Report
                    </button>
                    <button 
                      className={`subtab-btn ${resultsSubTab === 'SECTIONS' ? 'active' : ''}`}
                      onClick={() => setResultsSubTab('SECTIONS')}
                    >
                      <span>🗂️</span> Classified Resume
                    </button>
                    <button 
                      className={`subtab-btn ${resultsSubTab === 'DIAGNOSTICS' ? 'active' : ''}`}
                      onClick={() => setResultsSubTab('DIAGNOSTICS')}
                    >
                      <span>💡</span> ATS Diagnostics
                    </button>
                    <button 
                      className={`subtab-btn ${resultsSubTab === 'RAW' ? 'active' : ''}`}
                      onClick={() => setResultsSubTab('RAW')}
                    >
                      <span>📄</span> Raw Text
                    </button>
                  </div>
                </div>
                
                {/* Metric Summary Cards (Always visible for fast overview) */}
                <div className="results-grid" style={{ width: '100%', marginBottom: '2rem' }}>
                  <div className="result-card">
                    <h3>ATS Parseability</h3>
                    <div className={`status-badge ${result.ats_parseability ? 'success' : 'danger'}`}>
                      {result.ats_parseability ? 'PASSED' : 'FAILED'}
                    </div>
                  </div>
                  {parsedContent && (
                    <>
                      <div className="result-card">
                        <h3>ATS Score Estimate</h3>
                        <div className="status-badge success" style={{ color: 'var(--accent-cyan)' }}>
                          {parsedContent.ats_score || 0}/100
                        </div>
                      </div>
                      <div className="result-card">
                        <h3>Action Verbs</h3>
                        <div className="status-badge success" style={{ color: 'var(--accent-purple)' }}>
                          {parsedContent.action_verbs_count || 0} found
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* 1. CLASSIFIED RESUME SECTIONS VIEW */}
                {parsedContent && (resultsSubTab === 'ALL' || resultsSubTab === 'SECTIONS') && (
                  <div className="parsed-content-preview" style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                      <h3 style={{ color: 'var(--accent-blue-light)', fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'left', margin: 0 }}>
                        Scanned Resume Details & Section Classification
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                        Mode: {result.parsed_method === 'ai' ? '🤖 AI Enhanced Scan' : '⚡ Heuristic Scan'}
                      </span>
                    </div>

                    {/* Section Overview Status Badges */}
                    <div className="section-classification-pills">
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Sections Classified:</span>
                      <span className={`section-pill ${personalInfo.full_name || personalInfo.email ? 'detected' : 'missing'}`}>
                        👤 Personal Info {personalInfo.full_name || personalInfo.email ? '✓' : '—'}
                      </span>
                      <span className={`section-pill ${parsedContent.summary ? 'detected' : 'missing'}`}>
                        📝 Summary {parsedContent.summary ? '✓' : '—'}
                      </span>
                      <span className={`section-pill ${parsedContent.work_experience?.length ? 'detected' : 'missing'}`}>
                        💼 Experience {parsedContent.work_experience?.length ? `(${parsedContent.work_experience.length})` : '—'}
                      </span>
                      <span className={`section-pill ${parsedContent.education?.length ? 'detected' : 'missing'}`}>
                        🎓 Education {parsedContent.education?.length ? `(${parsedContent.education.length})` : '—'}
                      </span>
                      <span className={`section-pill ${parsedContent.skills?.length ? 'detected' : 'missing'}`}>
                        ⚡ Skills {parsedContent.skills?.length ? `(${parsedContent.skills.length})` : '—'}
                      </span>
                      <span className={`section-pill ${parsedContent.projects?.length ? 'detected' : 'missing'}`}>
                        🚀 Projects {parsedContent.projects?.length ? `(${parsedContent.projects.length})` : '—'}
                      </span>
                      <span className={`section-pill ${parsedContent.certifications?.length ? 'detected' : 'missing'}`}>
                        📜 Certifications {parsedContent.certifications?.length ? `(${parsedContent.certifications.length})` : '—'}
                      </span>
                    </div>
                    
                    {/* 1. PERSONAL INFORMATION SECTION */}
                    <div className="personal-info-card">
                      <div className="personal-info-header">
                        <div className="personal-info-title">
                          <span>👤</span>
                          <span>Personal & Contact Information</span>
                        </div>
                        <span className="personal-info-badge">
                          <span>✓</span> ATS Scanned
                        </span>
                      </div>

                      <div className="info-grid">
                        {/* Full Name */}
                        <div className="info-item">
                          <div className="info-icon">👤</div>
                          <div className="info-body">
                            <span className="info-label">Full Name</span>
                            <span className={`info-value ${!personalInfo.full_name ? 'not-detected' : ''}`}>
                              {personalInfo.full_name || 'Not detected in resume'}
                            </span>
                          </div>
                        </div>

                        {/* Email Address */}
                        <div className="info-item">
                          <div className="info-icon">✉️</div>
                          <div className="info-body">
                            <span className="info-label">Email Address</span>
                            <span className={`info-value ${!personalInfo.email ? 'not-detected' : ''}`}>
                              {personalInfo.email ? (
                                <a href={`mailto:${personalInfo.email}`}>{personalInfo.email}</a>
                              ) : (
                                'Not detected in resume'
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Phone Number */}
                        <div className="info-item">
                          <div className="info-icon">📞</div>
                          <div className="info-body">
                            <span className="info-label">Phone Number</span>
                            <span className={`info-value ${!personalInfo.phone ? 'not-detected' : ''}`}>
                              {personalInfo.phone ? (
                                <a href={`tel:${personalInfo.phone}`}>{personalInfo.phone}</a>
                              ) : (
                                'Not detected in resume'
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Address / Location */}
                        <div className="info-item">
                          <div className="info-icon">📍</div>
                          <div className="info-body">
                            <span className="info-label">Address / Location</span>
                            <span className={`info-value ${!personalInfo.address ? 'not-detected' : ''}`}>
                              {personalInfo.address || 'Not detected in resume'}
                            </span>
                          </div>
                        </div>

                        {/* LinkedIn Profile */}
                        <div className="info-item">
                          <div className="info-icon">💼</div>
                          <div className="info-body">
                            <span className="info-label">LinkedIn</span>
                            <span className={`info-value ${!personalInfo.linkedin ? 'not-detected' : ''}`}>
                              {personalInfo.linkedin ? (
                                typeof personalInfo.linkedin === 'string' && personalInfo.linkedin.startsWith('http') ? (
                                  <a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer">
                                    {personalInfo.linkedin}
                                  </a>
                                ) : (
                                  personalInfo.linkedin
                                )
                              ) : (
                                'Not detected in resume'
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Portfolio / Website */}
                        <div className="info-item">
                          <div className="info-icon">🌐</div>
                          <div className="info-body">
                            <span className="info-label">Portfolio / GitHub / Links</span>
                            <span className={`info-value ${!personalInfo.portfolio ? 'not-detected' : ''}`}>
                              {personalInfo.portfolio ? (
                                typeof personalInfo.portfolio === 'string' && personalInfo.portfolio.startsWith('http') ? (
                                  <a href={personalInfo.portfolio} target="_blank" rel="noopener noreferrer">
                                    {personalInfo.portfolio}
                                  </a>
                                ) : (
                                  personalInfo.portfolio
                                )
                              ) : (
                                'Not detected in resume'
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 2. Professional Summary */}
                    {parsedContent.summary && (
                      <div className="section-classified-card">
                        <div className="section-classified-header">
                          <h4 className="section-classified-title">
                            <span>📝</span>
                            <span>Professional Summary</span>
                          </h4>
                          <span className="section-count-tag">Section Detected</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', textAlign: 'left' }}>{parsedContent.summary}</p>
                      </div>
                    )}

                    {/* 3. Skills */}
                    {parsedContent.skills && parsedContent.skills.length > 0 && (
                      <div className="section-classified-card">
                        <div className="section-classified-header">
                          <h4 className="section-classified-title">
                            <span>⚡</span>
                            <span>Core Competencies & Technical Skills</span>
                          </h4>
                          <span className="section-count-tag">{parsedContent.skills.length} skills detected</span>
                        </div>
                        <div className="keyword-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {parsedContent.skills.map((skill, idx) => (
                            <span key={idx} className="chip chip-success">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. Experience */}
                    {parsedContent.work_experience && parsedContent.work_experience.length > 0 && (
                      <div className="section-classified-card">
                        <div className="section-classified-header">
                          <h4 className="section-classified-title">
                            <span>💼</span>
                            <span>Work Experience</span>
                          </h4>
                          <span className="section-count-tag">{parsedContent.work_experience.length} records</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {parsedContent.work_experience.map((exp, idx) => (
                            <div key={idx} style={{ paddingBottom: idx !== parsedContent.work_experience.length - 1 ? '1rem' : 0, borderBottom: idx !== parsedContent.work_experience.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{exp.title}</strong>
                                <span style={{ color: 'var(--text-accent)', fontSize: '0.9rem' }}>{exp.date_range}</span>
                              </div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', textAlign: 'left' }}>{exp.organization}</div>
                              {exp.description && exp.description.length > 0 && (
                                <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.875rem', listStyleType: 'disc', textAlign: 'left' }}>
                                  {exp.description.map((bullet, bIdx) => (
                                    <li key={bIdx} style={{ marginBottom: '0.25rem' }}>{bullet}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 5. Education */}
                    {parsedContent.education && parsedContent.education.length > 0 && (
                      <div className="section-classified-card">
                        <div className="section-classified-header">
                          <h4 className="section-classified-title">
                            <span>🎓</span>
                            <span>Education History</span>
                          </h4>
                          <span className="section-count-tag">{parsedContent.education.length} records</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {parsedContent.education.map((edu, idx) => (
                            <div key={idx} style={{ paddingBottom: idx !== parsedContent.education.length - 1 ? '1rem' : 0, borderBottom: idx !== parsedContent.education.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{edu.title}</strong>
                                <span style={{ color: 'var(--text-accent)', fontSize: '0.9rem' }}>{edu.date_range}</span>
                              </div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', textAlign: 'left' }}>{edu.organization}</div>
                              {edu.description && edu.description.length > 0 && (
                                <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.875rem', listStyleType: 'disc', textAlign: 'left' }}>
                                  {edu.description.map((bullet, bIdx) => (
                                    <li key={bIdx} style={{ marginBottom: '0.25rem' }}>{bullet}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 6. Projects */}
                    {parsedContent.projects && parsedContent.projects.length > 0 && (
                      <div className="section-classified-card">
                        <div className="section-classified-header">
                          <h4 className="section-classified-title">
                            <span>🚀</span>
                            <span>Projects & Portfolio</span>
                          </h4>
                          <span className="section-count-tag">{parsedContent.projects.length} projects</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {parsedContent.projects.map((proj, idx) => (
                            <div key={idx} style={{ paddingBottom: idx !== parsedContent.projects.length - 1 ? '1rem' : 0, borderBottom: idx !== parsedContent.projects.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{proj.title}</strong>
                                <span style={{ color: 'var(--text-accent)', fontSize: '0.9rem' }}>{proj.date_range}</span>
                              </div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', textAlign: 'left' }}>{proj.organization}</div>
                              {proj.description && proj.description.length > 0 && (
                                <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.875rem', listStyleType: 'disc', textAlign: 'left' }}>
                                  {proj.description.map((bullet, bIdx) => (
                                    <li key={bIdx} style={{ marginBottom: '0.25rem' }}>{bullet}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 7. Certifications & Languages */}
                    {((parsedContent.certifications && parsedContent.certifications.length > 0) || (parsedContent.languages && parsedContent.languages.length > 0)) && (
                      <div className="section-classified-card">
                        <div className="section-classified-header">
                          <h4 className="section-classified-title">
                            <span>📜</span>
                            <span>Certifications & Languages</span>
                          </h4>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                          {parsedContent.certifications && parsedContent.certifications.length > 0 && (
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem', textAlign: 'left' }}>Certifications</div>
                              <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'left' }}>
                                {parsedContent.certifications.map((cert, cIdx) => (
                                  <li key={cIdx} style={{ marginBottom: '0.25rem' }}>{cert}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {parsedContent.languages && parsedContent.languages.length > 0 && (
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem', textAlign: 'left' }}>Languages</div>
                              <div className="keyword-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {parsedContent.languages.map((lang, lIdx) => (
                                  <span key={lIdx} className="chip" style={{ background: 'rgba(124, 92, 252, 0.15)', color: 'var(--accent-purple)', borderColor: 'rgba(124, 92, 252, 0.3)' }}>{lang}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. ATS DIAGNOSTIC & FEEDBACK VIEW */}
                {parsedContent && (resultsSubTab === 'ALL' || resultsSubTab === 'DIAGNOSTICS') && (
                  <div className="diagnostic-card" style={{ marginBottom: '2.5rem' }}>
                    <div className="personal-info-header">
                      <div className="personal-info-title">
                        <span>💡</span>
                        <span>ATS Analysis Feedback & Actionable Recommendations</span>
                      </div>
                      <span className="personal-info-badge" style={{ background: 'rgba(124, 92, 252, 0.15)', color: 'var(--accent-purple)', borderColor: 'rgba(124, 92, 252, 0.3)' }}>
                        Diagnostic Report
                      </span>
                    </div>

                    <div className="diagnostic-grid">
                      {/* What Needs Fixing */}
                      <div className="feedback-column">
                        <div className="feedback-column-title fixing">
                          <span>🛠️</span>
                          <span>What Needs Fixing</span>
                        </div>
                        {parsedContent.need_fixing && parsedContent.need_fixing.length > 0 ? (
                          <ul className="feedback-list">
                            {parsedContent.need_fixing.map((fix, fIdx) => (
                              <li key={fIdx} className="feedback-list-item warning">
                                <span className="item-bullet">⚠</span>
                                <span>{fix}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No formatting or syntax issues found.</p>
                        )}
                      </div>

                      {/* Missing Information */}
                      <div className="feedback-column">
                        <div className="feedback-column-title missing">
                          <span>⚠️</span>
                          <span>Missing Information</span>
                        </div>
                        {parsedContent.missing_information && parsedContent.missing_information.length > 0 ? (
                          <ul className="feedback-list">
                            {parsedContent.missing_information.map((miss, mIdx) => (
                              <li key={mIdx} className="feedback-list-item danger">
                                <span className="item-bullet">✕</span>
                                <span>{miss}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>All essential ATS sections are present.</p>
                        )}
                      </div>

                      {/* Extracted Core Keywords */}
                      <div className="feedback-column">
                        <div className="feedback-column-title keywords">
                          <span>🔑</span>
                          <span>ATS Keyword Density</span>
                        </div>
                        <div className="keyword-chips">
                          {parsedContent.keywords && parsedContent.keywords.length > 0 ? (
                            parsedContent.keywords.map((kw, kIdx) => (
                              <span key={kIdx} className="chip chip-success" style={{ fontSize: '0.775rem' }}>{kw}</span>
                            ))
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No keywords extracted.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Navigation CTA */}
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Explore in-depth charts, semantic matching, and industry benchmarking:
                      </span>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button 
                          className="btn-view-dashboard"
                          onClick={() => setActiveTab('DASHBOARD')}
                        >
                          <span>📊</span> View Semantic Dashboard →
                        </button>
                        <button 
                          className="btn-view-dashboard btn-view-benchmark"
                          onClick={() => setActiveTab('BENCHMARK')}
                        >
                          <span>🏆</span> View Benchmark →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. EXTRACTED RAW TEXT PREVIEW */}
                {(resultsSubTab === 'ALL' || resultsSubTab === 'RAW') && (
                  <div className="extracted-text-preview">
                    <h3>Extracted Text Verification</h3>
                    <p>Verify below that your multi-column text was read logically.</p>
                    <div className="code-block">
                      {result.extracted_text || "No text extracted."}
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {activeTab === 'DASHBOARD' && (
          <div className="analysis-dashboard fade-in-up">
            <header className="content-header mb-5">
              <h1><span className="gradient-text">Semantic Compatibility Score</span></h1>
            </header>
            
            <div className="dashboard-grid two-columns">
              {/* Left Column */}
              <div className="glass-panel d-col-left flex-col-center">
                <div className="doughnut-container relative">
                   <Doughnut data={doughnutData} options={doughnutOptions} />
                   <div className="doughnut-center-text">
                     <span className="score-value">{currentScore}%</span>
                   </div>
                   {/* Decorative Labels for the chart to match image */}
                   <span className="chart-label-missing">Missing<br/>{missingScore}%</span>
                   <span className="chart-label-fixing">Need Fixing<br/>{fixingScore}%</span>
                   <span className="chart-label-good">Good<br/>{currentScore}%</span>
                </div>
                
                {/* Ranking of Top 3 Highest Resume Scores */}
                <div className="resume-ranking-section mt-5 w-full">
                  <div className="ranking-header mb-3">
                    <div className="ranking-header-title-row">
                      <h3 className="section-title text-left mb-1" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span>🏆</span> TOP RESUME RANKINGS
                      </h3>
                      <span className="ranking-top-count-pill">Top 3 Scored</span>
                    </div>
                    <p className="text-xs text-secondary text-left">
                      Highest performing resumes based on Semantic ATS Compatibility
                    </p>
                  </div>

                  <div className="ranking-list">
                    {topResumes.length === 0 ? (
                      <div className="image-ranking-empty-card">
                        <div className="empty-ranking-icon">📄</div>
                        <div className="empty-ranking-content">
                          <h4 className="empty-ranking-title">No Resumes Analyzed Yet</h4>
                          <p className="empty-ranking-desc">
                            Upload and scan your resume above. Once analyzed, your top 3 highest-scoring ATS resumes and structural document breakdown will appear here.
                          </p>
                        </div>
                      </div>
                    ) : (
                      topResumes.map((item, index) => {
                        const rank = index + 1;
                        const isTop1 = rank === 1;
                        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
                        const rankClass = rank === 1 ? 'rank-card-gold' : rank === 2 ? 'rank-card-silver' : 'rank-card-bronze';
                        const itemThumb = item?.thumbnail || item?.parsed_data?.thumbnail;

                        return (
                          <div key={item.id || index} className={`ranking-card ${rankClass} ${isTop1 ? 'ranking-card-top1' : ''}`}>
                            {/* Card Header Row */}
                            <div className="ranking-card-main">
                              <div className="ranking-badge-col">
                                <span className="ranking-medal">{medal}</span>
                                <span className="ranking-rank-num">#{rank}</span>
                              </div>

                              <div className="ranking-info-col">
                                <div className="ranking-filename-wrap">
                                  <span className="ranking-pdf-icon">📄</span>
                                  <span className="ranking-filename" title={item.filename}>
                                    {item.filename}
                                  </span>
                                </div>
                                <div className="ranking-meta-sub">
                                  <span className="ranking-status-tag">
                                    {rank === 1 ? 'Highest Performing' : rank === 2 ? 'Strong Match' : 'Passing Benchmark'}
                                  </span>
                                  {item.created_at && (
                                    <span className="ranking-date">
                                      • {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="ranking-score-col">
                                <div className="ranking-score-badge">
                                  <span className="ranking-score-val">{item.ats_score || 0}%</span>
                                  <span className="ranking-score-lbl">ATS</span>
                                </div>
                              </div>
                            </div>

                            {/* Top 1 ONLY: File Image Overview */}
                            {isTop1 && (
                              <div className="ranking-top1-overview-wrapper">
                                <div className="overview-header-bar">
                                  <div className="overview-header-left">
                                    <span className="overview-pulse-dot"></span>
                                    <span className="overview-heading-text">TOP #1 FILE IMAGE OVERVIEW</span>
                                  </div>
                                  <span className="overview-top-tag">★ Leaderboard Winner</span>
                                </div>

                                <div 
                                  className="overview-preview-frame"
                                  onClick={() => setShowTop1PreviewModal(true)}
                                  role="button"
                                  tabIndex={0}
                                  title="Click to view expanded document overview"
                                >
                                  {itemThumb ? (
                                    <div className="overview-image-container">
                                      <img 
                                        src={itemThumb} 
                                        alt={`Preview of ${item.filename}`} 
                                        className="overview-real-img"
                                      />
                                      <div className="overview-zoom-hint">
                                        <span>🔍 Click to expand preview</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="overview-visual-document">
                                      {/* Document Header */}
                                      <div className="doc-preview-head">
                                        <div className="doc-avatar-circle">
                                          {(item.parsed_data?.personal_info?.full_name || username || 'U').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="doc-head-details">
                                          <div className="doc-candidate-name">
                                            {item.parsed_data?.personal_info?.full_name || username || 'Candidate Resume'}
                                          </div>
                                          <div className="doc-candidate-sub">
                                            {item.parsed_data?.personal_info?.email || 'Candidate Resume'} • ATS Validated
                                          </div>
                                        </div>
                                        <div className="doc-head-badge">
                                          <span>ATS {item.ats_score}%</span>
                                        </div>
                                      </div>

                                      {/* Mini divider */}
                                      <div className="doc-section-divider"></div>

                                      {/* Core Skills extracted preview */}
                                      <div className="doc-preview-section">
                                        <span className="doc-sec-label">KEY SKILLS DETECTED</span>
                                        <div className="doc-preview-chips">
                                          {(item.parsed_data?.skills || ['Python', 'SQL', 'React', 'FastAPI', 'AI', 'NLP']).slice(0, 6).map((sk, sIdx) => (
                                            <span key={sIdx} className="doc-mini-chip">{sk}</span>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Layout silhouette lines representing document pages */}
                                      <div className="doc-preview-section mt-2">
                                        <span className="doc-sec-label">DOCUMENT LAYOUT MAPPING</span>
                                        <div className="doc-silhouette-grid">
                                          <div className="doc-line line-long"></div>
                                          <div className="doc-line line-medium"></div>
                                          <div className="doc-line line-short"></div>
                                        </div>
                                      </div>

                                      <div className="doc-preview-footer">
                                        <span className="doc-footer-status">✓ Multi-Column Structural Integrity Passed</span>
                                        <span className="doc-footer-click">Click to Expand 🔍</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="glass-panel d-col-right flex-col-justify">
                <div>
                  <div className="ats-badge mb-4">
                    <span className="badge-icon">✓</span> ATS Friendly
                  </div>
                  
                  <div className="score-metrics mb-4">
                    <div className="metric">
                      <div className="metric-label">Format score</div>
                      <div className="metric-value">{currentScore}/100</div>
                    </div>
                    <div className="metric">
                      <div className="metric-label">Keyword density</div>
                      <div className="metric-value">{parsedContent?.keywords?.length > 10 ? 'High' : 'Moderate'}</div>
                    </div>
                    <div className="metric">
                      <div className="metric-label">Action verbs</div>
                      <div className="metric-value">{parsedContent?.action_verbs_count || 0} found</div>
                    </div>
                  </div>
                  
                  <p className="generative-feedback mb-4 text-secondary">
                    Your resume is well-structured and parseable. Semantic alignment with the job description is moderate. Key missing terms reduce your match score.
                  </p>

                  {/* PRESCRIPTIVE KEYWORD FEEDBACK (Moved above TEXT SCAN RESULTS as requested) */}
                  <div className="prescriptive-feedback mb-5 w-full">
                    <h3 className="section-title text-left mb-2" style={{ marginBottom: '0.4rem' }}>
                      PRESCRIPTIVE KEYWORD FEEDBACK
                    </h3>
                    <p className="text-sm text-secondary mb-3">Found in your resume</p>
                    <div className="keyword-chips">
                      {parsedContent?.keywords?.map((kw, i) => (
                        <span key={`kw-${i}`} className="chip chip-success">{kw}</span>
                      )) || <span className="chip chip-success">No keywords extracted</span>}
                    </div>
                  </div>
                  
                  {/* TEXT SCAN RESULTS */}
                  <div className="text-scan-results mb-4">
                    <h3 className="section-title text-left mb-3">TEXT SCAN RESULTS</h3>
                    <ul className="scan-list">
                      <li className="scan-item success">{parsedContent?.action_verbs_count || 0} strong action verbs detected</li>
                      <li className={`scan-item ${parsedContent?.education?.length ? 'success' : 'danger'}`}>
                        {parsedContent?.education?.length ? 'Education section properly parsed' : 'No education section found'}
                      </li>
                      <li className={`scan-item ${parsedContent?.skills?.length ? 'success' : 'warning mt-3'}`}>
                        {parsedContent?.skills?.length ? `${parsedContent.skills.length} core skills detected` : 'Skills section missing or too generic'}
                      </li>
                      <li className={`scan-item ${parsedContent?.summary ? 'success' : 'danger'}`}>
                        {parsedContent?.summary ? 'Professional summary found' : 'No summary/objective section found'}
                      </li>
                      {parsedContent?.missing_information?.map((msg, i) => (
                        <li key={`miss-info-${i}`} className="scan-item danger">{msg}</li>
                      ))}
                      {parsedContent?.need_fixing?.map((msg, i) => (
                        <li key={`fix-info-${i}`} className="scan-item warning">{msg}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'CAREER' && careerMode === null && (
          <div className="career-dashboard fade-in-up">
            <header className="content-header mb-5" style={{ textAlign: 'left' }}>
              <h1 className="career-selector-title">Career Analysis Selector</h1>
              <p className="career-selector-desc">Select matching analysis mode for your current resume.</p>
            </header>

            <div className="career-selector-cards-grid">
              {/* Card 1: Targeted Scan */}
              <div className="career-hero-card career-card-targeted">
                <div className="career-card-ambient-glow"></div>
                <div className="career-hero-content">
                  <div className="career-badge-row">
                    <span className="career-mode-badge targeted-badge">
                      <span className="badge-glow-dot"></span>
                      TARGETED MATCHING
                    </span>
                    <span className="career-badge-tag">Role-Specific</span>
                  </div>

                  <h2 className="career-hero-title">Targeted Scan</h2>
                  <p className="career-hero-desc">
                    Match your resume against a specific job role and description. Get a semantic compatibility score, identify missing critical keywords, and receive tailored improvement advice.
                  </p>

                  <div className="career-instructions-box">
                    <div className="career-instructions-header-row">
                      <span className="instructions-icon">📋</span>
                      <h4 className="career-instructions-heading">How to use:</h4>
                    </div>
                    <ol className="career-instructions-list">
                      <li>
                        <span className="step-num-pill">1</span>
                        <span className="step-text">Go to any Job finding website (example Jobstreet)</span>
                      </li>
                      <li>
                        <span className="step-num-pill">2</span>
                        <span className="step-text">Click on the Start Targeted Scan Button</span>
                      </li>
                      <li>
                        <span className="step-num-pill">3</span>
                        <span className="step-text">Copy the Job title and paste it in the given column</span>
                      </li>
                      <li>
                        <span className="step-num-pill">4</span>
                        <span className="step-text">Copy the Job Description and paste it in the given column</span>
                      </li>
                    </ol>
                    <div className="career-instructions-note-pill">
                      <span className="note-star">💡</span>
                      <span className="career-instructions-note">
                        Notes: more job description given give more accurate score
                      </span>
                    </div>
                  </div>

                  <div className="career-hero-image-wrap">
                    <div className="preview-window-bar">
                      <div className="window-dots">
                        <span className="w-dot red"></span>
                        <span className="w-dot yellow"></span>
                        <span className="w-dot green"></span>
                      </div>
                      <span className="window-title">Jobstreet Position & Description Mapping</span>
                    </div>
                    <div className="image-inner-container">
                      <img 
                        src="/targetedscan.png" 
                        alt="Targeted Scan Example" 
                        className="career-hero-image" 
                      />
                    </div>
                  </div>
                </div>

                <div className="career-hero-btn-wrap">
                  <button 
                    className="career-hero-btn" 
                    onClick={() => setShowTargetedModal(true)}
                  >
                    <span>Start Targeted Scan</span>
                    <span className="btn-arrow-icon">→</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Discovery Scan */}
              <div className="career-hero-card career-card-discovery">
                <div className="career-card-ambient-glow"></div>
                <div className="career-hero-content">
                  <div className="career-badge-row">
                    <span className="career-mode-badge discovery-badge">
                      <span className="badge-glow-dot"></span>
                      AI DISCOVERY
                    </span>
                    <span className="career-badge-tag">Automatic Match</span>
                  </div>

                  <h2 className="career-hero-title">Discovery Scan</h2>
                  <p className="career-hero-desc">
                    Let AI analyze your resume to automatically match you with different job roles (e.g. Data Analyst, ML Engineer, Full-Stack Dev). Highlights skill gaps and provides additions for your resume.
                  </p>

                  <div className="career-instructions-box">
                    <div className="career-instructions-header-row">
                      <span className="instructions-icon">⚡</span>
                      <h4 className="career-instructions-heading">How to use:</h4>
                    </div>
                    <ol className="career-instructions-list">
                      <li>
                        <span className="step-num-pill">1</span>
                        <span className="step-text">Click on the Start Discovery Button</span>
                      </li>
                      <li>
                        <span className="step-num-pill">2</span>
                        <span className="step-text">The system will use your resume highlights the keyword for semantic score match</span>
                      </li>
                      <li>
                        <span className="step-num-pill">3</span>
                        <span className="step-text">The system will shows top 3 most relevant jobs related to your resume</span>
                      </li>
                    </ol>
                  </div>

                  <div className="career-hero-image-wrap">
                    <div className="preview-window-bar">
                      <div className="window-dots">
                        <span className="w-dot red"></span>
                        <span className="w-dot yellow"></span>
                        <span className="w-dot green"></span>
                      </div>
                      <span className="window-title">AI Multi-Role Match Results</span>
                    </div>
                    <div className="image-inner-container">
                      <img 
                        src="/discoveryscan.png" 
                        alt="Discovery Scan Example" 
                        className="career-hero-image" 
                      />
                    </div>
                  </div>
                </div>

                <div className="career-hero-btn-wrap">
                  <button 
                    className="career-hero-btn" 
                    onClick={handleDiscoveryScanSubmit}
                    disabled={isAnalyzingDiscovery}
                  >
                    <span>{isAnalyzingDiscovery ? "Analyzing..." : "Start Discovery Scan"}</span>
                    {!isAnalyzingDiscovery && <span className="btn-arrow-icon">→</span>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'CAREER' && careerMode === 'TARGETED' && (
          <div className="career-dashboard fade-in-up">
            <header className="content-header mb-5" style={{ textAlign: 'left' }}>
              <h1 className="targeted-results-title">
                Targeted Match Results for <span style={{ fontWeight: 700 }}>{targetedResult ? targetedResult.job_title : (jobTitle || 'Software Engineer')}</span>
              </h1>
            </header>
            
            <div className="career-top-section">
              {/* Doughnut Chart */}
              <div className="career-chart-container">
                 <div className="doughnut-container relative" style={{ width: '260px', height: '260px' }}>
                   <Doughnut 
                     data={{
                       labels: ['Match', 'Missing'],
                       datasets: [{
                         data: [
                           targetedResult ? targetedResult.compatibility_score : 56,
                           targetedResult ? 100 - targetedResult.compatibility_score : 44
                         ],
                         backgroundColor: ['#3b82f6', 'rgba(255,255,255,0.05)'],
                         borderWidth: 0,
                         cutout: '75%',
                       }]
                     }} 
                     options={{ maintainAspectRatio: false, plugins: { tooltip: { enabled: false }, legend: { display: false } }, interaction: { mode: null } }} 
                   />
                   <div className="doughnut-center-text" style={{ fontSize: '3.5rem' }}>
                     {targetedResult ? targetedResult.compatibility_score : 56}%
                   </div>
                 </div>
              </div>

              {/* Skills and Info */}
              <div className="career-info-container">
                <div className="mb-4">
                  <h3 className="targeted-score-label">Targeted Compatibility Score</h3>
                  <p className="targeted-score-sub">
                    {targetedResult ? `Status: ${targetedResult.feedback_data.match_status}` : '(Cosine Similarity Analysis)'}
                  </p>
                </div>
                
                <div className="skill-boxes-grid">
                  <div className="skill-box skill-box-success">
                    <h4 className="skill-box-title">Skill Highlight</h4>
                    <div className="keyword-chips mt-3">
                      {targetedResult ? (
                        targetedResult.feedback_data.matched_skills.map((s, idx) => (
                          <span key={idx} className="chip chip-success">{s}</span>
                        ))
                      ) : (
                        <>
                          <span className="chip chip-success">Python</span>
                          <span className="chip chip-success">Excel</span>
                          <span className="chip chip-success">Java</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="skill-box skill-box-danger">
                    <h4 className="skill-box-title">Missing Critical Keywords</h4>
                    <div className="keyword-chips mt-3">
                      {targetedResult ? (
                        targetedResult.feedback_data.missing_keywords.map((s, idx) => (
                          <span key={idx} className="chip chip-danger">{s}</span>
                        ))
                      ) : (
                        <>
                          <span className="chip chip-danger">UI/UX</span>
                          <span className="chip chip-danger">AWS</span>
                          <span className="chip chip-danger">Cloud</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="strategy-panel mt-5">
              <div className="strategy-header">
                <span className="strategy-icon">💡</span>
                <h3 className="strategy-title">Resume Strategy Enhancement</h3>
              </div>
              <p className="strategy-desc">
                {targetedResult ? targetedResult.feedback_data.reasoning : (
                  <>
                    To significantly improve your <strong>match rate</strong>, consider <strong>adding</strong> experience with the <strong>missing keywords</strong>. For instance, if you have worked with these technologies in projects, ensure you state:
                  </>
                )}
              </p>
              
              {targetedResult ? (
                <div className="strategy-example-box mt-4">
                  <p className="example-label">Recommendations for improvement:</p>
                  <ul style={{ paddingLeft: '1.2rem', color: '#334155', listStyleType: 'disc', marginTop: '0.5rem' }}>
                    {targetedResult.feedback_data.recommendations.map((rec, idx) => (
                      <li key={idx} style={{ marginBottom: '0.5rem', lineHeight: '1.5', fontSize: '0.95rem' }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="strategy-example-box mt-4">
                  <p className="example-label">Example:</p>
                  <p className="example-text">
                    "Analyzed large Datasets using <strong>Tableau</strong> to extract insights for company decision-making in <strong>cloud-hosted</strong> environment on <strong>AWS</strong>"
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex-end mt-5" style={{ gap: '1rem' }}>
               <button 
                 className="btn-action btn-discovery" 
                 onClick={() => {
                   setCareerMode(null);
                   localStorage.removeItem(`careerMode_${userId}`);
                 }}
               >
                 Switch Scan Mode
               </button>
               <button className="btn-action btn-targeted" onClick={() => setActiveTab('BENCHMARK')}>BENCHMARK</button>
            </div>
          </div>
        )}


        {activeTab === 'CAREER' && careerMode === 'DISCOVERY' && (
          <div className="discovery-dashboard fade-in-up">
            <header className="content-header mb-5" style={{ textAlign: 'left' }}>
              <h1 style={{ display: 'inline-block', fontWeight: 800, fontSize: '2.2rem', textTransform: 'uppercase' }}>
                <span className="gradient-text">DISCOVERY MATCH RESULT</span>
              </h1>
            </header>

            {!discoveryResult ? (
              <div className="glass-panel text-center p-5">
                <p className="text-secondary">Loading your career matches...</p>
              </div>
            ) : (
              <div className="discovery-cards-grid">
                {discoveryResult.map((job, idx) => {
                  const cardClass = idx === 0 ? "card-primary" : idx === 1 ? "card-secondary" : "card-tertiary";
                  const fillClass = idx === 0 ? "fill-primary" : idx === 1 ? "fill-secondary" : "fill-tertiary";
                  const textClass = idx === 0 ? "" : idx === 1 ? "secondary-text" : "tertiary-text";
                  const icon = idx === 0 ? "📊" : idx === 1 ? "🤖" : "🌐";

                  return (
                    <div key={idx} className={`discovery-card ${cardClass}`}>
                      <div className="card-icon-wrapper mb-3">
                        <span className="card-icon">{icon}</span>
                      </div>
                      {idx === 0 && <div className="best-match-badge mb-3">Best match</div>}
                      <h3 className="card-title">{job.job_title}</h3>
                      <p className="card-subtitle mb-4" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '3.6rem' }}>
                        {job.job_description}
                      </p>
                      
                      <div className="match-score-row mb-2">
                        <span className={`match-percent ${textClass}`}>{job.match_score}%</span>
                        <span className="match-text">match</span>
                      </div>
                      
                      <div className="skill-gap-container mb-4">
                        <div className="skill-gap-label">
                          <span>Skill gap</span>
                          <span>{100 - job.match_score}%</span>
                        </div>
                        <div className="skill-gap-bar">
                          <div className={`skill-gap-fill ${fillClass}`} style={{ width: `${job.match_score}%` }}></div>
                        </div>
                      </div>

                      <div className="add-resume-section mb-4">
                        <p className="add-resume-title">Missing to add to your resume:</p>
                        <div className="keyword-chips-small">
                          {job.missing_keywords && job.missing_keywords.length > 0 ? (
                            job.missing_keywords.slice(0, 3).map((kw, kIdx) => (
                              <span key={kIdx} className={`chip-small ${idx === 0 ? 'chip-primary' : idx === 1 ? 'chip-secondary' : 'chip-tertiary'}`}>{kw}</span>
                            ))
                          ) : (
                            <span className="chip-small" style={{ background: 'rgba(255,255,255,0.1)' }}>None</span>
                          )}
                        </div>
                      </div>

                      <button 
                        className="btn-view-more mt-auto" 
                        onClick={() => setSelectedJobReasoning({
                          title: job.job_title,
                          reasoning: `Your resume shows matching skills in: ${job.matched_skills.join(', ') || 'none'}. To close the ${100 - job.match_score}% skill gap, consider gaining experience in and adding the missing keywords: ${job.missing_keywords.join(', ') || 'none'}.`
                        })}
                      >
                        View more..
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex-end mt-5" style={{ gap: '1rem' }}>
               <button 
                 className="btn-action btn-discovery" 
                 onClick={() => {
                   setCareerMode(null);
                   localStorage.removeItem(`careerMode_${userId}`);
                 }}
               >
                 Switch Scan Mode
               </button>
               <button className="btn-action btn-targeted" onClick={() => setActiveTab('BENCHMARK')}>BENCHMARK</button>
            </div>
          </div>
        )}

        {activeTab === 'BENCHMARK' && (
          <div className="benchmark-dashboard fade-in-up">
            <div className="benchmark-ambient-glow"></div>

            <header className="benchmark-header">
              <div className="benchmark-tag-badge">
                <span className="benchmark-tag-dot"></span>
                <span>Industry Comparative Analysis • ATS Threshold</span>
              </div>
              <h1 className="benchmark-title">
                <span className="gradient-text">MARKET READINESS BENCHMARKING</span>
              </h1>
            </header>

            {/* 3-Card KPI Comparative Summary HUD */}
            <div className="benchmark-kpi-grid">
              <div className="benchmark-kpi-card kpi-card-user">
                <div className="kpi-top-row">
                  <span className="kpi-label">Your Resume Score</span>
                  <span className="kpi-icon-pill">📄</span>
                </div>
                <div className="kpi-value-row">
                  <span className="kpi-number num-blue">{userScore}</span>
                  <span className="kpi-unit">%</span>
                </div>
                <div className="kpi-status-sub">
                  <span>{userScore >= benchmarkScore ? '✅ Passed ATS Threshold' : '⚠️ Below Passing Cutoff'}</span>
                </div>
              </div>

              <div className="benchmark-kpi-card kpi-card-target">
                <div className="kpi-top-row">
                  <span className="kpi-label">Industry Benchmark</span>
                  <span className="kpi-icon-pill">🎯</span>
                </div>
                <div className="kpi-value-row">
                  <span className="kpi-number num-yellow">{benchmarkScore}</span>
                  <span className="kpi-unit">%</span>
                </div>
                <div className="kpi-status-sub">
                  <span>Global ATS Filter Cutoff (70%+)</span>
                </div>
              </div>

              <div className={`benchmark-kpi-card kpi-card-gap ${userScore >= benchmarkScore ? '' : 'gap-negative'}`}>
                <div className="kpi-top-row">
                  <span className="kpi-label">Readiness Gap</span>
                  <span className="kpi-icon-pill">{userScore >= benchmarkScore ? '🚀' : '📊'}</span>
                </div>
                <div className="kpi-value-row">
                  <span className={`kpi-number ${userScore >= benchmarkScore ? 'num-green' : 'num-red'}`}>
                    {userScore >= benchmarkScore ? `+${userScore - benchmarkScore}` : `${userScore - benchmarkScore}`}
                  </span>
                  <span className="kpi-unit">%</span>
                </div>
                <div className="kpi-status-sub">
                  <span>{userScore >= benchmarkScore ? 'Above Market Average' : 'Points Required to Pass'}</span>
                </div>
              </div>
            </div>

            <div className="benchmark-main-content">
              <div className="benchmark-studio-panel">
                <div className="benchmark-panel-bar">
                  <div className="benchmark-bar-left">
                    <div className="benchmark-bar-dots">
                      <span className="w-dot red"></span>
                      <span className="w-dot yellow"></span>
                      <span className="w-dot green"></span>
                    </div>
                    <span className="benchmark-bar-title">ATS SCORE COMPARATIVE VISUALIZATION</span>
                  </div>
                  <div className="benchmark-live-indicator">
                    <span className="badge-glow-dot" style={{ background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
                    <span>LIVE BENCHMARK</span>
                  </div>
                </div>

                <div className="benchmark-chart-inner">
                  <div className="benchmark-chart-container" style={{ height: '360px', width: '100%', maxWidth: '640px', margin: '0 auto' }}>
                    <Bar data={benchmarkChartData} options={benchmarkChartOptions} />
                  </div>
                </div>

                <div className="benchmark-footnote-card">
                  <span className="footnote-icon">ℹ️</span>
                  <p className="benchmark-footnote-text">
                    *Industry Benchmark can be different based on each industry, in general most industry set their ATS benchmark is 70%&gt;
                  </p>
                </div>
              </div>

              {/* Feedback Box */}
              {userScore < benchmarkScore ? (
                <div className="benchmark-verdict-card benchmark-verdict-warning">
                  <div className="verdict-icon-bubble">⚠️</div>
                  <div className="verdict-text-content">
                    <p className="benchmark-feedback-quote">
                      "You are below the benchmark. Most Likely ATS filters will reject this version."
                    </p>
                  </div>
                </div>
              ) : (
                <div className="benchmark-verdict-card benchmark-verdict-success">
                  <div className="verdict-icon-bubble">✅</div>
                  <div className="verdict-text-content">
                    <p className="benchmark-feedback-quote">
                      "Congratulations! You are above the benchmark. Your resume has a high chance of passing standard ATS filters."
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="benchmark-nav-row">
               <button className="benchmark-action-btn" onClick={() => setActiveTab('IMAGE')}>
                 <span>IMAGE</span>
                 <span className="btn-arrow-icon">→</span>
               </button>
            </div>
          </div>
        )}

        {activeTab === 'IMAGE' && (
          <div className="image-dashboard fade-in-up">
            <div className="image-ambient-glow"></div>

            <header className="image-header">
              <div className="image-tag-badge">
                <span className="benchmark-tag-dot" style={{ background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }}></span>
                <span>AI Vision Analysis • Headshot Verification</span>
              </div>
              <h1 className="image-title">
                <span className="gradient-text">FORMAL IMAGE CHECKING</span>
              </h1>
            </header>

            {error && <div className="error-banner" style={{ marginBottom: '2rem', width: '100%' }}>{error}</div>}

            {!imageResult ? (
              <div className="dashboard-grid two-columns" style={{ position: 'relative', zIndex: 1 }}>
                <div className="image-studio-left">
                  <div>
                    <div className="image-section-header">
                      <h2 className="image-checking-title">
                        <span>📸</span> Formal Resume Image Checking
                      </h2>
                      <span className="portrait-verified-pill">Official Standard</span>
                    </div>

                    <div className="image-portraits-row">
                      <div className="image-portrait-card">
                        <img src="/formal image Man.jpg" alt="Formal Man" className="portrait-inner-img" />
                        <div className="portrait-card-badge">
                          <span>✓</span> Reference Standard
                        </div>
                      </div>
                      <div className="image-portrait-card">
                        <img src="/formal image Woman.png" alt="Formal Woman" className="portrait-inner-img" />
                        <div className="portrait-card-badge">
                          <span>✓</span> Reference Standard
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="image-tips-section">
                    <div className="image-tips-header-row">
                      <h3 className="image-tips-title">
                        <span>✨</span> Example & Tips
                      </h3>
                    </div>
                    <ul className="image-tips-grid">
                      <li className="image-tip-card">
                        <div className="tip-icon-box">👔</div>
                        <div className="tip-content-text">
                          <strong>Corporate Attire:</strong> Wear clean, professional business clothing matching your industry.
                        </div>
                      </li>
                      <li className="image-tip-card">
                        <div className="tip-icon-box">👁️</div>
                        <div className="tip-content-text">
                          <strong>Direct Gaze:</strong> Look straight into the camera lens to build instant trust.
                        </div>
                      </li>
                      <li className="image-tip-card">
                        <div className="tip-icon-box">😊</div>
                        <div className="tip-content-text">
                          <strong>Genuine Smile:</strong> Maintain a warm, pleasant, approachable facial expression.
                        </div>
                      </li>
                      <li className="image-tip-card">
                        <div className="tip-icon-box">🖼️</div>
                        <div className="tip-content-text">
                          <strong>Neutral Backdrop:</strong> Use a solid white, light grey, or soft blue background.
                        </div>
                      </li>
                      <li className="image-tip-card">
                        <div className="tip-icon-box">📐</div>
                        <div className="tip-content-text">
                          <strong>Chest-Up Crop:</strong> Frame the shot from your mid-chest to just above your head.
                        </div>
                      </li>
                      <li className="image-tip-card">
                        <div className="tip-icon-box">🔍</div>
                        <div className="tip-content-text">
                          <strong>High Resolution:</strong> Ensure the file is crisp, sharp, and perfectly focused.
                        </div>
                      </li>
                      <li className="image-tip-card">
                        <div className="tip-icon-box">💡</div>
                        <div className="tip-content-text">
                          <strong>Natural Lighting:</strong> Eliminate shadows across your face using soft, even light.
                        </div>
                      </li>
                      <li className="image-tip-card">
                        <div className="tip-icon-box">✂️</div>
                        <div className="tip-content-text">
                          <strong>Clean Grooming:</strong> Keep hair neat and makeup or facial hair tidy.
                        </div>
                      </li>
                      <li className="image-tip-card">
                        <div className="tip-icon-box">🚫</div>
                        <div className="tip-content-text">
                          <strong>No Filters:</strong> Avoid visible mobile editing effects or distracting digital touch-ups.
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="image-studio-right">
                  <div className="biometric-viewfinder-zone">
                    {/* Futuristic Viewfinder Corners */}
                    <span className="reticle-corner corner-tl"></span>
                    <span className="reticle-corner corner-tr"></span>
                    <span className="reticle-corner corner-bl"></span>
                    <span className="reticle-corner corner-br"></span>

                    {/* Animated Scanning Beam */}
                    <div className="biometric-scan-laser"></div>

                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      className="file-input"
                      id="image-upload"
                      style={{ zIndex: 10 }}
                    />
                    {imagePreview ? (
                      <div className="image-preview-frame">
                        <div className="preview-reticle-box">
                          <img src={imagePreview} alt="Preview" className="preview-inner-photo" />
                        </div>
                        <p className="preview-change-hint">
                          <span>🔄</span> Click or drag to change image
                        </p>
                      </div>
                    ) : (
                      <label htmlFor="image-upload" className="upload-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', zIndex: 2 }}>
                        <div className="upload-icon-pulse">↑</div>
                        <div className="upload-text-lead">Upload your image here</div>
                        <p className="upload-text-sub">Supports JPG, PNG or WEBP high-resolution portraits</p>
                      </label>
                    )}
                  </div>
                  
                  {imagePreview && (
                    <button 
                      className="btn-analyze-biometric" 
                      onClick={handleImageUpload} 
                      disabled={isAnalyzingImage}
                    >
                      {isAnalyzingImage ? (
                        <>
                          <span style={{ display: 'inline-block', width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#ffffff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                          <span>ANALYZING...</span>
                        </>
                      ) : (
                        <>
                          <span>ANALYZE IMAGE</span>
                          <span style={{ fontSize: '1.2rem' }}>⚡</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Top 3 Image Rankings */}
                  <div className="image-ranking-section w-full">
                    <div className="ranking-header mb-3">
                      <div className="ranking-header-title-row">
                        <h3 className="section-title text-left mb-1" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span>🏆</span> TOP IMAGE RANKINGS
                        </h3>
                        <span className="ranking-top-count-pill">Top 3 Scored</span>
                      </div>
                      <p className="text-xs text-secondary text-left">
                        Highest performing profile headshots based on Formal Criteria & Biometric Quality
                      </p>
                    </div>

                    <div className="ranking-list">
                      {topImages.length === 0 ? (
                        <div className="image-ranking-empty-card">
                          <div className="empty-ranking-icon">📸</div>
                          <div className="empty-ranking-content">
                            <h4 className="empty-ranking-title">No Formal Headshots Scanned Yet</h4>
                            <p className="empty-ranking-desc">
                              Upload your first profile picture above. Once analyzed, your top 3 highest-rated headshots and biometric formality scores will appear here.
                            </p>
                          </div>
                        </div>
                      ) : (
                        topImages.map((item, index) => {
                          const rank = index + 1;
                          const isTop1 = rank === 1;
                          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
                          const rankClass = rank === 1 ? 'rank-card-gold' : rank === 2 ? 'rank-card-silver' : 'rank-card-bronze';
                          const imgSrc = item.thumbnail || item.feedback_data?.thumbnail || resolveImageUrl(item.image_path);

                          return (
                            <div 
                              key={item.id || index} 
                              className={`ranking-card image-ranking-card ${rankClass} ${isTop1 ? 'ranking-card-top1' : ''}`}
                              onClick={() => setSelectedImageRankingPreview(item)}
                              role="button"
                              tabIndex={0}
                              title="Click to view full image overview"
                            >
                              <div className="ranking-card-main">
                                <div className="ranking-badge-col">
                                  <span className="ranking-medal">{medal}</span>
                                  <span className="ranking-rank-num">#{rank}</span>
                                </div>

                                {/* Visible Image Thumbnail */}
                                <div className="ranking-image-thumb-wrap">
                                  {imgSrc ? (
                                    <img 
                                      src={imgSrc} 
                                      alt={item.filename} 
                                      className="ranking-image-thumb" 
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.style.display = 'none';
                                        if (e.target.parentElement) {
                                          const fallback = e.target.parentElement.querySelector('.ranking-image-fallback');
                                          if (fallback) fallback.style.display = 'flex';
                                        }
                                      }}
                                    />
                                  ) : null}
                                  <div className="ranking-image-fallback" style={{ display: imgSrc ? 'none' : 'flex' }}>
                                    👤
                                  </div>
                                  <div className="ranking-image-zoom-overlay">🔍</div>
                                </div>

                                <div className="ranking-info-col">
                                  <div className="ranking-filename-wrap">
                                    <span className="ranking-filename" title={item.filename}>
                                      {item.filename}
                                    </span>
                                  </div>
                                  <div className="ranking-meta-sub">
                                    <span className="ranking-status-tag">
                                      {rank === 1 ? 'Highest Performing Formal' : rank === 2 ? 'Executive Grade' : 'Standard Approved'}
                                    </span>
                                    {item.created_at && (
                                      <span className="ranking-date">
                                        • {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="ranking-score-col">
                                  <div className="ranking-score-badge">
                                    <span className="ranking-score-val">{item.score || 0}%</span>
                                    <span className="ranking-score-lbl">FORMAL</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="dashboard-grid two-columns" style={{ position: 'relative', zIndex: 1 }}>
                <div className="image-result-left-panel">
                   <h3 className="section-title" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Analysis Result</h3>
                   
                   <div className="result-photo-ring-wrap">
                     <img 
                       src={imagePreview} 
                       alt="Uploaded" 
                       className={`result-photo-circle ${imageResult.score >= 70 ? 'pass-ring' : 'fail-ring'}`} 
                     />
                   </div>
                   
                   <div className={`result-score-gauge ${imageResult.score >= 80 ? 'gauge-pass' : 'gauge-fail'}`}>
                     <span className="gauge-score-num">
                       {imageResult.score}
                     </span>
                     <span className="gauge-score-label">Score</span>
                   </div>

                   <div className={`result-verdict-pill ${imageResult.score >= 70 ? 'verdict-pill-pass' : 'verdict-pill-fail'}`}>
                      {imageResult.score >= 70 
                        ? "Congratulations! You have successfully passed the image formality check." 
                        : "Your image does not meet the required formality standards. Try using the suggested tips below to enhance your photo and boost your score."}
                    </div>

                   <div className="result-reasoning-box">
                     <p className="result-reasoning-text">
                       {imageResult.reasoning}
                     </p>
                   </div>
                   
                   <div className="result-tips-callout">
                     <h4 className="tips-callout-heading">
                       <span>💡</span> Pro Tip for Enhancement
                     </h4>
                     {imageResult.improvementTips.map((tip, idx) => (
                       <p key={idx} className="tips-callout-bullet">{tip}</p>
                     ))}
                   </div>
                </div>

                <div className="image-result-right-panel">
                  <h3 className="section-title text-left mb-4">Criteria Breakdown</h3>
                  <div className="criteria-list-container">
                    {imageResult.feedback.map((item, idx) => (
                      <div key={idx} className="criteria-row-card">
                        <div className="criteria-status-icon">
                          {item.passed ? '✅' : '⚠️'}
                        </div>
                        <div className="criteria-info-wrap">
                          <h4 className={`criteria-tip-title ${item.passed ? 'title-pass' : 'title-warn'}`}>
                            {item.tip}
                          </h4>
                          <p className="criteria-detail-desc">
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    className="btn-check-another" 
                    onClick={() => { setImageResult(null); setImageFile(null); setImagePreview(null); }}
                  >
                    <span>↺</span> Check Another Image
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Targeted Scan Modal Overlay */}
      {showTargetedModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel fade-in-up">
            <button className="modal-close" onClick={() => setShowTargetedModal(false)}>×</button>
            <h2 className="modal-title">TARGETED SCAN</h2>
            <div className="modal-body">
              <input 
                type="text" 
                placeholder="Job title" 
                className="modal-input"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
              <textarea 
                placeholder="Job Description" 
                className="modal-input modal-textarea"
                rows="6"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              ></textarea>
              <button 
                className="btn-analyze modal-btn" 
                onClick={handleTargetedScanSubmit}
                disabled={isAnalyzingTargeted || !jobTitle}
                style={{ marginTop: '1.5rem', width: '100%' }}
              >
                {isAnalyzingTargeted ? "ANALYZING..." : "RUN ANALYSIS"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reasoning Modal Overlay */}
      {selectedJobReasoning && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel fade-in-up" style={{ maxWidth: '500px' }}>
            <button className="modal-close" onClick={() => setSelectedJobReasoning(null)}>×</button>
            <h2 className="modal-title" style={{ fontSize: '1.4rem', marginBottom: '1.5rem', textAlign: 'left', textTransform: 'none' }}>
              Why we suggested: <span className="modal-title-highlight">{selectedJobReasoning.title}</span>
            </h2>
            <div className="modal-body">
              <p className="modal-reasoning-desc">
                {selectedJobReasoning.reasoning}
              </p>
              <button 
                className="btn-action btn-targeted" 
                onClick={() => setSelectedJobReasoning(null)}
                style={{ width: '100%' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Extraction Failure Diagnostic & Solutions Modal */}
      {showExtractionModal && (
        <div className="modal-overlay extraction-modal-overlay" onClick={() => setShowExtractionModal(false)}>
          <div 
            className="modal-content extraction-modal-card glass-panel fade-in-up" 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="modal-close" 
              onClick={() => setShowExtractionModal(false)}
              aria-label="Close modal"
            >
              ×
            </button>

            <div className="extraction-modal-header">
              <div className="extraction-badge">
                <span className="badge-dot">⚠️</span>
                <span>Resume Extraction Diagnostic</span>
              </div>
              <h2 className="extraction-modal-title">Why Did Text Extraction Fail?</h2>
              <p className="extraction-modal-subtitle">
                The parser could not detect machine-readable text in your PDF file. Here is what likely happened and how to fix it.
              </p>
            </div>

            <div className="extraction-modal-scroll custom-scrollbar">
              {/* Primary Cause Highlight */}
              <div className="extraction-callout">
                <div className="extraction-callout-icon">🤖</div>
                <div className="extraction-callout-text">
                  <h4>Primary Cause: Image or AI-Generated Resume</h4>
                  <p>
                    Your resume appears to be an <strong>AI-generated image or flattened graphic</strong> saved as a PDF (e.g., from Midjourney, DALL-E, Photoshop, or an image canvas) rather than a document with a native digital text layer. To an ATS or document analyzer, an image PDF contains only visual pixels and no extractable characters.
                  </p>
                </div>
              </div>

              {/* Reasons Breakdown */}
              <div className="extraction-section">
                <h3 className="extraction-section-title">
                  <span>🔍</span> Possible Reasons Behind This Error
                </h3>
                <div className="causes-list">
                  <div className="cause-card">
                    <div className="cause-header">
                      <span className="cause-tag">1</span>
                      <strong>AI-Generated Graphic or Flattened Image PDF</strong>
                    </div>
                    <p className="cause-desc">
                      The document consists of a raster image (JPG/PNG) wrapped inside a PDF container without underlying selectable text characters.
                    </p>
                  </div>

                  <div className="cause-card">
                    <div className="cause-header">
                      <span className="cause-tag">2</span>
                      <strong>Scanned Paper Document or Phone Camera Photo</strong>
                    </div>
                    <p className="cause-desc">
                      Physical paper scanned or photographed without Optical Character Recognition (OCR) leaves the computer with only picture data.
                    </p>
                  </div>

                  <div className="cause-card">
                    <div className="cause-header">
                      <span className="cause-tag">3</span>
                      <strong>Outlined / Vectorized Fonts</strong>
                    </div>
                    <p className="cause-desc">
                      Exported from graphic design software (Illustrator, CorelDraw, Figma) where text was converted into vector paths/curves instead of live fonts.
                    </p>
                  </div>

                  <div className="cause-card">
                    <div className="cause-header">
                      <span className="cause-tag">4</span>
                      <strong>Password Protected or Encryption Restrictions</strong>
                    </div>
                    <p className="cause-desc">
                      The PDF has permission flags that block programmatic text copying, viewing, or extraction by third-party parsers.
                    </p>
                  </div>

                  <div className="cause-card">
                    <div className="cause-header">
                      <span className="cause-tag">5</span>
                      <strong>Corrupted File Structure or Non-Standard Encodings</strong>
                    </div>
                    <p className="cause-desc">
                      Damaged internal PDF cross-reference tables or custom non-Unicode glyph mappings that standard PDF text engines cannot decode.
                    </p>
                  </div>
                </div>
              </div>

              {/* Solutions Section (At least 5 solutions) */}
              <div className="extraction-section">
                <h3 className="extraction-section-title">
                  <span>💡</span> How to Fix This (Recommended Solutions)
                </h3>
                <div className="solutions-list">
                  <div className="solution-card">
                    <div className="solution-step-badge">1</div>
                    <div className="solution-text">
                      <h5>Create a resume with written text, not an image/AI-generated graphic</h5>
                      <p>
                        Build your resume using text-based software (like <em>Google Docs</em>, <em>Microsoft Word</em>, or an ATS resume builder) rather than generating an image canvas or visual AI mockup.
                      </p>
                    </div>
                  </div>

                  <div className="solution-card">
                    <div className="solution-step-badge">2</div>
                    <div className="solution-text">
                      <h5>Export directly as a Standard PDF (Preserve Text Layer)</h5>
                      <p>
                        In Microsoft Word, use <em>File &gt; Save As &gt; PDF (*.pdf)</em>. In Google Docs, use <em>File &gt; Download &gt; PDF Document (.pdf)</em>. Never take a screenshot or print to an image before converting.
                      </p>
                    </div>
                  </div>

                  <div className="solution-card">
                    <div className="solution-step-badge">3</div>
                    <div className="solution-text">
                      <h5>Perform the "Highlight & Copy" check before uploading</h5>
                      <p>
                        Open your PDF file in Chrome, Edge, or Adobe Acrobat. Try to click and drag to highlight a sentence. If you <em>cannot</em> select or copy the text with your mouse cursor, the parser cannot read it either.
                      </p>
                    </div>
                  </div>

                  <div className="solution-card">
                    <div className="solution-step-badge">4</div>
                    <div className="solution-text">
                      <h5>Disable "Flatten PDF" in Canva or Graphic Tools</h5>
                      <p>
                        If designing in Canva, select <em>Share &gt; Download &gt; PDF Standard</em>. Ensure the <em>"Flatten PDF"</em> checkbox is <strong>unchecked</strong> so text elements remain editable text.
                      </p>
                    </div>
                  </div>

                  <div className="solution-card">
                    <div className="solution-step-badge">5</div>
                    <div className="solution-text">
                      <h5>Remove password protection & security restrictions</h5>
                      <p>
                        Make sure the PDF is unprotected and permissions permit content copying. If protected, re-save or print-to-PDF without a password.
                      </p>
                    </div>
                  </div>

                  <div className="solution-card">
                    <div className="solution-step-badge">6</div>
                    <div className="solution-text">
                      <h5>Apply Optical Character Recognition (OCR) for scanned copies</h5>
                      <p>
                        If you must use a scanned physical document, run an OCR tool (e.g., Adobe Acrobat "Scan & OCR", Google Drive "Open with Docs", or a free online OCR utility) to embed searchable machine text.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="extraction-modal-footer">
              <div className="extraction-footer-note">
                <span>✨</span>
                <span>Tip: ATS scanners and recruiters require machine-readable text layers for job matching.</span>
              </div>
              <button 
                type="button"
                className="btn-extraction-close" 
                onClick={() => setShowExtractionModal(false)}
              >
                Got It, I'll Update My Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top 1 Resume Document Modal Preview */}
      {showTop1PreviewModal && topResumes[0] && (
        <div className="google-chooser-overlay" onClick={() => setShowTop1PreviewModal(false)}>
          <div className="preview-modal-card" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="modal-close" 
              onClick={() => setShowTop1PreviewModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="preview-modal-header mb-3">
              <span className="preview-modal-badge">🥇 #1 Highest Scored Resume</span>
              <h3 className="preview-modal-title">{topResumes[0].filename}</h3>
              <p className="preview-modal-sub">
                Overall ATS Compatibility Score: <strong>{topResumes[0].ats_score}%</strong>
              </p>
            </div>

            <div className="preview-modal-content">
              {(topResumes[0]?.thumbnail || topResumes[0]?.parsed_data?.thumbnail) ? (
                <div style={{ textAlign: 'center', maxHeight: '70vh', overflowY: 'auto' }}>
                  <img 
                    src={topResumes[0]?.thumbnail || topResumes[0]?.parsed_data?.thumbnail} 
                    alt={topResumes[0].filename}
                    style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                  />
                </div>
              ) : (
                <div className="preview-modal-details">
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {(topResumes[0]?.parsed_data?.skills || []).map((sk, idx) => (
                      <span key={idx} className="chip chip-success">{sk}</span>
                    ))}
                  </div>
                  <div className="code-block" style={{ maxHeight: '55vh', overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                    {topResumes[0]?.parsed_data?.summary || topResumes[0]?.raw_text || JSON.stringify(topResumes[0]?.parsed_data, null, 2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Image Ranking Modal Preview */}
      {selectedImageRankingPreview && (
        <div className="google-chooser-overlay" onClick={() => setSelectedImageRankingPreview(null)}>
          <div className="preview-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <button 
              type="button" 
              className="modal-close" 
              onClick={() => setSelectedImageRankingPreview(null)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="preview-modal-header mb-3">
              <span className="preview-modal-badge">
                ★ Top Image Formal Score: {selectedImageRankingPreview.score}%
              </span>
              <h3 className="preview-modal-title">{selectedImageRankingPreview.filename}</h3>
              <p className="preview-modal-sub">
                Formality Benchmark Status: <strong>{selectedImageRankingPreview.score >= 70 ? 'Passed Standard' : 'Needs Optimization'}</strong>
              </p>
            </div>

            <div className="preview-modal-content" style={{ textAlign: 'center' }}>
              <div style={{ borderRadius: '14px', overflow: 'hidden', border: '2px solid rgba(56, 189, 248, 0.4)', background: '#0b1120', display: 'flex', justifyContent: 'center', minHeight: '200px', alignItems: 'center' }}>
                <img 
                  src={selectedImageRankingPreview.thumbnail || selectedImageRankingPreview.feedback_data?.thumbnail || resolveImageUrl(selectedImageRankingPreview.image_path)}
                  alt={selectedImageRankingPreview.filename}
                  style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    if (selectedImageRankingPreview.thumbnail) {
                      e.target.src = selectedImageRankingPreview.thumbnail;
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
