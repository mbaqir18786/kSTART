/**
 * KickStart 2027 — Official Ticket Passes
 * Three core interview tracks offered by Alumni Cell KJSSE:
 * 1. Technical Interview
 * 2. Non-Technical Interview
 * 3. Mock Interview
 *
 * NOTE: Prices are configurable defaults for development / testing.
 * The backend server strictly recalculates and validates all totals.
 */
export const TICKETS = [
  {
    id: 'tech',
    name: 'Technical Interview',
    price: 50, // Default placeholder: ₹50
    desc: 'Deep-dive domain interview with alumni engineers covering Data Structures, Algorithms, System Design & Core Branch Concepts.',
    tags: 'Core / Tech Domains',
    badge: 'Popular',
    icon: '💻'
  },
  {
    id: 'non-tech',
    name: 'Non-Technical Interview',
    price: 40, // Default placeholder: ₹40
    desc: 'Managerial & HR round preparation focusing on behavioral questions, case studies, situational judgment and leadership scenarios.',
    tags: 'Consulting / Product / HR',
    badge: 'Essential',
    icon: '📊'
  },
  {
    id: 'mock',
    name: 'Mock Interview',
    price: 30, // Default placeholder: ₹30
    desc: 'Full-simulation trial interview with real-time alumni feedback, scorecards, resume vetting and body language review.',
    tags: 'Aptitude + Simulation + GD',
    badge: 'Recommended',
    icon: '🎯'
  }
];

export const TICKET_MAP = Object.fromEntries(TICKETS.map(t => [t.id, t]));
