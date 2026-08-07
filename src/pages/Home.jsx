import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useLenis } from '@studio-freight/react-lenis';
import { TICKETS } from '../data/tickets';
import { SPEAKERS, FAQS } from '../data/eventContent';
gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const container = useRef(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(1);
  const totalImages = 10;
  const location = useLocation();
  const lenis = useLenis();
  const [activeFaq, setActiveFaq] = useState(null);

  // Scroll to hash on load (e.g. when navigating from /contact to /#tickets)
  useEffect(() => {
    if (!lenis || !location.hash) return;
    const hash = location.hash;
    const tryScroll = () => {
      const target = document.querySelector(hash);
      if (!target) return;
      const triggers = ScrollTrigger.getAll();
      const matched = triggers.find(st => st.trigger === target || st.trigger?.contains(target));
      if (matched) {
        lenis.scrollTo(matched.start, { duration: 1.2 });
      } else {
        lenis.scrollTo(target, { duration: 1.2, offset: -80 });
      }
    };
    // Wait for page to fully mount and GSAP to initialize
    const timer = setTimeout(tryScroll, 600);
    return () => clearTimeout(timer);
  }, [lenis, location.hash]);

  // Cycling hero image
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev >= totalImages ? 1 : prev + 1));
    }, 250);
    return () => clearInterval(interval);
  }, []);

  useGSAP((context) => {
    // Hero ScrollTrigger
    const heroScroll = ScrollTrigger.create({
      trigger: '.hero-img-holder',
      start: 'top bottom',
      end: 'top top',
      onUpdate: (self) => {
        const progress = self.progress;
        gsap.set('.hero-img', {
          y: `${-110 + 110 * progress}%`,
          scale: 0.25 + 0.75 * progress,
          rotation: -15 + 15 * progress,
        });
      },
    });

    // Ambient Video ScrollTrigger
    const videoScroll = ScrollTrigger.create({
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        gsap.set('.hero-bg-video', {
          opacity: 1 - self.progress,
          filter: `blur(${self.progress * 20}px)`,
          scale: 1 + self.progress * 0.05,
        });
      },
    });

    // Featured Work (Event Timeline) ScrollTrigger exactly like original
    const featuredCardPosSmall = [
      { y: 500, x: 1000 },
      { y: 100, x: 100 },
      { y: 1250, x: 1950 },
      { y: 1500, x: 850 },
      { y: 200, x: 2100 },
      { y: 250, x: 600 },
      { y: 1100, x: 1650 },
      { y: 1000, x: 800 },
      { y: 900, x: 2200 },
      { y: 150, x: 1600 },
    ];
    const featuredCardPosLarge = [
      { y: 800, x: 5000 },
      { y: 2000, x: 3000 },
      { y: 240, x: 4450 },
      { y: 1200, x: 3450 },
      { y: 500, x: 2200 },
      { y: 750, x: 1100 },
      { y: 1850, x: 3350 },
      { y: 2200, x: 1300 },
      { y: 3000, x: 1950 },
      { y: 500, x: 4500 },
    ];

    const featuredCardPos = window.innerWidth >= 1600 ? featuredCardPosLarge : featuredCardPosSmall;
    const moveDistance = window.innerWidth * 4;
    const root = container.current;
    const featuredTitles = root.querySelector(".featured-titles");
    const featuredImgCards = root.querySelectorAll(".featured-img-card");
    const indicators = root.querySelectorAll(".indicator");

    // Force 3D context on parent
    const featuredImages = root.querySelector(".featured-images");
    if (featuredImages) {
      featuredImages.style.transformStyle = 'preserve-3d';
      featuredImages.style.perspective = '500px';
    }

    let mm = gsap.matchMedia();

    // Desktop: Pin and horizontal scroll
    mm.add("(min-width: 1000px)", () => {
      featuredImgCards.forEach((card, index) => {
        const position = featuredCardPos[index];
        gsap.set(card, {
          x: position?.x || 0,
          y: position?.y || 0,
          z: -1500,
          scale: 0,
        });
      });

      const featuredScroll = ScrollTrigger.create({
        trigger: ".featured-work",
        start: "top top",
        end: `+=${window.innerHeight * 5}px`,
        pin: true,
        scrub: 1,
        onUpdate: (self) => {
          const xPosition = -moveDistance * self.progress;
          gsap.set(featuredTitles, {
            x: xPosition,
          });

          featuredImgCards.forEach((card, index) => {
            const staggerOffset = index * 0.075;
            const scaledProgress = (self.progress - staggerOffset) * 2;
            const individualProgress = Math.max(0, Math.min(1, scaledProgress));
            const newZ = -1500 + (1500 + 1500) * individualProgress;
            const scaleProgress = Math.min(1, individualProgress * 10);
            const scale = Math.max(0, Math.min(1, scaleProgress));
            gsap.set(card, {
              z: newZ,
              scale: scale,
            });
          });

          const totalIndicators = indicators.length;
          const progressPerIndicator = 1 / totalIndicators;
          indicators.forEach((indicator, index) => {
            const indicatorStart = index * progressPerIndicator;
            const indicatorOpacity = self.progress > indicatorStart ? 1 : 0.2;
            gsap.to(indicator, {
              opacity: indicatorOpacity,
              duration: 0.3,
            });
          });
        },
      });

      return () => {
        featuredScroll.kill();
      };
    });

    // Mobile: Simple clean vertical timeline fade-in
    mm.add("(max-width: 999px)", () => {
      // Clear out any desktop properties instantly on resize
      gsap.set([featuredTitles, featuredImgCards], { clearProps: "all" });

      const steps = root.querySelectorAll(".featured-title-wrapper");
      const mobileScrollTriggers = [];

      steps.forEach((step) => {
        const trigger = ScrollTrigger.create({
          trigger: step,
          start: "top 80%",
          end: "bottom 20%",
          onEnter: () => {
            gsap.fromTo(step, 
              { opacity: 0, y: 30 },
              { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
            );
          },
          once: true
        });
        mobileScrollTriggers.push(trigger);
      });

      return () => {
        mobileScrollTriggers.forEach(st => st.kill());
      };
    });

    return () => {
      heroScroll.kill();
      videoScroll.kill();
      mm.revert(); // Automatically cleans up matches
    };
  }, { scope: container });

  return (
    <div className="page home-page" ref={container}>
      <section className="hero">
        {/* Ambient premium background video */}
        <video 
          className="hero-bg-video" 
          src="/hero-bg.mp4" 
          autoPlay 
          muted 
          loop 
          playsInline 
        />
        <div className="hero-video-overlay" />
        <div className="hero-header-wrapper">
          <div className="hero-editorial-meta">
            <span className="meta-text">KJSCE ALUMNI CELL</span>
            <span className="meta-dot"></span>
            <span className="meta-text">03–08 FEB 2026</span>
          </div>
          <div className="hero-header hero-header-1">
            <h1 className="hero-title-main">KICKSTART</h1>
          </div>
          <div className="hero-header hero-header-2">
            <h1 className="hero-title-sub">THE ROAD TO PLACEMENTS</h1>
          </div>
        </div>
        <div className="hero-footer">
          <div className="hero-footer-symbols">
            <img src={`${import.meta.env.BASE_URL}images/global/symbols.png`} alt="" />
          </div>
          <div className="hero-footer-scroll-down">
            <p className="mn">
              <Link to="/contact" className="hero-cta-btn hero-cta-primary">Register Now</Link>
              <a href="#schedule" className="hero-cta-btn hero-cta-secondary">View Schedule</a>
            </p>
          </div>
          <div className="hero-footer-tags">
            <p className="mn">Powered By: KJSCE ✦</p>
          </div>
        </div>

        {/* Scrolling ticker */}
        <div className="hero-ticker">
          <div className="hero-ticker-inner">
            {['KickStart 2026', 'Alumni Sessions', 'Aptitude Tests', 'Mock Interviews', 'GD & PI Rounds', 'KJ Somaiya Engineering', '03–08 Feb', 'Networking', 'Placement Prep', 'KickStart 2026', 'Alumni Sessions', 'Aptitude Tests', 'Mock Interviews', 'GD & PI Rounds', 'KJ Somaiya Engineering', '03–08 Feb', 'Networking', 'Placement Prep'].map((text, i) => (
              <span key={i}>✦ {text}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="hero-img-holder">
        <div className="hero-img">
          <img src={`${import.meta.env.BASE_URL}images/hero/img${currentImageIndex}.jpg`} alt="KickStart Event" />
        </div>
      </section>
      

      {/* Stats Band — replaces about-hero */}
      <section className="stats-band" id="about">
        <div className="stats-band-item">
          <span className="stat-number">500+</span>
          <span className="stat-label">Students Registered</span>
          <span className="stat-desc">Engineers prepped across all departments in previous editions</span>
        </div>
        <div className="stats-band-item">
          <span className="stat-number">30+</span>
          <span className="stat-label">Alumni Mentors</span>
          <span className="stat-desc">Industry professionals sharing real placement insights</span>
        </div>
        <div className="stats-band-item">
          <span className="stat-number">06</span>
          <span className="stat-label">Days of Events</span>
          <span className="stat-desc">Interview Decrypted · Aptitude · GD & PI rounds</span>
        </div>
        <div className="stats-band-item">
          <span className="stat-number">98%</span>
          <span className="stat-label">Satisfaction Rate</span>
          <span className="stat-desc">Students who said KickStart improved their interview confidence</span>
        </div>
      </section>

      <section className="featured-work" id="events">
        <div className="featured-images">
          {/* Dynamically created originally, now static for React */}
          {[...Array(10)].map((_, i) => (
            <div key={i} className={`featured-img-card featured-img-card-${i + 1}`}>
              <img src={`${import.meta.env.BASE_URL}images/hero/img${i + 1}.jpg`} alt={`featured work ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
        <div className="featured-titles">
          <div className="featured-title-wrapper">
            <h1 className="featured-title" id="schedule">Event Timeline</h1>
          </div>
          <div className="featured-title-wrapper">
            <div className="featured-title-img">
              <img src={`${import.meta.env.BASE_URL}images/hero/img1.jpg`} alt="Interview Decrypted" />
            </div>
            <h1 className="featured-title">Interview Decrypted</h1>
            <p className="mn event-meta">03 Feb (Tue) &nbsp;·&nbsp; Seminar Hall B-113</p>
            <p className="mn event-desc">Decode secrets to excelling in interviews with insider tips from alumni who cracked top placements.</p>
          </div>
          <div className="featured-title-wrapper">
            <div className="featured-title-img">
              <img src={`${import.meta.env.BASE_URL}images/hero/img2.jpg`} alt="Aptitude Test" />
            </div>
            <h1 className="featured-title">Aptitude Test</h1>
            <p className="mn event-meta">04–05 Feb (Wed–Thu) &nbsp;·&nbsp; CCF / Placement Office</p>
            <p className="mn event-desc">Replicate actual placement exams under timed conditions with rigorous test sets designed by experts.</p>
          </div>
          <div className="featured-title-wrapper">
            <div className="featured-title-img">
              <img src={`${import.meta.env.BASE_URL}images/hero/img3.jpg`} alt="GD &amp; PI" />
            </div>
            <h1 className="featured-title">GD &amp; PI</h1>
            <p className="mn event-meta">07–08 Feb (Sat–Sun) &nbsp;·&nbsp; 10 AM – 5 PM</p>
            <p className="mn event-desc">Interactive Group Discussions and Personal Interviews conducted by esteemed alumni with personalised feedback.</p>
          </div>
        </div>
        <div className="featured-work-indicator">
          {/* Originally dynamic, rendered via JSX */}
          {[...Array(5)].map((_, section) => (
            <React.Fragment key={`section-${section}`}>
              <p className="mn">0{section + 1}</p>
              {[...Array(10)].map((_, i) => (
                <div key={`ind-${section}-${i}`} className="indicator"></div>
              ))}
            </React.Fragment>
          ))}
        </div>
        <div className="featured-work-footer">
          <p className="mn">Event Programme [ 03 ]</p>
          <p className="mn">///////////////////</p>
          <p className="mn"><Link to="/contact">Register Now →</Link></p>
        </div>
      </section>

     
      <section className="pricing-section" id="tickets">
        <div className="pricing-header">
          <p className="mn pricing-eyebrow">✦ Pricing</p>
          <h1>Tickets</h1>
        </div>
        <div className="pricing-grid">
          {TICKETS.map((ticket) => (
            <div className="pricing-card" key={ticket.id}>
              {/* Col 1: Name + desc */}
              <div className="pricing-card-info">
                <p className="pricing-card-label">{ticket.name}</p>
                <p className="pricing-desc">{ticket.desc}</p>
              </div>
              {/* Col 2: Price */}
              <h2 className="pricing-amount">₹{ticket.price}</h2>
              {/* Col 3: Tags */}
              <p className="mn pricing-tags">{ticket.tags}</p>
              {/* Col 4: Badge */}
              <span className="pricing-badge">{ticket.badge}</span>
              {/* Col 5: CTA */}
              <Link
                to="/contact"
                state={{ ticket: ticket.id }}
                className="pricing-buy-btn"
              >
                Buy Now
              </Link>
            </div>
          ))}
        </div>
      </section>
 <section className="services-header" id="highlights">
        <div className="services-header-content">
          <p>Last Year's Highlights</p>
          <div className="services-header-title">
            <h1>Companies That</h1>
            <h1>Believed In Us</h1>
          </div>
          <div className="services-header-arrow-icon">
            <h1>&#8595;</h1>
          </div>
        </div>
      </section>
      <section className="sponsors-marquee-section">
        <div className="marquee-label">
          <p className="mn">Industry leaders who helped shape future professionals.</p>
        </div>

        <div className="marquee-track-wrapper">
          <div className="marquee-track marquee-ltr">
            <div className="marquee-inner">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="sponsor-card"><span className="sponsor-placeholder">Sponsor 0{i + 1}</span></div>
              ))}
              {[...Array(9)].map((_, i) => (
                <div key={`dup-${i}`} className="sponsor-card"><span className="sponsor-placeholder">Sponsor 0{i + 1}</span></div>
              ))}
            </div>
          </div>
        </div>

        <div className="marquee-track-wrapper">
          <div className="marquee-track marquee-rtl">
            <div className="marquee-inner">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="sponsor-card"><span className="sponsor-placeholder">Sponsor {i + 10}</span></div>
              ))}
              {[...Array(9)].map((_, i) => (
                <div key={`dup-${i}`} className="sponsor-card"><span className="sponsor-placeholder">Sponsor {i + 10}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="speakers-section" id="speakers">
        <div className="section-header-editorial">
          <p className="mn header-eyebrow">✦ Mentorship</p>
          <h1>Alumni Speakers</h1>
        </div>
        <div className="speakers-grid">
          {SPEAKERS.map(speaker => (
            <div className="speaker-card-editorial" key={speaker.id}>
              <div className="speaker-img-wrapper">
                <img src={speaker.img} alt={speaker.name} />
                <div className="speaker-cohort-badge">{speaker.cohort}</div>
              </div>
              <div className="speaker-details">
                <h3>{speaker.name}</h3>
                <p className="speaker-role">{speaker.role}</p>
                <p className="speaker-desc">{speaker.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="section-header-editorial">
          <p className="mn header-eyebrow">✦ Support</p>
          <h1>Common Queries</h1>
        </div>
        <div className="faq-list">
          {FAQS.map(faq => (
            <div 
              className={`faq-item-editorial ${activeFaq === faq.id ? 'active' : ''}`} 
              key={faq.id}
              onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}
            >
              <div className="faq-question-row">
                <h2>{faq.question}</h2>
                <span className="faq-icon">{activeFaq === faq.id ? '−' : '+'}</span>
              </div>
              <div className="faq-answer-row">
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="contact-cta" id="register">
        <div className="contact-button">
          <Link to="/contact"></Link>
          <div className="contact-text-small">
            <p>Join 500+ students. Kickstart your placement journey.</p>
          </div>
          <div className="contact-text-large"><h1>Register Now</h1></div>
        </div>
      </section>
    </div>
  );
}

