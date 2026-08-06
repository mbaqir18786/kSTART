# ✦ KJSCE KickStart 2026

KickStart is the flagship placement preparation event hosted by the **KJ Somaiya College of Engineering Alumni Cell**. It connects current students with distinguished alumni mentors to prepare them for corporate interviews, aptitude tests, group discussions, and technical rounds.

---

## 🎨 Design System & Aesthetics
- **Dark Editorial Theme:** Styled using a premium, content-first dark palette:
  - Deep rich background (`#111110`)
  - Elevated card surfaces (`#1c1c1a`)
  - Warm editorial off-white text (`#f0ede6`)
  - Electric chartreuse accent color (`#c8f04a`)
- **Typography:** Uses premium editorial header layouts with large structured headings and monospace data tags (`supply-mono`).
- **Smooth Interaction:** Integrated with **Lenis Smooth Scroll** and **GSAP ScrollTrigger** for micro-interactions and smooth anchor transitions.

---

## 🚀 Key Features

### 1. Dynamic Hero Presentation
- Massive editorial **KICKSTART** header with vertical typography hierarchy.
- Background features a muted ambient background loop.
- Features a rapid-fire image slideshow (`250ms` cycles) showing past highlights.

### 2. Event Timeline (Horizontal Scroll)
- **Desktop:** Pins the viewport and scrolls horizontally to animate past events and descriptions in a 3D perspective layout.
- **Mobile:** Automatically shifts to a vertical timeline list using `gsap.matchMedia()`, ensuring no horizontal scrollbar bleedout on phones.

### 3. Alumni Speakers Section
- Clean grid showing speaker profiles, current corporate roles, and graduation years.
- Interactive hover transitions highlighting graduation years in chartreuse.

### 4. Ticket Passes (Table Layout)
- Refined pricing list styled as a clean editorial table (row-by-row) instead of generic floating cards.
- Clicking **"Buy Now"** redirects to the registration form and passes the selected ticket ID via router state.

### 5. Smart Registration Form
- **Auto-populate:** Reads the selected ticket pass from the route and pre-selects the dropdown option automatically.
- Includes resume file uploads, department selection, and custom entry validation.
- Responsive fields that stack naturally on narrow viewports.
- Mouse trail hover interaction that runs behind the form container.

### 6. Interactive FAQ Accordion
- Responsive, clean Q&A accordion with smooth transition heights when toggling queries.

---

## 🛠️ Tech Stack & Dependencies
- **Core:** React 18, Vite, React Router DOM v6
- **Animations:** GSAP 3, `@gsap/react`
- **Scrolling:** `@studio-freight/react-lenis`

---

## 📦 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Development
Runs the dev server on local port (defaults to `http://localhost:5173` or `5174`):
```bash
npm run dev
```

### 3. Build for Production
Creates highly optimized static bundles under `/dist`:
```bash
npm run build
```