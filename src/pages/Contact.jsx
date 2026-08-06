import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TICKETS } from '../data/tickets';

export default function Contact() {
  const containerRef = useRef(null);
  const location = useLocation();
  // Pre-selected ticket from "Buy Now" click (passed via router state)
  const [selectedTicket, setSelectedTicket] = useState(location.state?.ticket || '');

  useEffect(() => {
    window.scrollTo(0, 0);
    const container = containerRef.current;
    if (!container) return;

    let isDesktop = window.innerWidth > 1000;
    let animationId = null;
    let mouseMoveListener = null;
    let mouseX = 0, mouseY = 0;
    let lastMouseX = 0, lastMouseY = 0;
    let lastRemovalTime = 0;
    let isCursorInContainer = false;
    const trail = [];

    const config = {
      imageCount: 10,
      imageLifespan: 800,
      removalDelay: 60,
      mouseThreshold: 80,
      inDuration: 600,
      inEasing: 'cubic-bezier(.07,.5,.5,1)',
      outDuration: 400,
      outEasing: 'cubic-bezier(.87, 0, .13, 1)',
    };

    const images = Array.from(
      { length: config.imageCount },
      (_, i) => `/images/hero/img${i + 1}.jpg`
    );

    // Preload images
    images.forEach((path) => {
      const img = new Image();
      img.src = path;
    });

    // Floating elements
    const floatingContainer = container.querySelector('.floating-elements');
    if (floatingContainer) {
      for (let i = 0; i < 12; i++) {
        const element = document.createElement('div');
        element.className = 'floating-element';
        element.style.left = `${Math.random() * 100}%`;
        element.style.animationDelay = `${Math.random() * 8}s`;
        element.style.animationDuration = 8 + Math.random() * 4 + 's';
        floatingContainer.appendChild(element);
      }
    }

    const isInContainer = (x, y) => {
      const rect = container.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };

    const hasMovedEnough = () => {
      const distance = Math.sqrt(
        Math.pow(mouseX - lastMouseX, 2) + Math.pow(mouseY - lastMouseY, 2)
      );
      return distance > config.mouseThreshold;
    };

    const createImage = () => {
      const img = document.createElement('img');
      img.classList.add('trail-img');
      const randomIndex = Math.floor(Math.random() * images.length);
      const rotation = (Math.random() - 0.5) * 40;
      img.src = images[randomIndex];
      const rect = container.getBoundingClientRect();
      const relativeX = mouseX - rect.left;
      const relativeY = mouseY - rect.top;
      img.style.left = `${relativeX}px`;
      img.style.top = `${relativeY}px`;
      img.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(0)`;
      img.style.transition = `transform ${config.inDuration}ms ${config.inEasing}`;
      container.appendChild(img);
      setTimeout(() => {
        img.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(1)`;
      }, 10);
      trail.push({
        element: img,
        rotation,
        removeTime: Date.now() + config.imageLifespan,
      });
    };

    const removeOldImages = () => {
      const now = Date.now();
      if (now - lastRemovalTime < config.removalDelay || trail.length === 0) return;
      const oldestImage = trail[0];
      if (now >= oldestImage.removeTime) {
        const imgToRemove = trail.shift();
        imgToRemove.element.style.transition = `transform ${config.outDuration}ms ${config.outEasing}`;
        imgToRemove.element.style.transform = `translate(-50%, -50%) rotate(${imgToRemove.rotation}deg) scale(0)`;
        lastRemovalTime = now;
        setTimeout(() => {
          if (imgToRemove.element.parentNode) {
            imgToRemove.element.parentNode.removeChild(imgToRemove.element);
          }
        }, config.outDuration);
      }
    };

    const startAnimation = () => {
      if (!isDesktop) return;
      mouseMoveListener = (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        isCursorInContainer = isInContainer(mouseX, mouseY);
        if (isCursorInContainer && hasMovedEnough()) {
          lastMouseX = mouseX;
          lastMouseY = mouseY;
          createImage();
        }
      };
      document.addEventListener('mousemove', mouseMoveListener);
      const animate = () => {
        removeOldImages();
        animationId = requestAnimationFrame(animate);
      };
      animate();
    };

    const stopAnimation = () => {
      if (mouseMoveListener) {
        document.removeEventListener('mousemove', mouseMoveListener);
        mouseMoveListener = null;
      }
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      trail.forEach((item) => {
        if (item.element.parentNode) item.element.parentNode.removeChild(item.element);
      });
      trail.length = 0;
    };

    const handleResize = () => {
      const wasDesktop = isDesktop;
      isDesktop = window.innerWidth > 1000;
      if (isDesktop && !wasDesktop) startAnimation();
      else if (!isDesktop && wasDesktop) stopAnimation();
    };

    window.addEventListener('resize', handleResize);
    if (isDesktop) startAnimation();

    return () => {
      stopAnimation();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('.submit-btn');
    const successMessage = document.getElementById('successMessage');
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    setTimeout(() => {
      form.reset();
      setSelectedTicket('');
      submitBtn.textContent = 'Register Now';
      submitBtn.disabled = false;
      successMessage.style.display = 'block';
      setTimeout(() => {
        successMessage.style.display = 'none';
      }, 5000);
    }, 1500);
  };

  const selectedTicketObj = TICKETS.find(t => t.id === selectedTicket);

  return (
    <div className="page contact-page">
      <section className="contact trail-container" ref={containerRef}>
        <div className="floating-elements"></div>

        {/* Left Column */}
        <div className="contact-left">
          <div className="contact-card-header-main">
            <h1>Join KickStart</h1>
            <p>
              Secure your spot at KJ Somaiya College of Engineering's flagship
              placement preparation event. Fill in your details below — alumni
              sessions, aptitude tests, mock interviews and networking await you.
            </p>
          </div>
          <div className="contact-info">
            <div className="contact-info-item">
              <p className="label">Event Enquiries</p>
              <p><a href="mailto:alumni@somaiya.edu" target="_blank" rel="noreferrer">alumni@somaiya.edu</a></p>
            </div>
            <div className="contact-info-item">
              <p className="label">Dates</p>
              <p>03 Feb – 08 Feb 2026</p>
            </div>
            <div className="contact-info-item">
              <p className="label">Venue</p>
              <p>KJ Somaiya College of Engineering, Mumbai</p>
            </div>
          </div>
        </div>

        {/* Form Column */}
        <div className="contact-form-container">
          <div className="form-header">
            <h2>Register Now</h2>
            <p>Complete all fields to confirm your participation</p>
          </div>
          <form className="contact-form" id="contactForm" onSubmit={handleSubmit}>

            {/* Ticket selector — auto-populated when coming from Buy Now */}
            <div className="form-group full-width">
              <label htmlFor="ticketType">Ticket Pass Type</label>
              <select
                id="ticketType"
                name="ticketType"
                required
                value={selectedTicket}
                onChange={(e) => setSelectedTicket(e.target.value)}
              >
                <option value="">Select a ticket pass</option>
                {TICKETS.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} — ₹{t.price} ({t.tags})
                  </option>
                ))}
              </select>
              {selectedTicketObj && (
                <div className="selected-ticket-note">
                  <span>✦ {selectedTicketObj.desc}</span>
                  <button type="button" className="clear-ticket" onClick={() => setSelectedTicket('')}>
                    Change
                  </button>
                </div>
              )}
            </div>

            <div className="form-group full-width">
              <label htmlFor="fullName">Full Name</label>
              <input type="text" id="fullName" name="fullName" placeholder="e.g. Priya Sharma" required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="rollNumber">Roll Number</label>
                <input type="text" id="rollNumber" name="rollNumber" placeholder="e.g. 2021CE001" required />
              </div>
              <div className="form-group">
                <label htmlFor="department">Department</label>
                <select id="department" name="department" required>
                  <option value="">Select department</option>
                  <option value="ce">Computer Engineering</option>
                  <option value="it">Information Technology</option>
                  <option value="extc">Electronics &amp; Telecom</option>
                  <option value="mech">Mechanical Engineering</option>
                  <option value="civil">Civil Engineering</option>
                  <option value="elex">Electronics Engineering</option>
                  <option value="aids">AI &amp; Data Science</option>
                  <option value="aiml">AI &amp; Machine Learning</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="year">Year</label>
                <select id="year" name="year" required>
                  <option value="">Select year</option>
                  <option value="fe">First Year (FE)</option>
                  <option value="se">Second Year (SE)</option>
                  <option value="te">Third Year (TE)</option>
                  <option value="be">Final Year (BE)</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="collegeEmail">College Email</label>
                <input type="email" id="collegeEmail" name="collegeEmail" placeholder="student@somaiya.edu" required />
              </div>
            </div>

            <div className="form-group full-width">
              <label htmlFor="phone">Phone Number</label>
              <input type="tel" id="phone" name="phone" placeholder="+91 98765 43210" required />
            </div>

            <div className="form-group full-width">
              <label htmlFor="resume">Resume Upload (PDF / DOC)</label>
              <input type="file" id="resume" name="resume" accept=".pdf,.doc,.docx" />
            </div>

            <div className="form-group full-width">
              <label htmlFor="whyKickstart">Why do you want to join KickStart?</label>
              <textarea id="whyKickstart" name="whyKickstart" placeholder="Tell us why you want to join KickStart..." required></textarea>
            </div>

            <div className="form-group full-width form-group-checkbox">
              <label className="checkbox-label" htmlFor="terms">
                <input type="checkbox" id="terms" name="terms" required />
                <span>
                  I agree to the <a href="#" target="_blank" rel="noreferrer">Terms &amp; Conditions</a> and confirm that all information provided is accurate.
                </span>
              </label>
            </div>

            <button type="submit" className="submit-btn" id="registerBtn">
              Register Now
            </button>
            <div className="success-message" id="successMessage" style={{ display: 'none' }}>
              <p>🎉 Registration submitted! We'll confirm your spot within 24 hours at your college email.</p>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
