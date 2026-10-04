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

function Dashboard({ onLogout, userId }) {
  const username = localStorage.getItem('user_username') || 'Mikhail';
  const [activeTab, setActiveTab] = useState('USER HUB');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const chartRef = useRef(null);
  
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

  const [chartData, setChartData] = useState({
    labels: ['v1', 'v2', 'v3'],
    datasets: []
  });

  const fetchHistory = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`http://localhost:5000/api/history/${userId}`);
      const data = await response.json();
      if (response.ok && data.data) {
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
      }
    } catch(err) {
      console.error("History fetch error:", err);
    }
  };

  const fetchLatestAnalysis = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`http://localhost:5000/api/latest-analysis/${userId}`);
      const data = await response.json();
      if (response.ok && data.data) {
        setResult(data.data);
        if (data.data.parsed_content?.ats_score) {
          setUserScore(data.data.parsed_content.ats_score);
        }
      }
    } catch(err) {
      console.error("Latest analysis fetch error:", err);
    }
  };

  const fetchLatestTargetedScan = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`http://localhost:5000/api/latest-targeted-scan/${userId}`);
      const data = await response.json();
      if (response.ok && data.data) {
        setResult(prev => {
          if (!prev) {
            return { parsed_content: { keywords: [] } };
          }
          return prev;
        });
        setTargetedResult(data.data);
      }
    } catch(err) {
      console.error("Latest targeted scan fetch error:", err);
    }
  };

  const fetchLatestDiscoveryScan = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`http://localhost:5000/api/latest-discovery-scan/${userId}`);
      const data = await response.json();
      if (response.ok && data.data) {
        setDiscoveryResult(data.data.results_data);
      }
    } catch(err) {
      console.error("Latest discovery scan fetch error:", err);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchHistory();
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
    if (activeTab === 'USER HUB') {
      fetchHistory();
    }
  }, [activeTab, userId]);


  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1e293b',
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
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: '#94a3b8',
          font: { family: 'Inter' }
        }
      },
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: '#94a3b8',
          font: { family: 'Inter' }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  const currentScore = result?.parsed_content?.ats_score || 0;
  const missingScore = Math.max(0, 100 - currentScore - 10);
  const fixingScore = 100 - currentScore - missingScore;

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

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);

    try {
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data.data);
        if (data.data.parsed_content?.ats_score) {
            setUserScore(data.data.parsed_content.ats_score);
        }
        fetchHistory();
      } else {
        setError(data.message || "An error occurred during analysis.");
      }
    } catch (err) {
      setError("Failed to connect to the server. Is the backend running?");
    } finally {
      setLoading(false);
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
      const response = await fetch('http://localhost:5000/api/analyze/image', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        setImageResult(data.data.feedback_data);
        setImagePreview(`http://localhost:5000${data.data.image_path}`);
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
      const response = await fetch('http://localhost:5000/api/analyze/targeted', {
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
      const response = await fetch('http://localhost:5000/api/analyze/discovery', {
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
          <img src="/uthm_logo.png.png" alt="UTHM Logo" className="sidebar-logo" />
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
          <button onClick={onLogout} className="btn-logout">Log out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'USER HUB' && (
          <>
            <header className="content-header">
              <h1 style={{ textTransform: 'none' }}>welcome {username}</h1>
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
                  <div className="error-banner">{error}</div>
                )}

                <button 
                  className="btn-analyze" 
                  onClick={handleUpload} 
                  disabled={loading || !file}
                >
                  {loading ? "ANALYZING..." : "RUN GENERAL ANALYSIS"}
                </button>
              </div>
            </section>

            {/* Results Section (Only shows after upload) */}
            {result && (
              <section className="glass-panel results-panel fade-in-up">
                <h2 className="section-title" style={{textAlign: 'left'}}>Analysis Results</h2>
                <div className="results-grid">
                  <div className="result-card">
                    <h3>ATS Parseability</h3>
                    <div className={`status-badge ${result.ats_parseability ? 'success' : 'danger'}`}>
                      {result.ats_parseability ? 'PASSED' : 'FAILED'}
                    </div>
                  </div>
                </div>

                <div className="extracted-text-preview">
                  <h3>Extracted Text Verification</h3>
                  <p>Verify below that your multi-column text was read logically.</p>
                  <div className="code-block">
                    {result.extracted_text || "No text extracted."}
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === 'DASHBOARD' && (
          <div className="analysis-dashboard fade-in-up">
            <header className="content-header mb-5">
              <h1>Semantic Compatibility Score</h1>
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
                
                <div className="prescriptive-feedback mt-5 w-full">
                  <h3 className="section-title text-left mt-4" style={{ marginBottom: '0.5rem' }}>PRESCRIPTIVE KEYWORD FEEDBACK</h3>
                  
                  <p className="text-sm text-secondary mb-3">Found in your resume</p>
                  <div className="keyword-chips">
                    {result?.parsed_content?.keywords?.map((kw, i) => (
                      <span key={`kw-${i}`} className="chip chip-success">{kw}</span>
                    )) || <span className="chip chip-success">No keywords extracted</span>}
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
                      <div className="metric-value">{result?.parsed_content?.keywords?.length > 10 ? 'High' : 'Moderate'}</div>
                    </div>
                    <div className="metric">
                      <div className="metric-label">Action verbs</div>
                      <div className="metric-value">{result?.parsed_content?.action_verbs_count || 0} found</div>
                    </div>
                  </div>
                  
                  <p className="generative-feedback mb-4 text-secondary">
                    Your resume is well-structured and parseable. Semantic alignment with the job description is moderate. Key missing terms reduce your match score.
                  </p>
                  
                  <div className="text-scan-results mb-5">
                    <h3 className="section-title text-left mb-3">TEXT SCAN RESULTS</h3>
                    <ul className="scan-list">
                      <li className="scan-item success">{result?.parsed_content?.action_verbs_count || 0} strong action verbs detected</li>
                      <li className={`scan-item ${result?.parsed_content?.education?.length ? 'success' : 'danger'}`}>
                        {result?.parsed_content?.education?.length ? 'Education section properly parsed' : 'No education section found'}
                      </li>
                      <li className={`scan-item ${result?.parsed_content?.skills?.length ? 'success' : 'warning mt-3'}`}>
                        {result?.parsed_content?.skills?.length ? `${result.parsed_content.skills.length} core skills detected` : 'Skills section missing or too generic'}
                      </li>
                      <li className={`scan-item ${result?.parsed_content?.summary ? 'success' : 'danger'}`}>
                        {result?.parsed_content?.summary ? 'Professional summary found' : 'No summary/objective section found'}
                      </li>
                      {result?.parsed_content?.missing_information?.map((msg, i) => (
                        <li key={`miss-info-${i}`} className="scan-item danger">{msg}</li>
                      ))}
                      {result?.parsed_content?.need_fixing?.map((msg, i) => (
                        <li key={`fix-info-${i}`} className="scan-item warning">{msg}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="action-buttons">
                  <button className="btn-action btn-targeted" onClick={() => setShowTargetedModal(true)}>Targeted Scan</button>
                  <button 
                    className="btn-action btn-discovery" 
                    onClick={handleDiscoveryScanSubmit}
                    disabled={isAnalyzingDiscovery}
                  >
                    {isAnalyzingDiscovery ? "ANALYZING..." : "Discovery Scan"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'CAREER' && careerMode === null && (
          <div className="career-dashboard fade-in-up">
            <header className="content-header mb-5" style={{ textAlign: 'left' }}>
              <h1 style={{ fontWeight: 300, color: '#f8fafc', fontSize: '2rem' }}>Career Analysis Selector</h1>
              <p style={{ color: '#94a3b8', marginTop: '0.25rem', fontSize: '1.1rem' }}>Select matching analysis mode for your current resume.</p>
            </header>

            <div className="discovery-cards-grid">
              {/* Card 1: Targeted Scan */}
              <div className="discovery-card card-primary" style={{ minHeight: '380px', justifyContent: 'space-between' }}>
                <div>
                  <div className="card-icon-wrapper mb-3">
                    <span className="card-icon">🎯</span>
                  </div>
                  <h3 className="card-title">Targeted Scan</h3>
                  <p className="card-subtitle mb-4" style={{ marginTop: '0.5rem', lineHeight: '1.5', fontSize: '0.95rem' }}>
                    Match your resume against a specific job role and description. Get a semantic compatibility score, identify missing critical keywords, and receive tailored improvement advice.
                  </p>
                </div>
                <button 
                  className="btn-action btn-targeted" 
                  style={{ width: '100%', margin: 0, background: '#ffffff', color: '#0d1b54', fontWeight: 'bold' }}
                  onClick={() => setShowTargetedModal(true)}
                >
                  Start Targeted Scan
                </button>
              </div>

              {/* Card 2: Discovery Scan */}
              <div className="discovery-card card-tertiary" style={{ minHeight: '380px', justifyContent: 'space-between' }}>
                <div>
                  <div className="card-icon-wrapper mb-3">
                    <span className="card-icon">🔍</span>
                  </div>
                  <h3 className="card-title">Discovery Scan</h3>
                  <p className="card-subtitle mb-4" style={{ marginTop: '0.5rem', lineHeight: '1.5', fontSize: '0.95rem' }}>
                    Let AI analyze your resume to automatically match you with different job roles (e.g. Data Analyst, ML Engineer, Full-Stack Dev). Highlights skill gaps and provides additions for your resume.
                  </p>
                </div>
                <button 
                  className="btn-action btn-targeted" 
                  style={{ width: '100%', margin: 0, background: '#ffffff', color: '#4c1d95', fontWeight: 'bold' }}
                  onClick={handleDiscoveryScanSubmit}
                  disabled={isAnalyzingDiscovery}
                >
                  {isAnalyzingDiscovery ? "Analyzing..." : "Start Discovery Scan"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'CAREER' && careerMode === 'TARGETED' && (
          <div className="career-dashboard fade-in-up">
            <header className="content-header mb-5" style={{ textAlign: 'left' }}>
              <h1 style={{ display: 'inline-block', fontWeight: 300, color: '#f8fafc', fontSize: '2rem' }}>
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
                  <h3 style={{ fontSize: '1.25rem', color: '#cbd5e1', fontWeight: 500 }}>Targeted Compatibility Score</h3>
                  <p style={{ fontSize: '0.95rem', color: '#64748b' }}>
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
              <h1 style={{ display: 'inline-block', fontWeight: 800, color: '#3b82f6', fontSize: '2.2rem', textTransform: 'uppercase' }}>
                DISCOVERY MATCH RESULT
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
            <header className="content-header mb-5" style={{ textAlign: 'center' }}>
              <h1 style={{ fontWeight: 800, color: '#3b82f6', fontSize: '2.5rem', textTransform: 'uppercase' }}>
                MARKET READINESS BENCHMARKING
              </h1>
            </header>

            <div className="benchmark-main-content">
              <div className="glass-panel benchmark-chart-panel">
                <div className="benchmark-chart-container" style={{ height: '350px', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                  <Bar data={benchmarkChartData} options={benchmarkChartOptions} />
                </div>
                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '1.5rem', fontStyle: 'italic' }}>
                  *Industry Benchmark can be different based on each industry, in general most industry set their ATS benchmark is 70%&gt;
                </p>
              </div>

              {/* Feedback Box */}
              {userScore < benchmarkScore ? (
                <div className="feedback-box feedback-box-warning mt-5">
                  <span className="feedback-icon">⚠️</span>
                  <p className="feedback-text">
                    "You are below the benchmark. Most Likely ATS filters will reject this version."
                  </p>
                </div>
              ) : (
                <div className="feedback-box feedback-box-success mt-5">
                  <span className="feedback-icon">✅</span>
                  <p className="feedback-text">
                    "Congratulations! You are above the benchmark. Your resume has a high chance of passing standard ATS filters."
                  </p>
                </div>
              )}
            </div>

            <div className="flex-end mt-5">
               <button className="btn-action btn-targeted" onClick={() => setActiveTab('IMAGE')}>IMAGE</button>
            </div>
          </div>
        )}

        {activeTab === 'IMAGE' && (
          <div className="image-dashboard fade-in-up">
            <header className="content-header mb-5" style={{ textAlign: 'center' }}>
              <h1 style={{ fontWeight: 800, color: '#f8fafc', fontSize: '2.5rem', textTransform: 'uppercase' }}>
                FORMAL IMAGE CHECKING
              </h1>
            </header>

            {error && <div className="error-banner" style={{ marginBottom: '2rem', width: '100%' }}>{error}</div>}


            {!imageResult ? (
              <div className="dashboard-grid two-columns">
                <div className="glass-panel d-col-left" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', color: '#f8fafc', fontWeight: 700, marginBottom: '1.5rem', textTransform: 'uppercase' }}>
                      Formal Resume Image Checking
                    </h2>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div className="image-example-box">
                        <img src="/formal image Man.jpg" alt="Formal Man" style={{ width: '100%', height: 'auto', borderRadius: '0.5rem', objectFit: 'cover' }} />
                      </div>
                      <div className="image-example-box">
                        <img src="/formal image Woman.png" alt="Formal Woman" style={{ width: '100%', height: 'auto', borderRadius: '0.5rem', objectFit: 'cover' }} />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase' }}>
                      Example & Tips
                    </h3>
                    <ul className="scan-list" style={{ gap: '0.75rem' }}>
                      <li className="scan-item" style={{ color: '#cbd5e1' }}><strong style={{ color: '#f8fafc' }}>Corporate Attire:</strong> Wear clean, professional business clothing matching your industry.</li>
                      <li className="scan-item" style={{ color: '#cbd5e1' }}><strong style={{ color: '#f8fafc' }}>Direct Gaze:</strong> Look straight into the camera lens to build instant trust.</li>
                      <li className="scan-item" style={{ color: '#cbd5e1' }}><strong style={{ color: '#f8fafc' }}>Genuine Smile:</strong> Maintain a warm, pleasant, approachable facial expression.</li>
                      <li className="scan-item" style={{ color: '#cbd5e1' }}><strong style={{ color: '#f8fafc' }}>Neutral Backdrop:</strong> Use a solid white, light grey, or soft blue background.</li>
                      <li className="scan-item" style={{ color: '#cbd5e1' }}><strong style={{ color: '#f8fafc' }}>Chest-Up Crop:</strong> Frame the shot from your mid-chest to just above your head.</li>
                      <li className="scan-item" style={{ color: '#cbd5e1' }}><strong style={{ color: '#f8fafc' }}>High Resolution:</strong> Ensure the file is crisp, sharp, and perfectly focused.</li>
                      <li className="scan-item" style={{ color: '#cbd5e1' }}><strong style={{ color: '#f8fafc' }}>Natural Lighting:</strong> Eliminate shadows across your face using soft, even light.</li>
                      <li className="scan-item" style={{ color: '#cbd5e1' }}><strong style={{ color: '#f8fafc' }}>Clean Grooming:</strong> Keep hair neat and makeup or facial hair tidy.</li>
                      <li className="scan-item" style={{ color: '#cbd5e1' }}><strong style={{ color: '#f8fafc' }}>No Filters:</strong> Avoid visible mobile editing effects or distracting digital touch-ups.</li>
                    </ul>
                  </div>
                </div>

                <div className="glass-panel d-col-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                  <div className="upload-zone" style={{ minHeight: '300px', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      className="file-input"
                      id="image-upload"
                      style={{ zIndex: 2 }}
                    />
                    {imagePreview ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                        <img src={imagePreview} alt="Preview" style={{ maxWidth: '220px', maxHeight: '220px', borderRadius: '0.5rem', objectFit: 'cover', border: '2px solid #3b82f6', marginBottom: '1rem' }} />
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Click or drag to change image</p>
                      </div>
                    ) : (
                      <label htmlFor="image-upload" className="upload-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                        <div className="upload-icon" style={{ fontSize: '4rem', color: '#60a5fa' }}>↑</div>
                        <div className="upload-text" style={{ fontSize: '1rem', marginTop: '1rem' }}>Upload your image here</div>
                      </label>
                    )}
                  </div>
                  
                  {imagePreview && (
                    <button 
                      className="btn-analyze" 
                      onClick={handleImageUpload} 
                      disabled={isAnalyzingImage}
                      style={{ marginTop: '1.5rem', width: '100%' }}
                    >
                      {isAnalyzingImage ? "ANALYZING..." : "ANALYZE IMAGE"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="dashboard-grid two-columns">
                <div className="glass-panel flex-col-center">
                   <h3 className="section-title">Analysis Result</h3>
                   <img src={imagePreview} alt="Uploaded" style={{ width: '200px', height: '200px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #3b82f6', marginBottom: '1.5rem' }} />
                   
                   <div className="score-circle mb-4" style={{ 
                     width: '120px', height: '120px', borderRadius: '50%', 
                     display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                     background: imageResult.score >= 80 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                     border: `4px solid ${imageResult.score >= 80 ? '#10b981' : '#fbbf24'}`
                   }}>
                     <span style={{ fontSize: '2.5rem', fontWeight: 800, color: imageResult.score >= 80 ? '#10b981' : '#fbbf24' }}>
                       {imageResult.score}
                     </span>
                     <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Score</span>
                   </div>

                   <p style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                     {imageResult.reasoning}
                   </p>
                   
                   <div style={{ width: '100%', background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid #3b82f6', padding: '1rem', borderRadius: '0 0.5rem 0.5rem 0' }}>
                     <h4 style={{ color: '#60a5fa', marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>Pro Tip for Enhancement</h4>
                     {imageResult.improvementTips.map((tip, idx) => (
                       <p key={idx} style={{ color: '#e2e8f0', fontSize: '0.95rem' }}>{tip}</p>
                     ))}
                   </div>
                </div>

                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                  <h3 className="section-title text-left mb-4">Criteria Breakdown</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {imageResult.feedback.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '1.5rem' }}>
                          {item.passed ? '✅' : '⚠️'}
                        </div>
                        <div>
                          <h4 style={{ color: item.passed ? '#f8fafc' : '#fbbf24', fontSize: '1rem', marginBottom: '0.25rem' }}>
                            {item.tip}
                          </h4>
                          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    className="btn-action btn-targeted mt-5" 
                    onClick={() => { setImageResult(null); setImageFile(null); setImagePreview(null); }}
                    style={{ width: '100%' }}
                  >
                    Check Another Image
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
            <h2 className="modal-title" style={{ fontSize: '1.4rem', marginBottom: '1.5rem', color: '#60a5fa', textAlign: 'left', textTransform: 'none' }}>
              Why we suggested: <span style={{ color: '#f8fafc' }}>{selectedJobReasoning.title}</span>
            </h2>
            <div className="modal-body">
              <p style={{ lineHeight: '1.7', fontSize: '1.05rem', color: '#cbd5e1', marginBottom: '2.5rem' }}>
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
    </div>
  );
}

export default Dashboard;
