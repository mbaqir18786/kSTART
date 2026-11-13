import React, { useEffect, useState } from 'react';
import { useLocation, Link, useSearchParams } from 'react-router-dom';
import { sendToGoogleSheets } from '../services/sheets';

export default function RegistrationStatus() {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Support both search params (?orderId=...) and hash-query
  const orderId = searchParams.get('orderId') ||
    new URLSearchParams(location.search).get('orderId') ||
    new URLSearchParams(window.location.hash.split('?')[1] || '').get('orderId') || '';

  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState(null);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    if (!orderId) {
      setLoading(false);
      setError('No Order ID found in URL parameters.');
      return;
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (backendUrl) {
      try {
        const res = await fetch(`${backendUrl}/api/kickstart/status/${encodeURIComponent(orderId)}`);
        if (res.ok) {
          const data = await res.json();
          setStatusData(data);
          setError(null);
          setLoading(false);
          return;
        }
      } catch (apiErr) {
        // Backend offline or unreachable
      }
    }

    // Client-side fallback from localStorage
    try {
      const saved = localStorage.getItem(`order_${orderId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setStatusData(parsed);
        setError(null);
        setLoading(false);
        return;
      }
    } catch (storageErr) {
      // ignore
    }

    setLoading(false);
    setError('Order reference not found. If you just registered, please verify your Order ID.');
  };

  const markAsPaid = async (utrInput = '') => {
    const utrRef = utrInput || `UPI-${Date.now().toString(36).toUpperCase()}`;
    const updated = {
      ...(statusData || {}),
      paymentStatus: 'VERIFIED_PAID',
      utr: utrRef
    };

    setStatusData(updated);

    try {
      localStorage.setItem(`order_${orderId}`, JSON.stringify(updated));
    } catch (err) {}

    // Sync "PAID" status to Google Sheets
    await sendToGoogleSheets({
      action: 'UPDATE_PAYMENT',
      orderId: orderId,
      paid: 'PAID',
      utr: utrRef
    });
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 3 seconds if status is still pending
    const interval = setInterval(() => {
      if (statusData?.paymentStatus === 'PENDING_PAYMENT') {
        fetchStatus();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [orderId, statusData?.paymentStatus]);

  const isPaid = statusData?.paymentStatus === 'VERIFIED_PAID' ||
    statusData?.paymentStatus === 'OBSERVED_SUCCESS' ||
    statusData?.paymentStatus === 'RECONCILED' ||
    statusData?.paymentStatus === 'SUCCESS';

  const isPending = statusData?.paymentStatus === 'PENDING_PAYMENT' ||
    statusData?.paymentStatus === 'MANUAL_REVIEW';

  const isFailed = statusData?.paymentStatus === 'FAILED' ||
    statusData?.paymentStatus === 'EXPIRED' ||
    statusData?.paymentStatus === 'CANCELLED';

  return (
    <div className="page contact-page" style={{ paddingTop: '8rem', paddingBottom: '6rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <p className="contact-eyebrow">✦ Verifying Status</p>
            <h2 style={{ fontFamily: 'rader', textTransform: 'uppercase', marginTop: '1rem' }}>
              Checking Payment with AC-Pay...
            </h2>
            <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>Order Reference: {orderId}</p>
          </div>
        )}

        {!loading && error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '2.5rem',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '2.5rem' }}>⚠️</span>
            <h2 style={{ fontFamily: 'rader', color: '#ef4444', textTransform: 'uppercase', marginTop: '1rem' }}>
              Registration Reference Error
            </h2>
            <p style={{ opacity: 0.85, marginTop: '0.75rem', fontSize: '1.05rem' }}>{error}</p>
            <div style={{ marginTop: '2rem' }}>
              <Link to="/contact" className="pricing-buy-btn" style={{ display: 'inline-block', textDecoration: 'none' }}>
                Go to Registration
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && statusData && (
          <div>
            {/* SUCCESS STATE */}
            {isPaid && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                padding: '3rem 2.5rem',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.2)',
                    fontSize: '2rem',
                    marginBottom: '1rem'
                  }}>
                    ✓
                  </div>
                  <span className="contact-eyebrow" style={{ color: '#10b981' }}>
                    ✦ Official Pass Confirmed
                  </span>
                  <h1 style={{
                    fontFamily: 'rader',
                    textTransform: 'uppercase',
                    fontSize: 'clamp(2rem, 4vw, 3rem)',
                    margin: '0.5rem 0 1rem'
                  }}>
                    Registration Verified!
                  </h1>
                  <p style={{ opacity: 0.85, maxWidth: '540px', margin: '0 auto', lineHeight: 1.6 }}>
                    Payment has been verified via <strong>AC-Pay (Alumni Cell Pay)</strong>. Your spot at
                    KickStart 2027 is confirmed.
                  </p>
                </div>

                {/* Candidate & Pass Details Card */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: '8px',
                  padding: '1.75rem',
                  marginTop: '2.5rem',
                  border: '1px solid rgba(240, 237, 230, 0.1)'
                }}>
                  <h3 style={{
                    fontFamily: 'supply-mono',
                    fontSize: '0.85rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--accent1)',
                    marginBottom: '1.25rem'
                  }}>
                    Candidate Pass Summary
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase' }}>Candidate Name</span>
                      <p style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '0.2rem' }}>{statusData.studentName}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase' }}>Roll Number</span>
                      <p style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '0.2rem' }}>{statusData.rollNumber}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase' }}>Department &amp; Year</span>
                      <p style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '0.2rem' }}>
                        {statusData.department.toUpperCase()} · {statusData.year.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase' }}>Confirmed Pass Tracks</span>
                      <p style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '0.2rem', color: 'var(--accent1)' }}>
                        {statusData.ticketNames}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase' }}>Amount Paid</span>
                      <p style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '0.2rem' }}>₹{statusData.amountRupees}.00</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase' }}>Order Reference</span>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                        {statusData.orderId}
                      </p>
                    </div>
                    {statusData.utr && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase' }}>Banking UTR / Reference</span>
                        <p style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem', fontFamily: 'monospace', color: '#10b981' }}>
                          ✓ {statusData.utr} (Verified by AC-Pay Network)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  marginTop: '2rem',
                  padding: '1.25rem',
                  borderRadius: '6px',
                  background: 'rgba(192, 164, 110, 0.08)',
                  border: '1px solid rgba(192, 164, 110, 0.2)',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  textAlign: 'center'
                }}>
                  📅 <strong>Next Steps:</strong> Interview schedules and panel allocations will be generated by the
                  <strong> Alumni Cell Smart Scheduler</strong> and published on the KickStart portal prior to event launch.
                  Confirmation has also been linked to your Somaiya email (<code>{statusData.email}</code>).
                </div>

                <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => window.print()}
                    className="pricing-buy-btn"
                    style={{ background: 'transparent', border: '1px solid var(--fg)', color: 'var(--fg)', cursor: 'pointer' }}
                  >
                    🖨️ Print Pass
                  </button>
                  <Link to="/" className="pricing-buy-btn" style={{ textDecoration: 'none' }}>
                    Return to Home
                  </Link>
                </div>
              </div>
            )}

            {/* PENDING STATE */}
            {isPending && (
              <div style={{
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '12px',
                padding: '3rem 2.5rem',
                textAlign: 'center'
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(234, 179, 8, 0.2)',
                  fontSize: '2rem',
                  marginBottom: '1rem'
                }}>
                  ⏳
                </div>
                <span className="contact-eyebrow" style={{ color: '#eab308' }}>
                  ✦ Payment Verification Pending
                </span>
                <h1 style={{
                  fontFamily: 'rader',
                  textTransform: 'uppercase',
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                  margin: '0.5rem 0 1rem'
                }}>
                  Awaiting Confirmation
                </h1>
                <p style={{ opacity: 0.85, maxWidth: '540px', margin: '0 auto', lineHeight: 1.6 }}>
                  Your payment for Order <strong>{statusData.orderId}</strong> (₹{statusData.amountRupees}.00) is being
                  processed. If you just made the UPI payment, our bank observers will verify it shortly.
                </p>

                {statusData.checkoutUrl && (
                  <div style={{ marginTop: '2.5rem' }}>
                    <a
                      href={statusData.checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="pricing-buy-btn"
                      style={{ display: 'inline-block', textDecoration: 'none', background: '#A72B2A', color: '#fff' }}
                    >
                      Open AC-Pay UPI Checkout →
                    </a>
                  </div>
                )}

                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      const utr = window.prompt("Enter your UPI Reference / UTR Number from your payment app:") || "";
                      markAsPaid(utr);
                    }}
                    className="pricing-buy-btn"
                    style={{ background: '#ffffff', color: '#09090b', cursor: 'pointer', border: '1px solid #ffffff' }}
                  >
                    ✓ I Have Paid / Enter UTR
                  </button>
                  <button
                    onClick={fetchStatus}
                    className="pricing-buy-btn"
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      color: 'var(--fg)',
                      cursor: 'pointer'
                    }}
                  >
                    ↻ Refresh Status
                  </button>
                </div>
              </div>
            )}

            {/* FAILED / EXPIRED / CANCELLED STATE */}
            {isFailed && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '3rem 2.5rem',
                textAlign: 'center'
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.2)',
                  fontSize: '2rem',
                  marginBottom: '1rem',
                  color: '#ef4444'
                }}>
                  ✕
                </div>
                <span className="contact-eyebrow" style={{ color: '#ef4444' }}>
                  ✦ {statusData.paymentStatus}
                </span>
                <h1 style={{
                  fontFamily: 'rader',
                  textTransform: 'uppercase',
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                  margin: '0.5rem 0 1rem',
                  color: '#ef4444'
                }}>
                  Payment Incomplete
                </h1>
                <p style={{ opacity: 0.85, maxWidth: '540px', margin: '0 auto', lineHeight: 1.6 }}>
                  The payment session for Order <strong>{statusData.orderId}</strong> was not completed
                  (status: {statusData.paymentStatus}). Your interview pass has not been reserved.
                </p>

                <div style={{ marginTop: '2.5rem' }}>
                  <Link
                    to="/contact"
                    className="pricing-buy-btn"
                    style={{ display: 'inline-block', textDecoration: 'none' }}
                  >
                    Try Registering Again →
                  </Link>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

