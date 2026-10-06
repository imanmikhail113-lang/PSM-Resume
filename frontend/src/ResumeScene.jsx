import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ResumeScene() {
  const host = useRef(null);
  useEffect(() => {
    const container = host.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0, 9);
    scene.add(new THREE.AmbientLight(0xffffff, 2));
    const light = new THREE.DirectionalLight(0xffbdc6, 5);
    light.position.set(3, 4, 5); scene.add(light);
    const group = new THREE.Group(); scene.add(group);
    const paper = new THREE.MeshPhysicalMaterial({ color: 0xfff5f6, roughness: .28, metalness: .15, clearcoat: 1 });
    const ink = new THREE.MeshStandardMaterial({ color: 0x321619, roughness: .7 });
    const accent = new THREE.MeshStandardMaterial({ color: 0xff344b, emissive: 0x9c1529, emissiveIntensity: .2 });
    function box(w, h, d, x, y, z, material) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x,y,z); group.add(mesh); return mesh;
    }
    box(2.65,3.5,.09,0,0,0,paper);
    box(2.65,3.5,.06,.16,-.13,-.19,ink);
    box(.48,.48,.03,-.77,1.04,.065,accent);
    box(.95,.13,.03,.16,1.15,.065,ink);
    box(.7,.065,.03,.04,.93,.065,ink);
    for(let i=0;i<9;i++) box(i%3===0 ? 1.2:1.9,i%3===0?.085:.045,.025,i%3===0?-.32:0,.42-i*.21,.065,ink);
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.36,.018,8,100),accent);
    orbit.rotation.set(.8,.5,.2); scene.add(orbit);
    const knot = new THREE.Mesh(new THREE.IcosahedronGeometry(.28,0),accent);
    scene.add(knot);
    const pointer = { x:0,y:0 };
    const move = e => { const r=container.getBoundingClientRect(); pointer.x=(e.clientX-r.left)/r.width-.5; pointer.y=(e.clientY-r.top)/r.height-.5; };
    container.addEventListener('pointermove',move);
    const resize = () => { const w=container.clientWidth,h=container.clientHeight; renderer.setSize(w,h); camera.aspect=w/h;camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    function render(t=0) {
      const time=reduced.matches?0:t*.001;
      group.rotation.set(.08+pointer.y*.12,-.22+pointer.x*.25, -.08+Math.sin(time*.5)*.035);
      group.position.y=Math.sin(time*.7)*.1;
      knot.position.set(Math.cos(time*.4)*2.45,Math.sin(time*.4)*2,.4);
      knot.rotation.y=time*.4;
      renderer.render(scene,camera);
      if (!document.hidden && !reduced.matches) frame=requestAnimationFrame(render);
    }
    const restart = () => { cancelAnimationFrame(frame); render(); };
    document.addEventListener('visibilitychange',restart); reduced.addEventListener('change',restart);
    render();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); container.removeEventListener('pointermove',move);
      document.removeEventListener('visibilitychange',restart); reduced.removeEventListener('change',restart);
      scene.traverse(o=>{ o.geometry?.dispose(); }); paper.dispose();ink.dispose();accent.dispose();
      renderer.dispose();renderer.domElement.remove();
    };
  },[]);
  return <div className="resume-scene" ref={host} aria-hidden="true"><div className="scene-fallback">Your next chapter.</div></div>;
}
