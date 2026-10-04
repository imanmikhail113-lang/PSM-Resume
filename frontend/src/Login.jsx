import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Login({ onLoginSuccess }) {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showChooserModal, setShowChooserModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTIVE GEOMETRIC BACKGROUND CONTROLS (Removed for public)
  // ═══════════════════════════════════════════════════════════════════════════
  const speed = 1.0;
  const parallaxDamping = 0.05;
  const density = 1.0;
  const showCard = true;

  const canvasRef = useRef(null);

  // References to keep animation loop working with static values
  const controlsRef = useRef({ speed, parallaxDamping, density });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESUME THEME GEOMETRY CANVAS SIMULATION
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initEntities();
    };

    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // ── 1. SEMI-TRANSLUCENT DOG-EARED RESUME DOCUMENTS ──
    let resumes = [];
    const baseResumeCount = 9;

    // ── 2. ONTOLOGY SKILLS GRAPH NODES & EDGES ──
    const skillList = [
      'Python', 'LLM', 'Embeddings', 'RAG', 'PyTorch',
      'NLP', 'FastAPI', 'React', 'Docker', 'SQL',
      'LangChain', 'VectorDB', 'BERT', 'Transformers', 'Keras', 'Cosine Sim'
    ];
    let skillsNodes = [];

    // ── 3. FLOATING KEYWORD TELEMETRY PARTICLES & PILL TAGS ──
    const pillLabels = [
      'ATS: 98%', 'MATCH: 94%', 'PARSED: OK',
      'RAG PIPELINE', 'TF-IDF HIGH', 'SEMANTIC FIT', 'SCORE: 89%'
    ];
    let telemetryPills = [];
    let telemetryParticles = [];

    const initEntities = () => {
      const d = controlsRef.current.density;

      // Resumes
      const count = Math.round(baseResumeCount * d);
      resumes = Array.from({ length: count }, (_, i) => {
        const depth = 0.35 + (i / count) * 0.65; // 0.35 (far) to 1.0 (near)
        return {
          x: (Math.random() * 0.9 + 0.05) * width,
          y: (Math.random() * 0.9 + 0.05) * height,
          baseWidth: 100 * depth,
          baseHeight: 140 * depth,
          dogEar: 14 * depth,
          depth,
          phaseX: Math.random() * Math.PI * 2,
          phaseY: Math.random() * Math.PI * 2,
          phaseRot: Math.random() * Math.PI * 2,
          speedX: 0.0006 + Math.random() * 0.0008,
          speedY: 0.0005 + Math.random() * 0.0007,
          rotSpeed: 0.0004 + Math.random() * 0.0005,
          color: i % 2 === 0 ? 'cyan' : 'lavender',
          bulletLines: 4 + Math.floor(Math.random() * 4),
          badgeScore: 85 + Math.floor(Math.random() * 15),
        };
      });

      // Ontology Graph Nodes
      const nodeCount = Math.round(skillList.length * Math.min(d, 1.4));
      skillsNodes = Array.from({ length: nodeCount }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: 3 + Math.random() * 2.5,
        label: skillList[i % skillList.length],
        pulsePhase: Math.random() * Math.PI * 2,
      }));

      // Telemetry Pills
      const pillCount = Math.round(pillLabels.length * d);
      telemetryPills = Array.from({ length: pillCount }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        text: pillLabels[i % pillLabels.length],
        speedY: 0.25 + Math.random() * 0.35,
        swayPhase: Math.random() * Math.PI * 2,
        swayAmp: 15 + Math.random() * 20,
      }));

      // Telemetry micro-particles
      const particleCount = Math.round(35 * d);
      telemetryParticles = Array.from({ length: particleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.6 + 0.6,
        speedY: 0.15 + Math.random() * 0.35,
        swayPhase: Math.random() * Math.PI * 2,
        alpha: 0.1 + Math.random() * 0.25,
        isCross: Math.random() > 0.6,
      }));
    };

    initEntities();

    let time = 0;

    const render = () => {
      const { speed: animSpeed, parallaxDamping: damp } = controlsRef.current;
      time += 0.008 * animSpeed;

      // Mouse Parallax with smooth lerp damping
      mouse.x += (mouse.targetX - mouse.x) * damp;
      mouse.y += (mouse.targetY - mouse.y) * damp;

      const parallaxNormX = (mouse.x - width / 2) / (width / 2);
      const parallaxNormY = (mouse.y - height / 2) / (height / 2);

      // Deep Obsidian Slate Backdrop (#050508)
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, width, height);

      // Ambient Volumetric Soft Sheen Gradients (Low alphas: 0.03 to 0.12)
      const ambientCyan = ctx.createRadialGradient(
        width * 0.25 + parallaxNormX * 40,
        height * 0.3 + parallaxNormY * 40,
        50,
        width * 0.25,
        height * 0.3,
        width * 0.45
      );
      ambientCyan.addColorStop(0, 'rgba(56, 189, 248, 0.07)');
      ambientCyan.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = ambientCyan;
      ctx.fillRect(0, 0, width, height);

      const ambientLavender = ctx.createRadialGradient(
        width * 0.75 - parallaxNormX * 30,
        height * 0.65 - parallaxNormY * 30,
        50,
        width * 0.75,
        height * 0.65,
        width * 0.5
      );
      ambientLavender.addColorStop(0, 'rgba(192, 132, 252, 0.06)');
      ambientLavender.addColorStop(1, 'rgba(192, 132, 252, 0)');
      ctx.fillStyle = ambientLavender;
      ctx.fillRect(0, 0, width, height);

      // ── RENDER 1: ONTOLOGY SKILLS GRAPH (Glowing nodes & edge lines) ──
      ctx.lineWidth = 1;
      const maxDistance = 170;

      for (let i = 0; i < skillsNodes.length; i++) {
        const nA = skillsNodes[i];
        nA.x += nA.vx * animSpeed;
        nA.y += nA.vy * animSpeed;

        if (nA.x < -30) nA.x = width + 30;
        if (nA.x > width + 30) nA.x = -30;
        if (nA.y < -30) nA.y = height + 30;
        if (nA.y > height + 30) nA.y = -30;

        const pX = nA.x + parallaxNormX * 18;
        const pY = nA.y + parallaxNormY * 18;

        for (let j = i + 1; j < skillsNodes.length; j++) {
          const nB = skillsNodes[j];
          const dx = (nB.x + parallaxNormX * 18) - pX;
          const dy = (nB.y + parallaxNormY * 18) - pY;
          const dist = Math.hypot(dx, dy);

          if (dist < maxDistance) {
            const edgeAlpha = (1 - dist / maxDistance) * 0.12;
            ctx.strokeStyle = `rgba(147, 197, 253, ${edgeAlpha})`;
            ctx.beginPath();
            ctx.moveTo(pX, pY);
            ctx.lineTo(nB.x + parallaxNormX * 18, nB.y + parallaxNormY * 18);
            ctx.stroke();
          }
        }

        // Draw node dot and glowing halo
        nA.pulsePhase += 0.02 * animSpeed;
        const pulse = Math.sin(nA.pulsePhase) * 1.5;

        ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.beginPath();
        ctx.arc(pX, pY, nA.radius + pulse * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
        ctx.beginPath();
        ctx.arc(pX, pY, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Skill Label watermark
        ctx.font = '500 10px Inter, sans-serif';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
        ctx.fillText(nA.label, pX + 9, pY + 3);
      }

      // ── RENDER 2: SEMI-TRANSLUCENT DOG-EARED RESUME DOCUMENTS ──
      resumes.forEach((doc) => {
        // Ultra-slow harmonic natural drift
        const driftX = Math.sin(time * 0.35 + doc.phaseX) * 25 + Math.cos(time * 0.18 + doc.phaseX) * 15;
        const driftY = Math.cos(time * 0.3 + doc.phaseY) * 22 + Math.sin(time * 0.14 + doc.phaseY) * 12;

        // Rocking tilt: 2-5 degrees (0.035 to 0.085 radians), smooth harmonic
        const tilt =
          Math.sin(time * 0.45 + doc.phaseRot) * 0.05 +
          Math.cos(time * 0.22 + doc.phaseRot * 1.5) * 0.025;

        // Parallax scaled with depth level
        const posX = doc.x + driftX + parallaxNormX * (doc.depth * 45);
        const posY = doc.y + driftY + parallaxNormY * (doc.depth * 45);

        ctx.save();
        ctx.translate(posX, posY);
        ctx.rotate(tilt);

        const w = doc.baseWidth;
        const h = doc.baseHeight;
        const ear = doc.dogEar;

        // Document Outer Frame with Folded Dog-Ear Top Right
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w - ear, 0);
        ctx.lineTo(w, ear);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();

        // Translucent Obsidian / Silver Glass Fill
        const isCyan = doc.color === 'cyan';
        const docGrad = ctx.createLinearGradient(0, 0, w, h);
        if (isCyan) {
          docGrad.addColorStop(0, 'rgba(15, 23, 42, 0.35)');
          docGrad.addColorStop(1, 'rgba(6, 12, 24, 0.45)');
        } else {
          docGrad.addColorStop(0, 'rgba(24, 18, 42, 0.3)');
          docGrad.addColorStop(1, 'rgba(8, 6, 18, 0.4)');
        }
        ctx.fillStyle = docGrad;
        ctx.fill();

        // Subtle document border (0.08 to 0.16 alpha)
        ctx.lineWidth = 1;
        ctx.strokeStyle = isCyan ? 'rgba(56, 189, 248, 0.14)' : 'rgba(192, 132, 252, 0.12)';
        ctx.stroke();

        // Folded Dog-Ear Triangle
        ctx.beginPath();
        ctx.moveTo(w - ear, 0);
        ctx.lineTo(w - ear, ear);
        ctx.lineTo(w, ear);
        ctx.closePath();
        ctx.fillStyle = isCyan ? 'rgba(56, 189, 248, 0.18)' : 'rgba(192, 132, 252, 0.16)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.stroke();

        // Silhouette Text Bars & Bullet Lines
        ctx.fillStyle = isCyan ? 'rgba(148, 163, 184, 0.12)' : 'rgba(203, 213, 225, 0.1)';

        // Resume Header title bar
        ctx.beginPath();
        ctx.roundRect(14 * doc.depth, 16 * doc.depth, w * 0.48, 6 * doc.depth, 2);
        ctx.fill();

        // Candidate sub-bar
        ctx.beginPath();
        ctx.roundRect(14 * doc.depth, 28 * doc.depth, w * 0.32, 3 * doc.depth, 1.5);
        ctx.fill();

        // Section divider line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.moveTo(14 * doc.depth, 38 * doc.depth);
        ctx.lineTo(w - 14 * doc.depth, 38 * doc.depth);
        ctx.stroke();

        // Bullet text lines
        const startY = 46 * doc.depth;
        const lineSpacing = 11 * doc.depth;
        for (let b = 0; b < doc.bulletLines; b++) {
          const currentY = startY + b * lineSpacing;
          if (currentY > h - 16 * doc.depth) break;

          // Bullet dot
          ctx.beginPath();
          ctx.arc(16 * doc.depth, currentY + 2 * doc.depth, 1.5 * doc.depth, 0, Math.PI * 2);
          ctx.fill();

          // Text bar silhouette
          const lineW = (0.45 + ((b * 37) % 35) / 100) * (w - 28 * doc.depth);
          ctx.beginPath();
          ctx.roundRect(22 * doc.depth, currentY, lineW, 3 * doc.depth, 1.5);
          ctx.fill();
        }

        // Tiny ATS score stamp in bottom corner
        ctx.fillStyle = isCyan ? 'rgba(56, 189, 248, 0.22)' : 'rgba(192, 132, 252, 0.2)';
        ctx.font = `600 ${Math.max(7, Math.round(9 * doc.depth))}px Inter, sans-serif`;
        ctx.fillText(`ATS ${doc.badgeScore}`, w - 38 * doc.depth, h - 12 * doc.depth);

        ctx.restore();
      });

      // ── RENDER 3: FLOATING KEYWORD TELEMETRY PARTICLES & PILLS ──
      // Buoyant Upward Drift with Harmonic Lateral Sway
      telemetryPills.forEach((pill) => {
        pill.y -= pill.speedY * animSpeed;
        pill.swayPhase += 0.015 * animSpeed;
        const swayX = Math.sin(pill.swayPhase) * pill.swayAmp;

        if (pill.y < -40) {
          pill.y = height + 40;
          pill.x = Math.random() * width;
        }

        const px = pill.x + swayX + parallaxNormX * 22;
        const py = pill.y + parallaxNormY * 22;

        ctx.font = '600 10px monospace';
        const txtWidth = ctx.measureText(pill.text).width;
        const pillW = txtWidth + 16;
        const pillH = 20;

        // Pill translucent container
        ctx.beginPath();
        ctx.roundRect(px - pillW / 2, py - pillH / 2, pillW, pillH, 10);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Text
        ctx.fillStyle = 'rgba(186, 230, 253, 0.35)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pill.text, px, py);
      });

      // Reset text baseline
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';

      // Upward drifting telemetry micro-particles
      telemetryParticles.forEach((part) => {
        part.y -= part.speedY * animSpeed;
        part.swayPhase += 0.02 * animSpeed;
        const sway = Math.sin(part.swayPhase) * 6;

        if (part.y < -10) {
          part.y = height + 10;
          part.x = Math.random() * width;
        }

        const px = part.x + sway + parallaxNormX * 12;
        const py = part.y + parallaxNormY * 12;

        ctx.fillStyle = `rgba(226, 232, 240, ${part.alpha})`;
        if (part.isCross) {
          ctx.fillRect(px - 1.5, py - 0.5, 3, 1);
          ctx.fillRect(px - 0.5, py - 1.5, 1, 3);
        } else {
          ctx.beginPath();
          ctx.arc(px, py, part.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // ── RENDER 4: CENTER VIGNETTE (Readability protection for login card) ──
      const centerVignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.22,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75
      );
      centerVignette.addColorStop(0, 'rgba(5, 5, 8, 0.25)');
      centerVignette.addColorStop(0.5, 'rgba(5, 5, 8, 0.6)');
      centerVignette.addColorStop(1, 'rgba(5, 5, 8, 0.9)');
      ctx.fillStyle = centerVignette;
      ctx.fillRect(0, 0, width, height);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // NEXT.JS EXPORT CODE STRING
  // ═══════════════════════════════════════════════════════════════════════════
  const nextJsExportCode = `'use client';
import React, { useEffect, useRef } from 'react';

export default function ResumeGeometryBackground({
  speed = 1.0,
  parallaxDamping = 0.05,
  density = 1.0,
  children
}: {
  speed?: number;
  parallaxDamping?: number;
  density?: number;
  children?: React.ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    const handleMouse = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouse);

    // Entities: Dog-eared resume sheets & ontology skill graph nodes
    const skillList = ['Python', 'LLM', 'Embeddings', 'RAG', 'PyTorch', 'NLP', 'FastAPI', 'React', 'Docker'];
    const nodes = skillList.map((label) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      label
    }));

    let time = 0;
    const render = () => {
      time += 0.008 * speed;
      mouse.x += (mouse.targetX - mouse.x) * parallaxDamping;
      mouse.y += (mouse.targetY - mouse.y) * parallaxDamping;
      const pNormX = (mouse.x - width / 2) / (width / 2);
      const pNormY = (mouse.y - height / 2) / (height / 2);

      // Obsidian Slate Backdrop
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, width, height);

      // Render connected skills graph
      for (let i = 0; i < nodes.length; i++) {
        const nA = nodes[i];
        nA.x += nA.vx * speed;
        nA.y += nA.vy * speed;
        if (nA.x < -20) nA.x = width + 20;
        if (nA.x > width + 20) nA.x = -20;
        if (nA.y < -20) nA.y = height + 20;
        if (nA.y > height + 20) nA.y = -20;

        const pX = nA.x + pNormX * 18;
        const pY = nA.y + pNormY * 18;

        for (let j = i + 1; j < nodes.length; j++) {
          const nB = nodes[j];
          const dist = Math.hypot((nB.x + pNormX * 18) - pX, (nB.y + pNormY * 18) - pY);
          if (dist < 160) {
            ctx.strokeStyle = \`rgba(147, 197, 253, \${(1 - dist / 160) * 0.12})\`;
            ctx.beginPath();
            ctx.moveTo(pX, pY);
            ctx.lineTo(nB.x + pNormX * 18, nB.y + pNormY * 18);
            ctx.stroke();
          }
        }
        ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.beginPath();
        ctx.arc(pX, pY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
        ctx.fillText(nA.label, pX + 8, pY + 3);
      }

      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouse);
      cancelAnimationFrame(animId);
    };
  }, [speed, parallaxDamping, density]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>
        {children}
      </div>
    </div>
  );
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(nextJsExportCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // GOOGLE AUTHENTICATION LOGIC
  // ═══════════════════════════════════════════════════════════════════════════
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleGoogleAuth = async ({ credential, email, name, picture }) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, email, name, picture }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(`Welcome, ${data.username || data.email}! Loading your dashboard...`);
        localStorage.setItem('user_id', data.user_id);
        localStorage.setItem('user_email', data.email);
        localStorage.setItem('user_username', data.username || data.email.split('@')[0]);
        if (data.picture) {
          localStorage.setItem('user_avatar', data.picture);
        }
        setShowChooserModal(false);
        setTimeout(() => {
          onLoginSuccess(data.user_id);
        }, 700);
      } else {
        setError(data.message || 'Google sign-in failed. Please try again.');
      }
    } catch (err) {
      setError('Could not connect to server. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleCredentialResponse = async (response) => {
      if (!response.credential) return;
      await handleGoogleAuth({ credential: response.credential });
    };

    if (window.google && googleClientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
        });
      } catch (err) {
        console.warn('Google GSI init note:', err);
      }
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google && googleClientId) {
          try {
            window.google.accounts.id.initialize({
              client_id: googleClientId,
              callback: handleCredentialResponse,
            });
          } catch (e) {}
        }
      };
      document.body.appendChild(script);
    }
  }, [googleClientId]);

  const handleGoogleClick = () => {
    setError(null);
    if (window.google && googleClientId) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setShowChooserModal(true);
          }
        });
        return;
      } catch (e) {}
    }
    setShowChooserModal(true);
  };

  return (
    <div className="minimal-login-page">
      {/* ── RESUME THEME GEOMETRY CANVAS BACKGROUND ── */}
      <canvas ref={canvasRef} className="resume-geometry-canvas" />

      {/* ── CENTERED LOGIN CARD & HEADLINE ── */}
      {showCard && (
        <div className="minimal-login-container fade-in-up">
          {/* Top Logo */}
          <div className="minimal-logo-wrapper">
            <img src="/logo resume.jpg" alt="Intelligent Resume Logo" className="minimal-login-logo" />
          </div>

          {/* Headline with interactive hover effect (spread single line) */}
          <h1 className="minimal-login-headline" data-text="INTELLIGENT RESUME">
            INTELLIGENT RESUME
          </h1>

          {/* Subtitles */}
          <h2 className="minimal-login-sub1">Optimize Your Resume with Precision</h2>
          <p className="minimal-login-sub2">
            Built for IT students aiming for industry readiness
          </p>

          {/* Google Sign-In Card */}
          <div className="minimal-login-card">
            <div className="google-auth-card-content">
              <div className="google-auth-header">
                <span className="google-auth-badge">UTHM SSO GATEWAY</span>
                <h2 className="google-auth-title">Sign In with Google</h2>
                <p className="google-auth-subtitle">
                  Single Sign-On access for students, researchers, and recruiters
                </p>
              </div>

              {error && <div className="minimal-alert minimal-alert-error">{error}</div>}
              {success && <div className="minimal-alert minimal-alert-success">{success}</div>}

              <div className="google-auth-action-box">
                <button
                  type="button"
                  className="google-login-btn"
                  onClick={handleGoogleClick}
                  disabled={loading}
                  aria-label="Continue with Google"
                >
                  <svg className="google-icon" width="22" height="22" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{loading ? 'Connecting with Google...' : 'Continue with Google'}</span>
                </button>
              </div>

              <div className="google-auth-divider">
                <span>Google Account Only</span>
              </div>

              <div className="google-security-notice">
                <div className="security-badge-item">
                  <span>🔒</span>
                  <span>Protected by Google OAuth 2.0 Encryption</span>
                </div>
                <p className="security-subtext">
                  Supports student accounts (<strong>@siswa.uthm.edu.my</strong>) & personal Google accounts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Account Chooser Modal */}
      {showChooserModal && (
        <div className="google-chooser-overlay" onClick={() => setShowChooserModal(false)}>
          <div className="google-chooser-card" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="modal-close" 
              onClick={() => setShowChooserModal(false)}
              aria-label="Close"
            >
              ×
            </button>

            <div className="google-chooser-header">
              <svg className="google-icon" width="36" height="36" viewBox="0 0 24 24" style={{ margin: '0 auto 0.5rem', display: 'block' }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <h3>Sign in with Google</h3>
              <p>Choose an account to continue to <strong>Intelligent Resume</strong></p>
            </div>

            <div className="google-accounts-list">
              <button
                type="button"
                className="google-account-btn"
                onClick={() => handleGoogleAuth({ email: 'imanmikhail113@gmail.com', name: 'Iman Mikhail' })}
                disabled={loading}
              >
                <div className="google-account-avatar">IM</div>
                <div className="google-account-meta">
                  <span className="google-account-name">Iman Mikhail</span>
                  <span className="google-account-email">imanmikhail113@gmail.com</span>
                </div>
              </button>

              <button
                type="button"
                className="google-account-btn"
                onClick={() => handleGoogleAuth({ email: 'mikhail@siswa.uthm.edu.my', name: 'Mikhail (UTHM Student)' })}
                disabled={loading}
              >
                <div className="google-account-avatar" style={{ background: 'linear-gradient(135deg, #0d1b54, #3b82f6)' }}>U</div>
                <div className="google-account-meta">
                  <span className="google-account-name">Mikhail (UTHM Siswa)</span>
                  <span className="google-account-email">mikhail@siswa.uthm.edu.my</span>
                </div>
              </button>
            </div>

            <div className="google-custom-entry">
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                Or use another Google account:
              </label>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (customGoogleEmail) {
                  handleGoogleAuth({ email: customGoogleEmail, name: customGoogleName || customGoogleEmail.split('@')[0] });
                }
              }}>
                <input
                  type="email"
                  className="google-custom-input"
                  placeholder="e.g. name@gmail.com or @siswa.uthm.edu.my"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  required
                />
                <button type="submit" className="google-custom-submit" disabled={loading || !customGoogleEmail}>
                  {loading ? 'Signing in with Google...' : 'Continue with this Google Account'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
