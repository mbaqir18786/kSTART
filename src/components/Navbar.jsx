import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLenis } from '@studio-freight/react-lenis';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const lenis = useLenis();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLinkClick = () => {
    if (isMenuOpen) setIsMenuOpen(false);
  };

  const handleHomeClick = (e) => {
    if (isMenuOpen) setIsMenuOpen(false);
    
    if (location.pathname === '/') {
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(0, { 
          duration: 1.2, 
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) 
        });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Smooth scroll to a hash on the current page
  const doScroll = (hash) => {
    const target = document.querySelector(hash);
    if (!target || !lenis) return;

    const triggers = ScrollTrigger.getAll();
    const matchedTrigger = triggers.find(
      (st) => st.trigger === target || st.trigger?.contains(target)
    );

    if (matchedTrigger) {
      lenis.scrollTo(matchedTrigger.start, {
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
    } else {
      lenis.scrollTo(target, { duration: 1.2, offset: -80 });
    }
  };

  // When navigating from /contact back to home with a hash,
  // wait for the home page to mount then scroll
  useEffect(() => {
    if (location.pathname === '/' && location.state?.scrollTo) {
      const hash = location.state.scrollTo;
      // Delay to allow page + GSAP to initialize
      const timer = setTimeout(() => doScroll(hash), 600);
      return () => clearTimeout(timer);
    }
  }, [location]);

  const handleAnchorClick = (e, hash) => {
    e.preventDefault();
    if (isMenuOpen) setIsMenuOpen(false);

    const isHomePage = location.pathname === '/';

    if (isHomePage) {
      // Small delay if mobile menu was open (for close animation)
      setTimeout(() => doScroll(hash), isMenuOpen ? 400 : 0);
    } else {
      // Navigate to home and pass the hash via state
      navigate('/', { state: { scrollTo: hash } });
    }
  };

  // Nav links config — single source of truth
  const navLinks = [
    { label: 'About',      hash: '#about' },
    { label: 'Events',     hash: '#events' },
    { label: 'Tickets',    hash: '#tickets' },
    { label: 'Highlights', hash: '#highlights' },
    { label: 'Speakers',   hash: '#speakers' },
    { label: 'FAQ',        hash: '#faq' },
  ];

  return (
    <>
      <nav>
        <div className="logo-wrapper">
          <Link to="/" onClick={handleLinkClick} className="logo-link">
            <img src={`${import.meta.env.BASE_URL}Logo.jpg`} className="logo-img" alt="KickStart Logo" />
            <span className="logo-text">Alumni Cell</span>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="nav-desktop-links">
          <Link to="/" onClick={handleHomeClick}>Home</Link>
          {navLinks.map(({ label, hash }) => (
            <a key={hash} href={hash} onClick={(e) => handleAnchorClick(e, hash)}>
              {label}
            </a>
          ))}
          <Link to="/contact" className="nav-cta" onClick={handleLinkClick}>Register</Link>
        </div>

        {/* Hamburger Toggle (Mobile Only) */}
        <div
          className={`menu-toggle-btn ${isMenuOpen ? 'menu-open' : ''}`}
          onClick={toggleMenu}
        >
          <div className="menu-toggle-btn-wrapper">
            <span className="menu-bar"></span>
            <span className="menu-bar"></span>
            <span className="menu-bar"></span>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      <div className={`nav-overlay ${isMenuOpen ? 'open' : ''}`}>
        <div className="nav-items">
          <div className="nav-item" style={{ transitionDelay: '0.1s' }}>
            <Link to="/" onClick={handleHomeClick}>Home</Link>
          </div>
          {navLinks.map(({ label, hash }, i) => (
            <div
              key={hash}
              className="nav-item"
              style={{ transitionDelay: `${0.15 + i * 0.05}s` }}
            >
              <a href={hash} onClick={(e) => handleAnchorClick(e, hash)}>{label}</a>
            </div>
          ))}
          <div className="nav-item" style={{ transitionDelay: `${0.15 + navLinks.length * 0.05}s` }}>
            <Link to="/contact" onClick={handleLinkClick} style={{ color: 'var(--accent1)' }}>Register</Link>
          </div>
        </div>
      </div>
    </>
  );
}
