import http from 'node:http';
import crypto from 'node:crypto';
import { CONFIG } from './config.js';
import { getKickStartDb } from './db.js';

/** Timing-safe string comparison */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Verifies HMAC-SHA256 signature from AC-Pay */
function verifyAcPaySignature(rawBody, signatureHeader, secret, timestampHeader = null) {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
  const actualSig = signatureHeader.replace('sha256=', '');

  const directSig = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  if (safeEqual(directSig, actualSig)) return true;

  if (timestampHeader) {
    const timestampedSig = crypto.createHmac('sha256', secret).update(`${timestampHeader}.${rawBody}`, 'utf8').digest('hex');
    if (safeEqual(timestampedSig, actualSig)) return true;
  }
  return false;
}

export function createKickStartServer(options = {}) {
  const db = options.db || getKickStartDb(options.dbPath);
  const cfg = { ...CONFIG, ...options };

  const server = http.createServer(async (req, res) => {
    // Enable CORS for development frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Gateway-Signature, X-Gateway-Signature-V2, X-Gateway-Delivery-Id, X-Gateway-Timestamp, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Helper to send JSON responses
    const sendJson = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    // Helper to read raw request body
    const readBody = () => new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });

    try {
      // -----------------------------------------------------------------------
      // 1. GET /api/kickstart/tickets
      // -----------------------------------------------------------------------
      if (req.method === 'GET' && pathname === '/api/kickstart/tickets') {
        const ticketList = Object.keys(cfg.ticketDefinitions).map(id => {
          const def = cfg.ticketDefinitions[id];
          const price = cfg.ticketPrices[id] || 0;
          return {
            id,
            name: def.name,
            price,
            pricePaise: price * 100,
            desc: def.desc,
            tags: def.tags,
            badge: def.badge,
            icon: def.icon
          };
        });

        sendJson(200, {
          tickets: ticketList,
          currency: 'INR',
          event: 'KickStart 2027',
          institution: 'KJ Somaiya College of Engineering — Alumni Cell'
        });
        return;
      }

      // -----------------------------------------------------------------------
      // 2. POST /api/kickstart/register
      // -----------------------------------------------------------------------
      if (req.method === 'POST' && pathname === '/api/kickstart/register') {
        const rawBody = await readBody();
        let body;
        try {
          body = JSON.parse(rawBody || '{}');
        } catch {
          sendJson(400, { error: 'Invalid JSON request body.' });
          return;
        }

        const {
          fullName,
          rollNumber,
          department,
          year,
          collegeEmail,
          phone,
          selectedTicketIds,
          resumeName,
          whyKickstart
        } = body;

        // Validation
        if (!fullName || !fullName.trim()) {
          sendJson(400, { error: 'Full name is required.' });
          return;
        }
        if (!rollNumber || !rollNumber.trim()) {
          sendJson(400, { error: 'Roll number is required.' });
          return;
        }
        const cleanRoll = rollNumber.trim().toUpperCase();

        if (!collegeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(collegeEmail.trim())) {
          sendJson(400, { error: 'A valid college email address is required.' });
          return;
        }
        const cleanEmail = collegeEmail.trim().toLowerCase();

        if (!Array.isArray(selectedTicketIds) || selectedTicketIds.length === 0) {
          sendJson(400, { error: 'Please select at least one interview ticket track.' });
          return;
        }

        // Validate selected ticket types
        const validTicketIds = Object.keys(cfg.ticketDefinitions);
        const invalidSelections = selectedTicketIds.filter(id => !validTicketIds.includes(id));
        if (invalidSelections.length > 0) {
          sendJson(400, { error: `Invalid ticket selection(s): ${invalidSelections.join(', ')}` });
          return;
        }

        // De-duplicate ticket IDs
        const distinctTicketIds = Array.from(new Set(selectedTicketIds));

        // DUPLICATE REGISTRATION PREVENTION:
        // Check if this Roll Number already has a verified paid registration for any of the chosen tracks
        const existingPaidRows = db.prepare(`
          SELECT selected_ticket_ids, order_id, payment_status
          FROM kickstart_registrations
          WHERE roll_number = ? AND payment_status = 'VERIFIED_PAID'
        `).all(cleanRoll);

        const alreadyPaidTickets = new Set();
        for (const row of existingPaidRows) {
          try {
            const ids = JSON.parse(row.selected_ticket_ids || '[]');
            ids.forEach(t => alreadyPaidTickets.add(t));
          } catch {}
        }

        const conflictingTickets = distinctTicketIds.filter(id => alreadyPaidTickets.has(id));
        if (conflictingTickets.length > 0) {
          const conflictingNames = conflictingTickets.map(id => cfg.ticketDefinitions[id].name);
          sendJson(409, {
            error: `Student with Roll Number ${cleanRoll} already has a confirmed registration for: ${conflictingNames.join(', ')}.`,
            code: 'DUPLICATE_REGISTRATION_EXISTS',
            conflictingTickets
          });
          return;
        }

        // BACKEND PRICE CALCULATION:
        // Derive exact total from server configuration (never client-supplied amounts)
        let totalRupees = 0;
        const selectedTicketsSummary = [];
        for (const id of distinctTicketIds) {
          const price = cfg.ticketPrices[id] || 0;
          totalRupees += price;
          selectedTicketsSummary.push({
            id,
            name: cfg.ticketDefinitions[id].name,
            price
          });
        }
        const totalPaise = totalRupees * 100;
        const ticketNames = selectedTicketsSummary.map(t => t.name).join(' + ');

        // Generate a cryptographically unique Order ID
        const uniqueSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
        const orderId = `KS27-${cleanRoll}-${uniqueSuffix}`;
        const registrationId = crypto.randomUUID();

        // Prepare return URL pointing back to KickStart status check
        const returnUrl = `${cfg.publicBaseUrl}/#/registration-status?orderId=${encodeURIComponent(orderId)}`;

        // Call AC-Pay Payment Gateway to create the payment session
        let gatewaySession;
        try {
          const gatewayPayload = {
            orderId,
            amount: totalRupees.toFixed(2),
            currency: 'INR',
            returnUrl,
            customer: {
              fullName: fullName.trim(),
              email: cleanEmail,
              mobileNumber: (phone || '9876543210').replace(/\D/g, '').slice(-10)
            },
            metadata: {
              source: 'KICKSTART_EVENT_PORTAL',
              event: 'KickStart 2027',
              registrationId,
              studentName: fullName.trim(),
              rollNumber: cleanRoll,
              department: department || '',
              year: year || '',
              collegeEmail: cleanEmail,
              phone: phone || '',
              selectedTicketIds: distinctTicketIds,
              ticketNames,
              resumeName: resumeName || '',
              whyKickstart: whyKickstart || ''
            }
          };

          const gatewayRes = await fetch(`${cfg.acPayApiUrl}/api/v1/payments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Merchant-Id': cfg.acPayMerchantId,
              'X-Merchant-Key': cfg.acPayWebhookSecret
            },
            body: JSON.stringify(gatewayPayload)
          });

          if (!gatewayRes.ok) {
            const errBody = await gatewayRes.text();
            throw new Error(`AC-Pay Gateway rejected session [HTTP ${gatewayRes.status}]: ${errBody}`);
          }

          gatewaySession = await gatewayRes.json();
        } catch (err) {
          console.error('[KickStart Backend] Failed to create AC-Pay payment session:', err.message);
          sendJson(502, {
            error: 'Failed to initialize payment with AC-Pay gateway. Please ensure AC-Pay is online.',
            details: err.message
          });
          return;
        }

        // Store initial registration record in SQLite
        const nowIso = new Date().toISOString();
        db.prepare(`
          INSERT INTO kickstart_registrations (
            id, order_id, student_name, roll_number, department, year,
            email, phone, selected_ticket_ids, ticket_names, amount_paise,
            amount_rupees, payment_id, checkout_url, payment_status,
            resume_name, why_kickstart, registered_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_PAYMENT', ?, ?, ?, ?)
        `).run(
          registrationId,
          orderId,
          fullName.trim(),
          cleanRoll,
          department || 'Other',
          year || 'FE',
          cleanEmail,
          phone || '',
          JSON.stringify(distinctTicketIds),
          ticketNames,
          totalPaise,
          totalRupees,
          gatewaySession.paymentId,
          gatewaySession.checkoutUrl,
          resumeName || null,
          whyKickstart || null,
          nowIso,
          nowIso
        );

        sendJson(201, {
          success: true,
          registrationId,
          orderId,
          paymentId: gatewaySession.paymentId,
          checkoutUrl: gatewaySession.checkoutUrl,
          amountRupees: totalRupees,
          amountPaise: totalPaise,
          tickets: selectedTicketsSummary,
          status: 'PENDING_PAYMENT',
          message: 'Registration initiated. Complete payment on AC-Pay to confirm your pass.'
        });
        return;
      }

      // -----------------------------------------------------------------------
      // 3. GET /api/kickstart/status/:orderId
      // -----------------------------------------------------------------------
      if (req.method === 'GET' && pathname.startsWith('/api/kickstart/status/')) {
        const orderId = decodeURIComponent(pathname.replace('/api/kickstart/status/', ''));
        const reg = db.prepare('SELECT * FROM kickstart_registrations WHERE order_id = ?').get(orderId);

        if (!reg) {
          sendJson(404, { error: `Registration not found for order ID: ${orderId}` });
          return;
        }

        // If still pending, query AC-Pay to verify latest status
        if (reg.payment_status === 'PENDING_PAYMENT' && reg.payment_id) {
          try {
            const checkRes = await fetch(`${cfg.acPayApiUrl}/api/v1/payments/${reg.payment_id}`, {
              headers: { 'X-Merchant-Key': cfg.acPayWebhookSecret }
            });

            if (checkRes.ok) {
              const gw = await checkRes.json();
              if (['OBSERVED_SUCCESS', 'SUCCESS', 'RECONCILED'].includes(gw.status)) {
                const nowIso = new Date().toISOString();
                db.prepare(`
                  UPDATE kickstart_registrations
                  SET payment_status = 'VERIFIED_PAID',
                      payment_method = ?,
                      utr = ?,
                      verification_level = ?,
                      verified_at = COALESCE(verified_at, ?),
                      updated_at = ?
                  WHERE order_id = ?
                `).run(
                  gw.method || 'UPI',
                  gw.utr || null,
                  gw.verificationLevel || 1,
                  nowIso,
                  nowIso,
                  orderId
                );
                reg.payment_status = 'VERIFIED_PAID';
                reg.utr = gw.utr || null;
                reg.verified_at = nowIso;

                // Sync to Google Sheets
                if (cfg.googleSheetsUrl) {
                  fetch(cfg.googleSheetsUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                      action: 'UPDATE_PAYMENT',
                      orderId: orderId,
                      paid: 'PAID',
                      utr: gw.utr || null
                    })
                  }).catch(() => {});
                }
              } else if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(gw.status)) {
                db.prepare(`
                  UPDATE kickstart_registrations
                  SET payment_status = ?, updated_at = ?
                  WHERE order_id = ?
                `).run(gw.status, new Date().toISOString(), orderId);
                reg.payment_status = gw.status;
              }
            }
          } catch {}
        }

        let ticketIds = [];
        try { ticketIds = JSON.parse(reg.selected_ticket_ids || '[]'); } catch {}

        sendJson(200, {
          orderId: reg.order_id,
          registrationId: reg.id,
          studentName: reg.student_name,
          rollNumber: reg.roll_number,
          department: reg.department,
          year: reg.year,
          email: reg.email,
          phone: reg.phone,
          tickets: ticketIds.map(id => cfg.ticketDefinitions[id] || { id, name: id }),
          ticketNames: reg.ticket_names,
          amountRupees: reg.amount_rupees,
          amountPaise: reg.amount_paise,
          paymentStatus: reg.payment_status,
          checkoutUrl: reg.checkout_url,
          paymentId: reg.payment_id,
          paymentMethod: reg.payment_method,
          utr: reg.utr,
          verificationLevel: reg.verification_level,
          registeredAt: reg.registered_at,
          verifiedAt: reg.verified_at
        });
        return;
      }

      // -----------------------------------------------------------------------
      // 4. POST /api/kickstart/webhook (AC-Pay Signed Webhook Listener)
      // -----------------------------------------------------------------------
      if (req.method === 'POST' && (pathname === '/api/kickstart/webhook' || pathname === '/webhook')) {
        const rawBody = await readBody();
        const sigV1 = req.headers['x-gateway-signature'];
        const sigV2 = req.headers['x-gateway-signature-v2'];
        const deliveryId = req.headers['x-gateway-delivery-id'];
        const timestamp = req.headers['x-gateway-timestamp'];

        const isValid = verifyAcPaySignature(rawBody, sigV2 || sigV1, cfg.acPayWebhookSecret, timestamp);
        if (!isValid) {
          sendJson(401, { error: 'Invalid HMAC-SHA256 webhook signature.' });
          return;
        }

        let eventPayload;
        try {
          eventPayload = JSON.parse(rawBody);
        } catch {
          sendJson(400, { error: 'Invalid webhook JSON payload.' });
          return;
        }

        const { event, orderId, paymentId, amountPaise, utr, verificationLevel } = eventPayload;

        if (!orderId) {
          sendJson(400, { error: 'Missing orderId in webhook event payload' });
          return;
        }

        // Webhook Idempotency: avoid double processing the same delivery
        if (deliveryId) {
          const alreadyProcessed = db.prepare('SELECT delivery_id FROM kickstart_webhook_receipts WHERE delivery_id = ?').get(deliveryId);
          if (alreadyProcessed) {
            sendJson(200, { received: true, deduplicated: true });
            return;
          }
          db.prepare(`
            INSERT INTO kickstart_webhook_receipts (delivery_id, event_type, order_id, payment_id, processed_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(deliveryId, event || 'UNKNOWN', orderId || null, paymentId || null, new Date().toISOString());
        }

        const nowIso = new Date().toISOString();

        if (['OBSERVED_SUCCESS', 'SUCCESS', 'RECONCILED'].includes(event)) {
          // Mark registration as verified paid!
          db.prepare(`
            UPDATE kickstart_registrations
            SET payment_status = 'VERIFIED_PAID',
                payment_id = COALESCE(payment_id, ?),
                utr = COALESCE(?, utr),
                verification_level = ?,
                verified_at = COALESCE(verified_at, ?),
                updated_at = ?
            WHERE order_id = ?
          `).run(
            paymentId || null,
            utr || null,
            verificationLevel || 1,
            nowIso,
            nowIso,
            orderId || null
          );

          // Real-time sync to Google Sheets: mark row as PAID
          if (cfg.googleSheetsUrl) {
            fetch(cfg.googleSheetsUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'UPDATE_PAYMENT',
                orderId: orderId,
                paid: 'PAID',
                utr: utr || paymentId || '-'
              })
            }).catch(err => console.warn('[Google Sheets Sync Error]:', err.message));
          }
        } else if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(event)) {
          db.prepare(`
            UPDATE kickstart_registrations
            SET payment_status = ?, updated_at = ?
            WHERE order_id = ?
          `).run(event || 'FAILED', nowIso, orderId || null);
        }

        sendJson(200, { received: true, event, orderId });
        return;
      }

      // -----------------------------------------------------------------------
      // 5. GET /api/kickstart/registrations (Organizer Export / Smart Scheduler API)
      // -----------------------------------------------------------------------
      if (req.method === 'GET' && pathname === '/api/kickstart/registrations') {
        const rows = db.prepare(`
          SELECT * FROM kickstart_registrations
          WHERE payment_status = 'VERIFIED_PAID'
          ORDER BY verified_at DESC
        `).all();

        const formatted = rows.map((r, index) => ({
          registrationId: r.id,
          serialNo: index + 1,
          rollNo: r.roll_number,
          name: r.student_name,
          department: r.department,
          year: r.year,
          email: r.email,
          phone: r.phone,
          resumeName: r.resume_name,
          ticketTypes: r.ticket_names,
          selectedTicketIds: JSON.parse(r.selected_ticket_ids || '[]'),
          amountPaid: r.amount_rupees,
          orderId: r.order_id,
          paymentId: r.payment_id,
          utr: r.utr,
          status: 'CONFIRMED',
          registrationTime: r.registered_at,
          verifiedTime: r.verified_at,
          // Compatibility with Smart Scheduler: slots remain unassigned until organizer runs scheduler
          generatedSlots: null
        }));

        sendJson(200, {
          totalVerified: formatted.length,
          registrations: formatted
        });
        return;
      }

      // -----------------------------------------------------------------------
      // 6. GET /api/kickstart/admin/orders (Admin Dashboard API)
      // -----------------------------------------------------------------------
      if (req.method === 'GET' && pathname === '/api/kickstart/admin/orders') {
        const authHeader = req.headers['authorization'] || '';
        const adminKey = req.headers['x-admin-key'] || (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '');
        const validKey = cfg.acPayWebhookSecret || process.env.ADMIN_API_TOKEN || 'admin';
        if (!adminKey || adminKey !== validKey) {
          sendJson(401, { error: 'Admin authentication required.', code: 'ADMIN_AUTH_REQUIRED' });
          return;
        }

        const q = String(parsedUrl.searchParams.get('q') || parsedUrl.searchParams.get('search') || '').trim().toLowerCase();
        const statusFilter = String(parsedUrl.searchParams.get('status') || 'ALL').trim().toUpperCase();
        const ticketFilter = String(parsedUrl.searchParams.get('ticket') || 'ALL').trim().toLowerCase();

        const allRows = db.prepare('SELECT * FROM kickstart_registrations ORDER BY registered_at DESC').all();

        // Calculate metrics
        let totalOrders = allRows.length;
        let successfulPayments = 0;
        let pendingPayments = 0;
        let failedPayments = 0;
        let totalRevenue = 0;

        for (const r of allRows) {
          if (r.payment_status === 'VERIFIED_PAID') {
            successfulPayments++;
            totalRevenue += Number(r.amount_rupees || 0);
          } else if (['PENDING_PAYMENT', 'MANUAL_REVIEW', 'ACTIVE'].includes(r.payment_status)) {
            pendingPayments++;
          } else if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(r.payment_status)) {
            failedPayments++;
          }
        }

        const filtered = allRows.filter(r => {
          if (q) {
            const match =
              String(r.student_name || '').toLowerCase().includes(q) ||
              String(r.roll_number || '').toLowerCase().includes(q) ||
              String(r.order_id || '').toLowerCase().includes(q) ||
              String(r.email || '').toLowerCase().includes(q) ||
              String(r.utr || '').toLowerCase().includes(q);
            if (!match) return false;
          }

          if (statusFilter !== 'ALL') {
            if (statusFilter === 'SUCCESS' && r.payment_status !== 'VERIFIED_PAID') return false;
            if (statusFilter === 'PENDING' && !['PENDING_PAYMENT', 'MANUAL_REVIEW', 'ACTIVE'].includes(r.payment_status)) return false;
            if (statusFilter === 'FAILED' && !['FAILED', 'EXPIRED', 'CANCELLED'].includes(r.payment_status)) return false;
            if (!['SUCCESS', 'PENDING', 'FAILED'].includes(statusFilter) && r.payment_status !== statusFilter) return false;
          }

          if (ticketFilter !== 'all') {
            const ids = JSON.parse(r.selected_ticket_ids || '[]');
            const names = String(r.ticket_names || '').toLowerCase();
            const match = ids.includes(ticketFilter) || names.includes(ticketFilter);
            if (!match) return false;
          }

          return true;
        });

        sendJson(200, {
          stats: {
            totalOrders,
            successfulPayments,
            pendingPayments,
            failedPayments,
            totalRevenue: totalRevenue.toFixed(2),
            currency: 'INR'
          },
          totalCount: filtered.length,
          orders: filtered.map(r => ({
            id: r.id,
            orderId: r.order_id,
            studentName: r.student_name,
            rollNumber: r.roll_number,
            department: r.department,
            year: r.year,
            email: r.email,
            phone: r.phone,
            selectedTicketIds: JSON.parse(r.selected_ticket_ids || '[]'),
            ticketNames: r.ticket_names,
            amountRupees: r.amount_rupees,
            amountPaise: r.amount_paise,
            paymentId: r.payment_id,
            paymentStatus: r.payment_status,
            utr: r.utr,
            verificationLevel: r.verification_level,
            registeredAt: r.registered_at,
            verifiedAt: r.verified_at,
            resumeName: r.resume_name,
            whyKickstart: r.why_kickstart
          }))
        });
        return;
      }

      // -----------------------------------------------------------------------
      // 7. GET /api/kickstart/admin/orders/export.csv (CSV Export API)
      // -----------------------------------------------------------------------
      if (req.method === 'GET' && pathname === '/api/kickstart/admin/orders/export.csv') {
        const authHeader = req.headers['authorization'] || '';
        const adminKey = req.headers['x-admin-key'] || (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '') || parsedUrl.searchParams.get('key');
        const validKey = cfg.acPayWebhookSecret || process.env.ADMIN_API_TOKEN || 'admin';
        if (!adminKey || adminKey !== validKey) {
          sendJson(401, { error: 'Admin authentication required.', code: 'ADMIN_AUTH_REQUIRED' });
          return;
        }

        const q = String(parsedUrl.searchParams.get('q') || '').trim().toLowerCase();
        const statusFilter = String(parsedUrl.searchParams.get('status') || 'ALL').trim().toUpperCase();
        const ticketFilter = String(parsedUrl.searchParams.get('ticket') || 'ALL').trim().toLowerCase();

        const allRows = db.prepare('SELECT * FROM kickstart_registrations ORDER BY registered_at DESC').all();

        const filtered = allRows.filter(r => {
          if (q) {
            const match =
              String(r.student_name || '').toLowerCase().includes(q) ||
              String(r.roll_number || '').toLowerCase().includes(q) ||
              String(r.order_id || '').toLowerCase().includes(q) ||
              String(r.email || '').toLowerCase().includes(q) ||
              String(r.utr || '').toLowerCase().includes(q);
            if (!match) return false;
          }

          if (statusFilter !== 'ALL') {
            if (statusFilter === 'SUCCESS' && r.payment_status !== 'VERIFIED_PAID') return false;
            if (statusFilter === 'PENDING' && !['PENDING_PAYMENT', 'MANUAL_REVIEW', 'ACTIVE'].includes(r.payment_status)) return false;
            if (statusFilter === 'FAILED' && !['FAILED', 'EXPIRED', 'CANCELLED'].includes(r.payment_status)) return false;
            if (!['SUCCESS', 'PENDING', 'FAILED'].includes(statusFilter) && r.payment_status !== statusFilter) return false;
          }

          if (ticketFilter !== 'all') {
            const ids = JSON.parse(r.selected_ticket_ids || '[]');
            const names = String(r.ticket_names || '').toLowerCase();
            const match = ids.includes(ticketFilter) || names.includes(ticketFilter);
            if (!match) return false;
          }

          return true;
        });

        const escapeCsv = (val) => {
          if (val === null || val === undefined) return '""';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        };

        const headers = [
          'Order ID',
          'Student Name',
          'Roll Number',
          'Department',
          'Year',
          'College Email',
          'Phone',
          'Interview Tracks',
          'Amount (INR)',
          'Payment Status',
          'Bank UTR',
          'Payment ID',
          'Registered At',
          'Verified At'
        ];

        const csvLines = [headers.map(escapeCsv).join(',')];
        for (const r of filtered) {
          csvLines.push([
            escapeCsv(r.order_id),
            escapeCsv(r.student_name),
            escapeCsv(r.roll_number),
            escapeCsv(r.department),
            escapeCsv(r.year),
            escapeCsv(r.email),
            escapeCsv(r.phone),
            escapeCsv(r.ticket_names),
            escapeCsv(r.amount_rupees),
            escapeCsv(r.payment_status),
            escapeCsv(r.utr || ''),
            escapeCsv(r.payment_id || ''),
            escapeCsv(r.registered_at),
            escapeCsv(r.verified_at || '')
          ].join(','));
        }

        const csvText = csvLines.join('\r\n');
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="kickstart-registrations-${new Date().toISOString().slice(0, 10)}.csv"`,
          'Cache-Control': 'no-cache'
        });
        res.end(csvText);
        return;
      }

      // -----------------------------------------------------------------------
      // 8. POST /api/kickstart/admin/orders/:orderId/verify (Manual Admin Verification)
      // -----------------------------------------------------------------------
      if (req.method === 'POST' && pathname.startsWith('/api/kickstart/admin/orders/') && pathname.endsWith('/verify')) {
        const authHeader = req.headers['authorization'] || '';
        const adminKey = req.headers['x-admin-key'] || (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '');
        const validKey = cfg.acPayWebhookSecret || process.env.ADMIN_API_TOKEN || 'admin';
        if (!adminKey || adminKey !== validKey) {
          sendJson(401, { error: 'Admin authentication required. Students cannot verify their own orders.', code: 'ADMIN_AUTH_REQUIRED' });
          return;
        }

        const match = /^\/api\/kickstart\/admin\/orders\/([^/]+)\/verify$/.exec(pathname);
        if (!match) {
          sendJson(400, { error: 'Invalid URL format' });
          return;
        }
        const orderId = decodeURIComponent(match[1]);
        const body = JSON.parse(await readBody().catch(() => '{}'));
        const operatorNotes = body.notes || 'Manually verified by Alumni Cell Administrator';
        const utr = body.utr || `MANUAL-${Date.now()}`;
        const nowIso = new Date().toISOString();

        const updated = db.prepare(`
          UPDATE kickstart_registrations
          SET payment_status = 'VERIFIED_PAID',
              utr = COALESCE(?, utr),
              verification_level = 2,
              verified_at = COALESCE(verified_at, ?),
              updated_at = ?
          WHERE order_id = ?
        `).run(utr, nowIso, nowIso, orderId);

        if (updated.changes === 0) {
          sendJson(404, { error: `Order ID not found: ${orderId}` });
          return;
        }

        sendJson(200, {
          success: true,
          verified: true,
          orderId,
          utr,
          verifiedAt: nowIso,
          notes: operatorNotes
        });
        return;
      }

      sendJson(404, { error: `Endpoint not found: ${req.method} ${pathname}` });
    } catch (err) {
      console.error('[KickStart Server Error]:', err);
      sendJson(500, { error: 'Internal Server Error', message: err.message });
    }
  });

  return server;
}

// Auto-run if executed directly as entrypoint
if (process.argv[1] && process.argv[1].endsWith('server/index.js')) {
  const srv = createKickStartServer();
  srv.listen(CONFIG.port, () => {
    console.log('====================================================');
    console.log(`🚀 KickStart Backend running at: http://localhost:${CONFIG.port}`);
    console.log(`🔗 Connected to AC-Pay Gateway at: ${CONFIG.acPayApiUrl}`);
    console.log('====================================================');
  });
}
