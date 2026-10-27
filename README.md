# FairShift — Decent Work Platform for UN SDG 8

**FairShift** is a full-stack, multilingual platform dedicated to **UN Sustainable Development Goal 8 (Decent Work and Economic Growth)**. It makes shift-based work fairer, safer, and more transparent for frontline staff while providing employers with real-time, actionable insights into workforce health, circadian safety, and retention.

---

## 1. Problem Statement & UN SDG 8 Alignment

Over 2 billion frontline and shift-based workers globally (nurses, sanitization crew, security personnel, attendants, campus staff) face pervasive labor inequities:
- **Opaque Hours & Unfair Midnight Truncation**: Shifts spanning midnight often get misallocated or lose overtime attribution.
- **Incomprehensible Payslips**: Confusing deductions and hidden allowances lead to wage disputes and exploitation.
- **Hazard Silence & Barriers**: Frontline workers lack easy, voice-accessible tools to report biohazards, needle sticks, or equipment faults without fear of reprisal.
- **Fatigue & Circadian Health Hazards**: Back-to-back shifts with under 8 hours of rest, excessive consecutive night shifts, and double shifts degrade clinical safety and drive worker burnout.
- **Vulnerable Feedback**: Workers rarely report unsafe conditions because feedback is linked to their identity.

### Alignment with UN SDG Target 8.8:
> *"Protect labour rights and promote safe and secure working environments for all workers, including migrant workers, in particular women migrants, and those in precarious employment."*

FairShift operationalizes SDG 8 through:
1. **Target 8.5 (Decent Work & Fair Pay)**: Transparent shift calculations, 1.5x overtime premiums, and dedicated night allowances explained in the worker's native language.
2. **Target 8.8 (Safe Workplaces)**: Voice-enabled safety reporting categorized with severity by Google Gemini AI, with high-priority tracking for life-threatening biohazards and needle sticks.
3. **Worker Privacy Protection**: Strict zero-identity feedback aggregated only when a threshold of **$\ge 5$ workers** respond.
4. **Circadian Fatigue & Burnout Safeguards**: Proactive warnings for short turnarounds, $>3$ consecutive night shifts, and transparent rule-based attrition risk scores.

---

## 2. Core Architecture & Interfaces

FairShift runs as a unified full-stack application (Express + React 19 + TypeScript + Vite) with clean separation of concerns:

```
├── /server.ts                 # Express full-stack proxy & Gemini AI endpoints
├── /src/
│   ├── config/sectors.ts     # Config-driven sector definitions (zero duplicated code)
│   ├── utils/                # Pure business logic functions
│   │   ├── shiftCalculations.ts    # Midnight attribution, overtime & night hours
│   │   ├── payslipCalculations.ts  # Itemized earnings, allowances & deductions
│   │   ├── fatigueAnalysis.ts      # Circadian & shift fatigue rules
│   │   ├── attritionScore.ts       # Transparent rule-based retention score
│   │   ├── certificationExpiry.ts  # 30-day credential expiry check
│   │   └── speech.ts               # Web Speech STT & TTS wrappers
│   ├── i18n/                 # 4-language dictionaries (EN, Tamil, Hindi, Telugu)
│   ├── services/
│   │   └── repository.ts     # Repository Pattern (swap in Firestore without touching UI)
│   ├── components/           # Reusable UI (Navbar, Voice Assistant, Modals)
│   └── pages/
│       ├── LandingPage.tsx   # SDG 8 overview, sector switcher, role launcher
│       ├── WorkerApp.tsx     # Mobile-first app for low-end smartphones
│       └── AdminDashboard.tsx# Desktop employer workforce health monitor
├── /tests/                   # Vitest unit test suite (14 passing tests)
├── Dockerfile                # Multi-stage Cloud Run container specification
└── metadata.json             # AI Studio capability configuration
```

### Two Working Interfaces:
1. **Worker App (`/worker`)**:
   - **Mobile-First**: Optimized for low-end smartphones with large touch targets ($\ge 48\text{px}$), high-contrast badges (color + icon, never color alone), and minimal bandwidth usage.
   - **Voice-Enabled**: Speech-to-Text for hands-free hazard reporting and Text-to-Speech to read payslips and shift summaries aloud.
   - **Multilingual**: English, Tamil (தமிழ்), Hindi (हिन्दी), and Telugu (తెలుగు) toggleable on every screen.
   - **5 Tabs**:
     - *Shift Check-in*: 1-tap check-in, station QR scanner, live elapsed timer, and midnight work date attribution.
     - *Payslip*: Gross/net breakdown, base pay, overtime, night shift allowance, and Gemini AI multilingual audio explanation.
     - *Report Hazard*: Voice or text reporting with Gemini categorization into sector categories, severity triage, and live status tracking (Reported $\rightarrow$ Acknowledged $\rightarrow$ In Progress $\rightarrow$ Resolved).
     - *Skill Passport*: Portable certifications, verifying BLS/CPR, infection control, and flagging credentials expiring in $<30$ days.
     - *Anonymous Feedback*: Zero-identity workplace ratings.

