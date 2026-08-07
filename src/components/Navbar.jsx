import React, { useState } from 'react';
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

  const handleAnchorClick = (e, hash) => {
    e.preventDefault();
    if (isMenuOpen) setIsMenuOpen(false);

    const isHomePage = location.pathname === '/';

    const doScroll = () => {
      const target = document.querySelector(hash);
      if (!target || !lenis) return;

      const triggers = ScrollTrigger.getAll();
      const matchedTrigger = triggers.find(
        (st) => st.trigger === target || st.trigger?.contains(target)
      );

      if (matchedTrigger) {
        lenis.scrollTo(matchedTrigger.start, { 
          duration: 1.2, 
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) 
        });
      } else {
        lenis.scrollTo(target, { duration: 1.2, offset: -80 });
      }
    };

    if (isHomePage) {
      setTimeout(doScroll, isMenuOpen ? 400 : 0);
    } else {
      // Redirect to Home page and pass the hash to scroll on load
      navigate('/' + hash);
    }
  };

  return (
    <>
      <nav>
        <div className="logo-wrapper">
          <Link to="/" onClick={handleLinkClick}>
            <img src={`${import.meta.env.BASE_URL}Logo.jpg`} className="logo-img" alt="KickStart Logo" />
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="nav-desktop-links">
          <Link to="/" onClick={handleLinkClick}>Home</Link>
          <a href="#events" onClick={(e) => handleAnchorClick(e, '#events')}>Events</a>
          <a href="#schedule" onClick={(e) => handleAnchorClick(e, '#events')}>Schedule</a>
          <a href="#speakers" onClick={(e) => handleAnchorClick(e, '#speakers')}>Speakers</a>
          <a href="#tickets" onClick={(e) => handleAnchorClick(e, '#tickets')}>Tickets</a>
          <a href="#faq" onClick={(e) => handleAnchorClick(e, '#faq')}>FAQ</a>
          <a href="#highlights" onClick={(e) => handleAnchorClick(e, '#highlights')}>Highlights</a>
          <a href="#about" onClick={(e) => handleAnchorClick(e, '#about')}>About</a>
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
            <Link to="/" onClick={handleLinkClick}>Home</Link>
          </div>
          <div className="nav-item" style={{ transitionDelay: '0.2s' }}>
            <a href="#events" onClick={(e) => handleAnchorClick(e, '#events')}>Events</a>
          </div>
          <div className="nav-item" style={{ transitionDelay: '0.25s' }}>
            <a href="#events" onClick={(e) => handleAnchorClick(e, '#events')}>Schedule</a>
          </div>
          <div className="nav-item" style={{ transitionDelay: '0.3s' }}>
            <a href="#speakers" onClick={(e) => handleAnchorClick(e, '#speakers')}>Speakers</a>
          </div>
          <div className="nav-item" style={{ transitionDelay: '0.35s' }}>
            <a href="#tickets" onClick={(e) => handleAnchorClick(e, '#tickets')}>Tickets</a>
          </div>
          <div className="nav-item" style={{ transitionDelay: '0.4s' }}>
            <a href="#faq" onClick={(e) => handleAnchorClick(e, '#faq')}>FAQ</a>
          </div>
          <div className="nav-item" style={{ transitionDelay: '0.45s' }}>
            <a href="#highlights" onClick={(e) => handleAnchorClick(e, '#highlights')}>Highlights</a>
          </div>
          <div className="nav-item" style={{ transitionDelay: '0.5s' }}>
            <a href="#about" onClick={(e) => handleAnchorClick(e, '#about')}>About</a>
          </div>
          <div className="nav-item" style={{ transitionDelay: '0.6s' }}>
            <Link to="/contact" onClick={handleLinkClick} style={{ color: 'var(--accent1)' }}>Register</Link>
          </div>
        </div>
      </div>
    </>
  );
}
