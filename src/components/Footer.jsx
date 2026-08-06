import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const footerRef = useRef(null);
  const explosionContainerRef = useRef(null);

  useEffect(() => {
    let hasExploded = false;
    const explosionContainer = explosionContainerRef.current;
    const footer = footerRef.current;

    const config = {
      gravity: 0.5,
      friction: 0.98,
      imageSize: 60,
      horizontalForce: 20,
      verticalForce: 15,
      rotationSpeed: 10,
    };

    const imageParticleCount = 10;
    const imagePaths = Array.from(
      { length: imageParticleCount },
      (_, i) => `/images/hero/img${i + 1}.jpg`
    );

    imagePaths.forEach((path) => {
      const img = new Image();
      img.src = path;
    });

    const createParticles = () => {
      if (!explosionContainer) return;
      explosionContainer.innerHTML = '';
      imagePaths.forEach((path) => {
        const particle = document.createElement('img');
        particle.src = path;
        particle.classList.add('explosion-particle-img');
        particle.style.width = `${config.imageSize}px`;
        explosionContainer.appendChild(particle);
      });
    };

    class Particle {
      constructor(element) {
        this.element = element;
        this.x = 0;
        this.y = 0;
        this.vx = (Math.random() - 0.5) * config.horizontalForce;
        this.vy = -config.verticalForce - Math.random() * 10;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * config.rotationSpeed;
      }

      update() {
        this.vy += config.gravity;
        this.vx *= config.friction;
        this.vy *= config.friction;
        this.rotationSpeed *= config.friction;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        this.element.style.transform = `translate(${this.x}px, ${this.y}px) rotate(${this.rotation}deg)`;
      }
    }

    const explode = () => {
      if (hasExploded || !explosionContainer) return;
      hasExploded = true;

      createParticles();
      const particleElements = explosionContainer.querySelectorAll('.explosion-particle-img');
      const particles = Array.from(particleElements).map(
        (element) => new Particle(element)
      );

      let animationId;
      const animate = () => {
        particles.forEach((particle) => particle.update());
        animationId = requestAnimationFrame(animate);
        if (
          particles.every(
            (particle) => particle.y > explosionContainer.offsetHeight / 2
          )
        ) {
          cancelAnimationFrame(animationId);
        }
      };
      animate();
    };

    const checkFooterPosition = () => {
      if (!footer || !explosionContainer) return;
      const footerRect = footer.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      if (footerRect.top > viewportHeight + 100) {
        hasExploded = false;
      }
      
      if (!hasExploded && footerRect.top <= viewportHeight + 250) {
        explode();
      }
    };

    let checkTimeout;
    const handleScroll = () => {
      clearTimeout(checkTimeout);
      checkTimeout = setTimeout(checkFooterPosition, 5);
    };

    const handleResize = () => {
      hasExploded = false;
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    createParticles();
    setTimeout(checkFooterPosition, 500);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      clearTimeout(checkTimeout);
    };
  }, []);

  return (
    <footer ref={footerRef}>
      <div className="footer-container">
        <div className="footer-symbols footer-symbols-1">
          <img src="/images/global/s6.png" alt="" />
          <img src="/images/global/s6.png" alt="" />
        </div>
        <div className="footer-symbols footer-symbols-2">
          <img src="/images/global/s6.png" alt="" />
          <img src="/images/global/s6.png" alt="" />
        </div>
        <div className="footer-header">
          <h1>KickStart</h1>
        </div>
        <div className="footer-row">
          <div className="footer-col">
            <p>Navigate</p>
            <p><Link to="/">Home</Link></p>
            <p><a href="/#events">Events</a></p>
            <p><a href="/#schedule">Schedule</a></p>
          </div>
          <div className="footer-col">
            <p>Participate</p>
            <p><Link to="/contact">Register</Link></p>
            <p><a href="/#highlights">Highlights</a></p>
            <p><a href="/#about">About</a></p>
          </div>
          <div className="footer-col">
            <p>Connect</p>
            <p>
              <a href="mailto:alumni@somaiya.edu" target="_blank" rel="noreferrer">Email Us</a>
            </p>
            <p>
              <a href="https://www.somaiya.edu" target="_blank" rel="noreferrer">KJ Somaiya</a>
            </p>
          </div>
          <div className="footer-col">
            <p>Institute</p>
            <p>
              <a href="https://kjsce.somaiya.edu" target="_blank" rel="noreferrer">KJSCE Official</a>
            </p>
            <p>
              <Link to="/contact">Register Now</Link>
            </p>
          </div>
        </div>
        <div className="copyright-info">
          <p className="mn">© — KickStart // KJ Somaiya College of Engineering // 2026</p>
          <p className="mn"></p>
        </div>
        <div className="explosion-container" ref={explosionContainerRef}></div>
      </div>
    </footer>
  );
}
