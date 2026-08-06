import React, { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function TransitionOverlay() {
  const container = useRef(null);
  const location = useLocation();

  useGSAP(() => {
    // Reveal animation on every route change
    gsap.set('.transition-overlay', { height: '100vh', top: 0 });
    gsap.to('.transition-overlay', {
      height: '0vh',
      duration: 1,
      ease: 'power4.inOut',
      stagger: 0.1,
    });
  }, { dependencies: [location.pathname], scope: container });

  return (
    <div className="transition" ref={container}>
      <div className="transition-overlay overlay-1"></div>
      <div className="transition-overlay overlay-2"></div>
      <div className="transition-overlay overlay-3"></div>
      <div className="transition-overlay overlay-4"></div>
      <div className="transition-overlay overlay-5"></div>
    </div>
  );
}
