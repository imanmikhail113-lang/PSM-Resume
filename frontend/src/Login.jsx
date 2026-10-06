import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { authRequest, rememberSession } from './api';
const ResumeScene = lazy(() => import('./ResumeScene'));
let googleScript;
let configRequest;
function loadConfig() {
  if (!configRequest) configRequest = authRequest('config').finally(() => { configRequest = null; });
  return configRequest;
}
function loadGoogle() {
  if (window.google?.accounts) return Promise.resolve();
  if (!googleScript) googleScript = new Promise((resolve,reject) => {
    const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
    script.onload=resolve;script.onerror=()=>{script.remove();googleScript=null;reject(new Error('Google could not load. Check your connection and retry.'));};
    document.head.appendChild(script);
  });
  return googleScript;
}
export default function Login({ onLoginSuccess }) {
  const button=useRef(null);
  const callback=useRef(onLoginSuccess);
  useEffect(()=>{callback.current=onLoginSuccess;},[onLoginSuccess]);
  const [error,setError]=useState('');
  const [status,setStatus]=useState('loading');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let active=true;
    async function init() {
      try {
        const config=await loadConfig();
        if(!active)return;
        if(!config.client_id) {setStatus('unconfigured');return;}
        await loadGoogle();if(!active)return;
        window.google.accounts.id.initialize({ client_id:config.client_id, nonce:config.nonce, auto_select:false,
          callback:async ({credential})=>{
            if(!active)return;
            setStatus('signing');setError('');
            try {
              const user=await authRequest('google',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential})});
              if(active){rememberSession(user);callback.current(user.user_id);}
            } catch(e){if(active){setError(e.message);setStatus('error');}}
          }
        });
        window.google.accounts.id.renderButton(button.current,{theme:'filled_black',size:'large',shape:'pill',text:'continue_with',width:280});
        setStatus('ready');
      } catch(e){if(active){setError(e.message);setStatus('error');}}
    }
    init();
    return ()=>{active=false;};
  },[attempt]);
  return <div className="studio-page">
    <header className="studio-nav"><a className="studio-brand" href="#"><span className="brand-symbol">↗</span> resume<span className="brand-dot">.</span><span className="brand-caption">INTELLIGENCE FOR YOUR NEXT MOVE</span></a><a className="nav-how" href="#how-it-works">How it works <span>↗</span></a></header>
    <main>
      <section className="studio-hero">
        <div className="hero-copy"><div className="eyebrow"><span className="live-dot"/> A LITTLE CLARITY. A BIG NEXT STEP.</div>
          <h1>Your potential.<br/>On paper.<br/><span>In focus.</span></h1>
          <p className="hero-description">Turn your resume into a clearer picture of what comes next. Discover your strengths, find the gaps, and make your next application count.</p>
          <div className="signin-box"><p className="signin-label">Your next chapter starts here</p>
            <div className="google-button" ref={button} hidden={status==='signing' || status==='error'}/>
            {status==='loading' && <p className="auth-note" role="status">Connecting to Google…</p>}
            {status==='signing' && <p className="auth-note" role="status">Verifying your Google account…</p>}
            {status==='unconfigured' && <p className="auth-note">Google sign-in will be available once the site is configured.</p>}
            {error && <div className="auth-error" role="alert">{error}<button onClick={()=>{setError('');setStatus('loading');setAttempt(v=>v+1);}}>Try again ↗</button></div>}
            <p className="signin-footnote">One Google account. Your own private workspace.</p>
          </div>
        </div>
        <div className="hero-art"><div className="art-index">01 / A NEW PERSPECTIVE</div><Suspense fallback={<div className="resume-scene"/>}><ResumeScene/></Suspense><div className="art-chip chip-top"><span>✦</span> Built around your potential</div><div className="art-chip chip-bottom"><span className="live-dot"/> A clearer path forward <span>↗</span></div><div className="art-caption">YOUR EXPERIENCE, SEEN DIFFERENTLY.</div></div>
      </section>
      <section id="how-it-works" className="features-strip"><div className="strip-intro"><span className="eyebrow">LESS GUESSWORK.</span><h2>More direction.</h2></div>{[['01','Understand your resume','Get a breakdown of your structure, skills, and ATS readiness.'],['02','Find your fit','Compare your experience with a role or explore career matches.'],['03','Make your next move','Use focused feedback to improve your next application.']].map(([n,title,body])=><article key={n}><span className="feature-number">{n} /</span><h3>{title}</h3><p>{body}</p></article>)}</section>
    </main><footer className="studio-footer"><span>Resume intelligence. Human ambition.</span><span>Made for what’s next <span className="brand-dot">↗</span></span></footer>
  </div>;
}
