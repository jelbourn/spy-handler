# Overview
Designing an application for a agentic ai spy handler game. The purpose of the game is for players to act as a "spy handler" that recieves phone calls from "operators". The operators will describe actions they can complete but need your guidance. The phone calls will go to handsets in the real world.

## Style Notes
1960s Cold War intelligence dossier and teletype dispatch. Manila folder cream background, carbon-ribbon typewriter typography, bold red rubber ink stamps ('TOP SECRET / EYES ONLY'), high-contrast classified filing document aesthetic. Mechanical tactile toggles and stamped label buttons instead of modern glassmorphism.

## Pages

### Landing Page
Centered classified dossier folder resting on an institutional desk surface.
* **Agency Header:** "OPERATOR MANAGEMENT BUREAU" in bold mid-century grotesque sans-serif with official circular OMB bureau seal and document code `FORM OMB-101 // SECURE HANDLER ACCESS GATEWAY`.
* **Framing / Container:** Centered buff manila personnel folder with a top tab marked `CLEARANCE: LEVEL 4`. Angled red ink rubber stamp on top-right: `CLASSIFIED // EYES ONLY`.
* **Status Indicator:** Faceted amber jewel pilot lamp with brass bezel: `TERMINAL STATUS: AWAITING CIPHER`.
* **Form Controls:**
  * Typewriter-styled bracketed input for Email / Handler ID: `HANDLER ID (EMAIL): [ _______________ ]`
  * Typewriter-styled bracketed input for Password: `CIPHER PASSCODE: [ •••••••••••• ]`
  * Primary Action: Heavy rectangular embossed Dymo label push-button (black vinyl, raised white lettering): `[ AUTHENTICATE CLEARANCE ]`
* **Navigation / Routing:**
  * Monospace underline link: `UNREGISTERED AGENT? FILE ENROLLMENT DOSSIER (SIGN-UP)` -> routes to Sign-up Page.
  * Successful authentication routes handler directly to the New Mission Page.

### Sign-up Page
Styled as an official "PERSONNEL INDUCTION & TELECOM REGISTRATION" (`FORM OMB-204-B`) dossier sheet secured with a metal paperclip graphic to a manila folder backer.
* **Agency Header:** "OPERATOR MANAGEMENT BUREAU // PERSONNEL INDUCTION DIVISION" with formal bureau watermark.
* **Framing / Container:** Two-column or structured index card layout with typewriter ruling lines and an official circular notary seal.
* **Form Controls:**
  * **Handler Name / Codename:** `DESIGNATED HANDLER CODENAME: [ _______________ ]`
  * **Secure Phone Handset (Real-World Dispatch):**
    * Field: `DIRECT DISPATCH FREQUENCY (PHONE NUMBER): [ +1 (___) ___-____ ]`
    * Thematic Security Note: Monospaced italic advisory: *"NOTICE: Must terminate at an active physical telephone handset. Bureau operatives will dial this line directly during active operations."*
  * **Cipher Passcode:** `ASSIGN MASTER SECURITY CIPHER: [ •••••••••••• ]`
  * **Primary Action:** Heavy rectangular embossed Dymo tape button (red vinyl with raised white lettering): `[ RATIFY ENROLLMENT & COMMISSION ]`
* **Navigation / Routing:**
  * Underline typewriter link: `ALREADY COMMISSIONED? RETURN TO CHECKPOINT (SIGN-IN)` -> routes to Landing Page.
  * Successful registration provisions the user record and routes to the New Mission Page.
### New Mission Page
Styled as an olive-drab metal filing cabinet drawer viewed from above, containing staggered classified mission folders.
* **Persistent Bureau Header:**
  * Bureau Title: `OPERATOR MANAGEMENT BUREAU // OPERATIONS DISPATCH`
  * Handler Telemetry Strip: `ACTIVE HANDLER: [ CODENAME ]` | `DISPATCH LINE: [ +1 (XXX) XXX-XXXX ]` | `STATION: ARMED`
  * Navigation Tabs: `[ REQUISITION OPERATION (NEW) ]`, `[ DOSSIER ARCHIVES (HISTORY) ]`, `[ SEVER LINE (LOGOUT) ]`
* **Filing Cabinet Drawer Container:**
  * Brass drawer label holder riveted to the container: `DRAWER 03: CONTINGENCY SCENARIOS // PENDING AUTHORIZATION`.
  * Heavy industrial olive-drab metal finish with interior filing dividers.
