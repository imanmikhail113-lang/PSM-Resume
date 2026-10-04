import React, { useState, useEffect, useRef } from 'react';
import './index.css';

function Login({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot'
  const [forgotStep, setForgotStep] = useState(1);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTIVE GEOMETRIC BACKGROUND CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  const [speed, setSpeed] = useState(1.0); // 0.2x to 3.0x
  const [parallaxDamping, setParallaxDamping] = useState(0.05); // 0.01 to 0.15
  const [density, setDensity] = useState(1.0); // 0.5x to 2.0x
  const [showCard, setShowCard] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef(null);

  // References to keep animation loop in sync with real-time slider controls
  const controlsRef = useRef({ speed: 1.0, parallaxDamping: 0.05, density: 1.0 });
  useEffect(() => {
    controlsRef.current = { speed, parallaxDamping, density };
  }, [speed, parallaxDamping, density]);

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
  // AUTH LOGIC & HANDLERS (PRESERVED FUNCTIONALITY)
  // ═══════════════════════════════════════════════════════════════════════════
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === 'login' || mode === 'register') {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const bodyPayload = mode === 'login' ? { email, password } : { username, email, password };

      try {
        const response = await fetch(`http://localhost:5000${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem('user_id', data.user_id);
          localStorage.setItem('user_email', email);
          localStorage.setItem('user_username', data.username || email.split('@')[0]);

          if (mode === 'register') {
            setSuccess('Registration successful! Logging you in...');
            setTimeout(() => {
              onLoginSuccess(data.user_id);
            }, 1500);
          } else {
            onLoginSuccess(data.user_id);
          }
        } else {
          setError(data.message || 'Authentication failed');
        }
      } catch (err) {
        setError('Could not connect to server.');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'forgot') {
      if (forgotStep === 1) {
        try {
          const response = await fetch(`http://localhost:5000/api/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const data = await response.json();
          if (response.ok) {
            setForgotStep(2);
            setSuccess('Email verified. Please set your new password.');
          } else {
            setError(data.message || 'Email verification failed.');
          }
        } catch (err) {
          setError('Could not connect to server.');
        } finally {
          setLoading(false);
        }
      } else if (forgotStep === 2) {
        if (newPassword !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        if (!newPassword) {
          setError('Password cannot be empty.');
          setLoading(false);
          return;
        }
        try {
          const response = await fetch(`http://localhost:5000/api/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, new_password: newPassword }),
          });
          const data = await response.json();
          if (response.ok) {
            setSuccess('Password reset successfully! Redirecting to login...');
            setTimeout(() => {
              setMode('login');
              setForgotStep(1);
              setPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setSuccess(null);
            }, 3000);
          } else {
            setError(data.message || 'Failed to reset password.');
          }
        } catch (err) {
          setError('Could not connect to server.');
        } finally {
          setLoading(false);
        }
      }
    }
  };

  return (
    <div className="minimal-login-page">
      {/* ── RESUME THEME GEOMETRY CANVAS BACKGROUND ── */}
      <canvas ref={canvasRef} className="resume-geometry-canvas" />

      {/* ── ANIMATION SETTINGS COGWHEEL BUTTON (BOTTOM LEFT) ── */}
      <div className="anim-settings-wrapper">
        <button
          type="button"
          className={`anim-settings-gear-btn ${showControls ? 'active' : ''}`}
          onClick={() => setShowControls(!showControls)}
          title="Animation Settings"
          aria-label="Animation Settings"
        >
          <svg
            className="anim-gear-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>

        {showControls && (
          <div className="anim-settings-popover">
            <div className="anim-popover-header">
              <div className="anim-popover-title">
                <span className="anim-popover-dot" />
                <span>Animation Settings</span>
              </div>
              <button
                type="button"
                className="anim-popover-close"
                onClick={() => setShowControls(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="anim-popover-body">
              <div className="hud-control-row">
                <label>Speed: <span>{speed.toFixed(1)}x</span></label>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                />
              </div>

              <div className="hud-control-row">
                <label>Parallax: <span>{parallaxDamping.toFixed(2)}</span></label>
                <input
                  type="range"
                  min="0.01"
                  max="0.15"
                  step="0.01"
                  value={parallaxDamping}
                  onChange={(e) => setParallaxDamping(parseFloat(e.target.value))}
                />
              </div>

              <div className="hud-control-row">
                <label>Density: <span>{density.toFixed(1)}x</span></label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={density}
                  onChange={(e) => setDensity(parseFloat(e.target.value))}
                />
              </div>

              <div className="anim-popover-actions">
                <button
                  type="button"
                  className={`anim-action-btn ${showCard ? '' : 'hidden-state'}`}
                  onClick={() => setShowCard(!showCard)}
                  title={showCard ? 'Hide Login Card' : 'Show Login Card'}
                >
                  {showCard ? '👁️ Hide Card' : '👁️ Show Card'}
                </button>
                <button
                  type="button"
                  className="anim-action-export-btn"
                  onClick={() => {
                    setShowControls(false);
                    setShowExportModal(true);
                  }}
                  title="Export Next.js Component"
                >
                  ⚡ Export Next.js
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── NEXT.JS INSTANT EXPORT MODAL ── */}
      {showExportModal && (
        <div className="hud-modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="hud-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="hud-modal-header">
              <h3>⚡ Next.js Component Exporter</h3>
              <button
                type="button"
                className="hud-modal-close"
                onClick={() => setShowExportModal(false)}
              >
                ✕
              </button>
            </div>
            <p className="hud-modal-desc">
              Copy and paste this standalone <strong>ResumeGeometryBackground.tsx</strong> component into your Next.js App Router or Pages project.
            </p>
            <pre className="hud-code-preview">
              <code>{nextJsExportCode}</code>
            </pre>
            <div className="hud-modal-actions">
              <button type="button" className="btn-copy-code" onClick={copyToClipboard}>
                {copied ? '✓ Copied to Clipboard!' : '📋 Copy Code'}
              </button>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowExportModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CENTERED LOGIN CARD & HEADLINE ── */}
      {showCard && (
        <div className="minimal-login-container fade-in-up">
          {/* Top Logo */}
          <div className="minimal-logo-wrapper">
            <img src="/new uthm.png" alt="UTHM Logo" className="minimal-login-logo" />
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

          {/* Grey Form Card */}
          <div className="minimal-login-card">
            <form onSubmit={handleSubmit} className="minimal-login-form">
              {mode === 'forgot' && forgotStep === 2 ? (
                <>
                  <div className="minimal-field-group">
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="minimal-login-input disabled-input"
                      placeholder="EMAIL"
                    />
                  </div>

                  <div className="minimal-field-group">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="NEW PASSWORD"
                      required
                      className="minimal-login-input"
                    />
                  </div>

                  <div className="minimal-field-group">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="CONFIRM NEW PASSWORD"
                      required
                      className="minimal-login-input"
                    />
                  </div>
                </>
              ) : (
                <>
                  {mode === 'register' && (
                    <div className="minimal-field-group">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="USERNAME"
                        required
                        className="minimal-login-input"
                      />
                    </div>
                  )}

                  <div className="minimal-field-group">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="EMAIL"
                      required
                      className="minimal-login-input"
                    />
                  </div>

                  {mode !== 'forgot' && (
                    <div className="minimal-field-group">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="PASSWORD"
                        required
                        className="minimal-login-input"
                      />
                    </div>
                  )}
                </>
              )}

              {error && <div className="minimal-alert minimal-alert-error">{error}</div>}
              {success && <div className="minimal-alert minimal-alert-success">{success}</div>}

              {/* Submit Button */}
              <button type="submit" className="minimal-login-submit-btn" disabled={loading}>
                {loading
                  ? 'Please wait...'
                  : mode === 'forgot'
                  ? forgotStep === 1
                    ? 'Verify Email'
                    : 'Reset Password'
                  : mode === 'login'
                  ? 'Login'
                  : 'Register'}
              </button>

              {/* Forgot Password link inside card */}
              {mode === 'login' && (
                <a
                  href="#forgot"
                  className="minimal-forgot-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setMode('forgot');
                    setForgotStep(1);
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  Forgot Password?
                </a>
              )}

              {mode === 'forgot' && (
                <a
                  href="#login"
                  className="minimal-forgot-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setMode('login');
                    setForgotStep(1);
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  ← Back to Login
                </a>
              )}
            </form>
          </div>

          {/* Footer text link below card */}
          {mode !== 'forgot' && (
            <div className="minimal-login-footer">
              <span className="minimal-footer-text">
                {mode === 'login' ? 'New User? ' : 'Already have an account? '}
              </span>
              <a
                href="#toggle"
                className="minimal-footer-link"
                onClick={(e) => {
                  e.preventDefault();
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError(null);
                  setSuccess(null);
                }}
              >
                {mode === 'login' ? 'Register Here.' : 'Login Here.'}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Login;