2. **Employer / Admin Dashboard (`/admin`)**:
   - **Executive Oversight**: Real-time attendance, overtime load %, active fatigue flags, and open hazard counter.
   - **Priority Safety Board**: Automatically pins needle-stick injuries, biohazards, and workplace violence to the top.
   - **Fatigue Protection Panel**: Actionable alerts with clear clinical reasons (e.g. "4 consecutive night shifts", "$<11\text{h}$ rest between night and morning shift").
   - **Transparent Attrition Risk Monitor**: Deterministic 0–100% score based on overtime burden, absenteeism, fatigue flags, and sentiment.
   - **Compliance Matrix**: Tracks certifications expiring within 30 days.
   - **Anonymous Sentiment**: Aggregated feedback with a strict $\ge 5$ response anonymity gate.

---

## 3. Config-Driven Sector Architecture

All sector logic, roles, departments, shifts, overtime rules, safety categories, skills, and feedback questions live in `/src/config/sectors.ts`. **No duplicated pages or components are used.**

### Included Sectors:
1. **Hospital Profile (Primary)**:
   - *Roles*: Ward Nurse, Nursing Attendant, Sanitation Staff, Lab Technician, Hospital Security.
   - *Departments*: ICU, General Ward, Emergency & Trauma, Operation Theatre, Laundry & Sanitation.
   - *Shifts*: Morning (6am–2pm), Evening (2pm–10pm), Night (10pm–6am), 12h Nurse Rotations (7am–7pm / 7pm–7am).
   - *Safety Categories*: Needle-stick injury (High), Biohazard waste (High), Workplace violence (High), Infection lapse, Patient handling, Slip hazard, Oxygen/electrical fault, Chemical exposure.
   - *Skill Passport*: BLS/CPR, Infection Control, Biomedical Waste Handling, Hepatitis B Vaccination, Fire Evacuation, Patient Handling.
2. **College/School Campus Profile (Secondary)**:
   - *Roles*: Housekeeping, Campus Security, Canteen Staff, Lab Attendant, Gardener.
   - *Departments*: Academic Blocks, Student Hostels, Dining Hall & Canteen, Science Labs, Campus Grounds.
   - *Shifts*: Standard Day (8am–4pm), Split Shift (7–11am & 3–7pm), Night Patrol (8pm–6am).
   - *Safety Categories*: Electrical hazard, Slip/fall, Hygiene failure, Fire risk, Equipment fault, Harassment.
   - *Skill Passport*: Workplace First Aid, Food Safety (FSSAI), Machinery Handling.
3. **Manufacturing Plant (Extensibility Showcase)**:
   - Adding a new sector (e.g., Construction or Factory) requires **only** an entry in `SECTORS` in `/src/config/sectors.ts`.

---

## 4. Security & Privacy

- **No Client-Side Secrets**: `GEMINI_API_KEY` is loaded exclusively server-side via `process.env.GEMINI_API_KEY`.
- **API Proxy**: Frontend calls `/api/gemini/categorize-hazard` and `/api/gemini/explain-payslip`.
- **Rate Limiting & Sanitization**: Express server implements in-memory IP rate limiting and input truncation.
- **Anonymity Safeguard**: Feedback submissions carry zero user ID, session token, or IP footprint. Aggregated sentiment is locked until $\ge 5$ responses are received.

---

## 5. Seed Data

The platform comes pre-seeded with realistic frontline worker data:
- **Priya Sundaram** (`hosp-w1`, Ward Nurse): Logged 4 consecutive night shifts (triggers Circadian Fatigue Alert) and has a BLS/CPR certification expiring in $<20$ days.
- **Rajesh Kumar** (`hosp-w2`, Nursing Attendant): Overtime shift logged with 1.5x pay rate.
- **Sunita Devi** (`hosp-w3`, Sanitation Staff): Evening shifts and biohazard spill reporting.
- **Arun Joseph**, **Lakshmi Rao**, **Mohammad Farooq**: Hospital staff roster.
- **6 Campus Workers**: Ramesh Babu, Kavita Sharma, Suresh Patel, Deepa Nair, Manoj Yadav, Anita Kumari.
- **3 Hospital Safety Reports**: Needlestick injury in Emergency (High / In Progress), Biohazard spill in ICU (High / Acknowledged), Slip hazard in Laundry (Low / Resolved).

---

## 6. How to Run & Test

### Development:
```bash
# 1. Install dependencies
npm install

# 2. Start full-stack server (Vite + Express on Port 3000)
npm run dev
```

### Run Unit Tests:
```bash
# Runs Vitest unit tests covering midnight attribution, overtime, payslip, fatigue, and attrition
npm test
```

### Production Build & Container:
```bash
# Build static assets
npm run build

# Start production server
npm start
```

### Cloud Run Deployment:
The included multi-stage `Dockerfile` exposes `PORT=8080` (or `process.env.PORT`) with health checking at `/health`:
```bash
docker build -t fairshift:latest .
docker run -p 8080:8080 -e GEMINI_API_KEY="your-api-key" fairshift:latest
```
Visit `http://localhost:8080/health` to verify container health.