* **Interactive Mission Folders (Cards):**
  * Staggered manila folders lined up in the drawer with visible index tabs displaying operation codenames (`OPERATION: COLD BREEZE`, `OPERATION: BLACK CANARY`).
  * **Hover Interaction:** Hovering over a folder pops it upward out of the drawer stack (12-16px lift) with a sharp tactile drop shadow, revealing the dossier cover contents.
  * **Folder Cover Anatomy:**
    * Bold red ink classification stamp: `TOP SECRET // EYES ONLY`.
    * Paperclipped black-and-white passport-style headshots of assigned operatives with stencil names.
    * Typewriter mission briefing paragraph with sporadic redacted black marker blocks (`██████`).
    * Threat assessment and theater readout: `THEATER: EAST BERLIN (1964) | CADENCE: HIGH INTENSITY`.
    * Primary Launch Action: Embossed Dymo label push-button: `[ AUTHORIZE & DISPATCH OPERATIVES ]`.
* **Single Active Session Guard:**
  * If a mission is already active, folders are locked with a metal crossbar and a pinned teletype advisory memo: *"WARNING: DISPATCH LINE BUSY - OPERATION [NAME] CURRENTLY UNDERWAY"* with an urgent shortcut button: `[ RETURN TO RUNNING OPERATION ]`.
* **Routing:** Authorizing a mission sends a request to the backend, schedules the real-world telephone calls, and opens the Active Mission Page.

### Active Mission Page
The handler's real-time war room console during live operations, wired to real-world phone calls and live SSE event updates.
* **Mission Header & Emergency Controls:**
  * Top Bureau Banner: `OPERATION: [CODENAME] // LIVE FREQUENCY ACTIVE`
  * Mechanical elapsed mission timer styled as vintage nixie tubes or a flip-clock counter.
  * **Emergency Abort Switch:** Red industrial toggle switch beneath a flip-up transparent safety guard: `[ ABANDON MISSION // SEVER ALL LINES ]` (triggers session end).
* **Top Operative Badge Bar:**
  * A horizontal row of official Bureau security badges pinned along the top margin.
  * **Badge Card Anatomy:**
    * Black-and-white passport mugshot of the operative.
    * Stencil operative codename (e.g., `OPERATIVE: FALCON`).
    * Jeweled pilot lamp displaying real-time telephony status:
      * *Flashing Amber/Red:* `DIALING HANDLER HANDSET...`
      * *Steady Green:* `ON SECURE LINE (CALL IN PROGRESS)`
      * *Dim Amber:* `EN ROUTE / BETWEEN CHECKPOINTS`
      * *Static Stamp:* `CHECKPOINT SECURED` or `M.I.A. / COMPROMISED`
    * Click interaction: Clicking any badge opens the **Agent Detail Dossier Pop-Up**.
* **Agent Detail Dossier Pop-Up (Modal):**
  * Pinned manila personnel file (`FORM OMB-88: OPERATIVE EVALUATION`) overlaid with paperclip and brass brad graphics.
  * **Contents:**
    * Full operative portrait, clearance tier, and redacted biological identity (`NAME: ████████`).
    * **Operational Strengths:** Typewriter itemized list (e.g., `+ Master Locksmith & Safe Infiltration`, `+ Fluent in Russian/German`, `+ Cool under interrogation`).
    * **Known Vulnerabilities / Weaknesses:** Typewriter warning section flagged with red stamped exclamation marks (e.g., `! Reckless under artillery fire`, `! Chronic disregard for extraction protocol`).
    * Close trigger: Stamped wooden ink mark `[ RETURN TO OPERATIONS DESK ]`.
* **Objective & Checkpoint Timeline (Main Workspace):**
  * Visualized as a ruled teletype dispatch roll or linked index-card chain across the desk surface representing mission milestones:
    * **Objectives (High-Level Milestones):** Heavy tabbed folder headers.
    * **Checkpoints (Operational Steps):**
      * *Cleared Checkpoints:* Stamped with rubber ink `[ CHECKPOINT CLEARED // HH:MM:SS ]` with typewriter strikethroughs.
      * *Current Active Checkpoint:* Circled with red grease pencil / amber glow highlighting the exact situation the operative is phoning about.
      * *Subsequent Checkpoints:* Masked with classified redaction bars (`CLASSIFIED // PENDING FIELD PROGRESS`) to keep decision trees confidential until unlocked.
* **Live Teletype Event Stream:**
  * Continuous feed along the bottom margin rendering live Server-Sent Events (SSE) as real-world telephone calls connect, decisions are ratified, or status changes occur.

### Mission History
Shows a list of past missions, clicking on a mission leads you to the mission history detail page

### Mission History Detail