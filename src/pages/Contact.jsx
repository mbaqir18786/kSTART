import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TICKETS } from '../data/tickets';
import { sendToGoogleSheets } from '../services/sheets';

export default function Contact() {
  const location = useLocation();
  const navigate = useNavigate();

  // Selected ticket passes
  const [selectedTicketIds, setSelectedTicketIds] = useState(() => {
    if (location.state?.ticket) {
      return [location.state.ticket];
    }
    return ['tech'];
  });

  const [ticketOptions, setTicketOptions] = useState(TICKETS);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resumeName, setResumeName] = useState('');

  // Form input state
  const [formData, setFormData] = useState({
    fullName: '',
    rollNumber: '',
    department: 'ce',
    year: 'te',
    collegeEmail: '',
    phone: '',
    whyKickstart: '',
    terms: false
  });

  // Fetch ticket pricing
  useEffect(() => {
    window.scrollTo(0, 0);
    fetch('/api/kickstart/tickets')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tickets && Array.isArray(data.tickets) && data.tickets.length > 0) {
          setTicketOptions(data.tickets);
        }
      })
      .catch(() => {});
  }, []);

  // Sync ticket passed via route state
  useEffect(() => {
    if (location.state?.ticket) {
      setSelectedTicketIds((prev) =>
        prev.includes(location.state.ticket) ? prev : [...prev, location.state.ticket]
      );
    }
  }, [location.state?.ticket]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeName(file.name);
    } else {
      setResumeName('');
    }
  };

  const removeResume = () => {
    setResumeName('');
    const input = document.getElementById('resume');
    if (input) input.value = '';
  };

  const toggleTicket = (ticketId) => {
    setSelectedTicketIds((prev) => {
      if (prev.includes(ticketId)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter((id) => id !== ticketId);
      } else {
        return [...prev, ticketId];
      }
    });
  };

  const selectedTickets = ticketOptions.filter((t) => selectedTicketIds.includes(t.id));
  const calculatedTotal = selectedTickets.reduce((sum, t) => sum + (t.price || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (selectedTicketIds.length === 0) {
      setErrorMsg('Please select at least one interview track to continue.');
      return;
    }

    if (!formData.terms) {
      setErrorMsg('Please agree to the registration confirmation to proceed.');
      return;
    }

    setSubmitting(true);

    const generatedOrderId = `KS26-${formData.department.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const registrationData = {
      action: 'REGISTER',
      orderId: generatedOrderId,
      fullName: formData.fullName,
      rollNumber: formData.rollNumber,
      department: formData.department.toUpperCase(),
      year: formData.year.toUpperCase(),
      collegeEmail: formData.collegeEmail,
      phone: formData.phone,
      selectedTicketNames: selectedTickets.map((t) => t.name).join(', '),
      amountRupees: calculatedTotal,
      resumeName: resumeName || 'Not uploaded',
      whyKickstart: formData.whyKickstart || '',
      paid: 'NOT PAID'
    };

    try {
      // 1. Sync to Google Sheets
      await sendToGoogleSheets(registrationData);

      // Save locally as fallback for client-side status review
      try {
        localStorage.setItem(`order_${generatedOrderId}`, JSON.stringify({
          orderId: generatedOrderId,
          studentName: formData.fullName,
          rollNumber: formData.rollNumber,
          department: formData.department,
          year: formData.year,
          ticketNames: selectedTickets.map((t) => t.name).join(', '),
          amountRupees: calculatedTotal,
          paymentStatus: 'PENDING_PAYMENT'
        }));
      } catch (storageErr) {
        // localStorage ignore
      }

      // 2. Also attempt backend API if server is running
      try {
        const res = await fetch('/api/kickstart/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: formData.fullName,
            rollNumber: formData.rollNumber,
            department: formData.department,
            year: formData.year,
            collegeEmail: formData.collegeEmail,
            phone: formData.phone,
            selectedTicketIds,
            resumeName,
            whyKickstart: formData.whyKickstart,
            orderId: generatedOrderId
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.checkoutUrl) {
            window.location.href = data.checkoutUrl;
            return;
          }
        }
      } catch (apiErr) {
        // Server API not deployed or offline, proceed with client-side order flow
      }

      // 3. Navigate to registration status page
      navigate(`/registration-status?orderId=${encodeURIComponent(generatedOrderId)}`);
    } catch (err) {
      console.error('[Registration Error]:', err);
      setErrorMsg(err.message || 'Failed to submit registration. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="page contact-page">
      <section className="contact-section">
        {/* Left Column: Event Context & Live Order Summary */}
        <aside className="contact-left">
          <div className="contact-header">
            <span className="contact-eyebrow">✦ Official Drive · Alumni Cell KJSCE</span>
            <h1>Candidate Registration</h1>
            <p className="contact-lead">
              Prepare for real campus placements with seasoned alumni mentors from Google,
              Morgan Stanley, J.P. Morgan, and Microsoft. Verified registration with instant pass issuance.
            </p>
          </div>

          <div className="editorial-pillars">
            <div className="pillar-item">
              <span className="pillar-num">01</span>
              <div>
                <h4>Direct Alumni Mentorship</h4>
                <p>Personalized 1-on-1 feedback on resume, system design, and communication.</p>
              </div>
            </div>
            <div className="pillar-item">
              <span className="pillar-num">02</span>
              <div>
                <h4>Timed Exam Simulation</h4>
                <p>Replicate actual placement test patterns under strict timed lab conditions.</p>
              </div>
            </div>
            <div className="pillar-item">
              <span className="pillar-num">03</span>
              <div>
                <h4>GD &amp; PI Grilling</h4>
                <p>Group discussions and multi-round interviews with detailed candidate scorecards.</p>
              </div>
            </div>
          </div>

          {/* Live Order Pass Summary Card */}
          <div className="live-summary-card">
            <div className="summary-card-header">
              <span className="summary-card-eyebrow">Pass Breakdown</span>
              <span className="summary-card-count">{selectedTickets.length} Selected</span>
            </div>

            <div className="summary-passes-list">
              {selectedTickets.map((t) => (
                <div key={t.id} className="summary-pass-row">
                  <div className="summary-pass-title">
                    <span className="summary-dot" />
                    <span>{t.name}</span>
                  </div>
                  <span className="summary-pass-price">₹{t.price}</span>
                </div>
              ))}
            </div>

            <div className="summary-total-row">
              <span>Total Payable</span>
              <span className="summary-total-amount">₹{calculatedTotal}.00</span>
            </div>

            <div className="summary-gateway-badge">
              <span className="gateway-dot" />
              <span>Processed securely via AC-Pay Portal</span>
            </div>
          </div>

          <div className="contact-info">
            <div className="contact-info-item">
              <span className="info-label">Event Schedule</span>
              <p>03 Feb – 08 Feb 2026 · CCF &amp; Placement Hall</p>
            </div>
            <div className="contact-info-item">
              <span className="info-label">Support &amp; Queries</span>
              <p>
                <a href="mailto:alumni@somaiya.edu">alumni@somaiya.edu</a>
              </p>
            </div>
          </div>
        </aside>

        {/* Right Column: Clean Unified Form */}
        <main className="contact-form-container">
          <div className="form-header">
            <h2>Select Tracks &amp; Register</h2>
            <p>Customize your preparation track and enter your academic details.</p>
          </div>

          {errorMsg && (
            <div className="form-error-banner" role="alert">
              <span className="error-icon">!</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="contact-form" onSubmit={handleSubmit}>
            {/* Step 1: Track Selection */}
            <div className="form-block">
              <div className="form-block-header">
                <h3>Select Interview Passes</h3>
                <span className="form-block-hint">Choose one or multiple tracks</span>
              </div>

              <div className="tracks-grid">
                {ticketOptions.map((t) => {
                  const isSelected = selectedTicketIds.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => toggleTicket(t.id)}
                      className={`track-card ${isSelected ? 'active' : ''}`}
                    >
                      <div className="track-card-top">
                        <span className="track-badge">{t.badge || 'Track'}</span>
                        <div className={`track-checkbox-pill ${isSelected ? 'checked' : ''}`}>
                          {isSelected ? '✓ Selected' : '+ Add'}
                        </div>
                      </div>

                      <h4 className="track-name">{t.name}</h4>
                      <p className="track-tags">{t.tags}</p>
                      <p className="track-desc">{t.desc}</p>

                      <div className="track-card-bottom">
                        <span className="track-price-label">Registration Pass</span>
                        <span className="track-price">₹{t.price}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Academic & Personal Details */}
            <div className="form-block">
              <div className="form-block-header">
                <h3>Candidate Details</h3>
                <span className="form-block-hint">Used for attendance and mentor allocation</span>
              </div>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="fullName">Full Name</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    placeholder="e.g. Atharva Kulkarni"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    autoComplete="name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="rollNumber">Roll Number</label>
                  <input
                    type="text"
                    id="rollNumber"
                    name="rollNumber"
                    placeholder="e.g. 16010121045"
                    required
                    value={formData.rollNumber}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="department">Department</label>
                  <select
                    id="department"
                    name="department"
                    required
                    value={formData.department}
                    onChange={handleInputChange}
                  >
                    <option value="ce">Computer Engineering</option>
                    <option value="it">Information Technology</option>
                    <option value="extc">Electronics &amp; Telecommunication</option>
                    <option value="aids">AI &amp; Data Science</option>
                    <option value="aiml">AI &amp; Machine Learning</option>
                    <option value="mech">Mechanical Engineering</option>
                    <option value="civil">Civil Engineering</option>
                    <option value="ra">Robotics &amp; Automation</option>
                    <option value="elex">Electronics Engineering</option>
                    <option value="other">Other Engineering Branch</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="year">Year of Study</label>
                  <select
                    id="year"
                    name="year"
                    required
                    value={formData.year}
                    onChange={handleInputChange}
                  >
                    <option value="fe">First Year (FE)</option>
                    <option value="se">Second Year (SE)</option>
                    <option value="te">Third Year (TE)</option>
                    <option value="be">Final Year (BE)</option>
                    <option value="pg">Post Graduate (PG)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="collegeEmail">Somaiya Email ID</label>
                  <input
                    type="email"
                    id="collegeEmail"
                    name="collegeEmail"
                    placeholder="student@somaiya.edu"
                    required
                    value={formData.collegeEmail}
                    onChange={handleInputChange}
                    autoComplete="email"
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="phone">Contact Number (WhatsApp)</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="+91 98765 43210"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    autoComplete="tel"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Preparation & Resume */}
            <div className="form-block">
              <div className="form-block-header">
                <h3>Preparation Profile</h3>
                <span className="form-block-hint">Helps mentors tailor your mock session</span>
              </div>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="resume">Resume (PDF or DOC)</label>
                  <div className="file-dropzone">
                    <input
                      type="file"
                      id="resume"
                      name="resume"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="file-native-input"
                    />
                    <div className="file-dropzone-inner">
                      <span className="dropzone-icon">📄</span>
                      <div className="dropzone-text">
                        <span className="dropzone-title">Click to upload or drag resume</span>
                        <span className="dropzone-sub">Supported formats: PDF, DOC, DOCX up to 10MB</span>
                      </div>
                    </div>
                  </div>

                  {resumeName && (
                    <div className="resume-tag">
                      <span className="resume-tag-name">✓ {resumeName}</span>
                      <button
                        type="button"
                        onClick={removeResume}
                        className="resume-remove-btn"
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group full-width">
                  <label htmlFor="whyKickstart">
                    Target Domains &amp; Focus Areas <span className="label-optional">(Optional)</span>
                  </label>
                  <textarea
                    id="whyKickstart"
                    name="whyKickstart"
                    placeholder="e.g. Targeting Software Engineer roles at FinTech firms; want mentors to focus on Graph algorithms, System Design fundamentals, and core behavioral questions."
                    rows={3}
                    value={formData.whyKickstart}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Terms & Proceed */}
            <div className="form-checkout-footer">
              <label className="checkbox-container" htmlFor="terms">
                <input
                  type="checkbox"
                  id="terms"
                  name="terms"
                  required
                  checked={formData.terms}
                  onChange={handleInputChange}
                />
                <span className="custom-check" />
                <span className="checkbox-text">
                  I confirm that all candidate details are accurate and agree to proceed to AC-Pay to complete my pass registration.
                </span>
              </label>

              <button
                type="submit"
                className="checkout-submit-btn"
                disabled={submitting}
              >
                {submitting ? (
                  <span>Generating Secure AC-Pay Session...</span>
                ) : (
                  <span>Proceed to Payment · ₹{calculatedTotal}.00 →</span>
                )}
              </button>

              <p className="checkout-security-note">
                ✦ Official Alumni Cell verification · Passes emailed immediately upon payment completion
              </p>
            </div>
          </form>
        </main>
      </section>
    </div>
  );
}
