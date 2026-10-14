# Overview
Designing an application for a agentic ai spy handler game. The purpose of the game is for players to act as a "spy handler" that recieves phone calls from "operators". The operators will describe actions they can complete but need your guidance. The phone calls will go to handsets in the real world.

## Style & Design System (For Google Stitch)
1960s Cold War intelligence dossier and teletype dispatch. High-contrast classified filing document aesthetic. Mechanical tactile toggles, pilot lamps, and stamped label buttons instead of modern glassmorphism.

### Design Tokens & Color Palette
* **Surfaces & Backgrounds:**
  * Desk / Outer Canvas: Institutional olive-slate desk surface (`#2E3430` / `#222824`)
  * Document Paper: Aged manila folder buff (`#F2E8D5` / `#E9DCBF`)
  * Sub-documents / Index Cards: Crisp bleached typewriter stock (`#FAF6EE`)
* **Inks & Typography:**
  * Carbon Ink: Rich typewriter carbon black (`#161616`)
  * Mimeograph Ink: Faded administrative slate navy (`#333D45`)
  * Primary Display Font: Uppercase bold condensed mid-century grotesque (`font-sans tracking-wider uppercase font-black`)
  * Body & Data Font: Mechanical typewriter monospace (`font-mono tracking-tight`)
* **Accents & Telemetry:**
  * Classification Crimson: Inked rubber stamp red (`#BA2D27`)
  * Field Approval Green: Stamped forest green (`#276B3D`)
  * Pilot Lamps: Amber (`#F59E0B`), Ruby Red (`#DC2626`), Signal Green (`#16A34A`) with warm tungsten center point and chrome knurled bezels.
  * Dymo Tape Buttons: Matte black or crimson vinyl strip with crisp, slightly misaligned raised white embossed sans-serif lettering and hard mechanical offset shadows (`shadow-[2px_2px_0px_#000]`).
* **Borders & Shadows:**
  * Sharp 1px to 2px solid dark borders (`border border-stone-800`).
  * Hard physical drop shadows only (`shadow-[3px_3px_0px_rgba(0,0,0,0.65)]`); NO diffuse soft blurs.

### Negative Constraints (Strictly Avoid in Stitch Generations)
* **NO Modern Glassmorphism:** Never use `backdrop-blur`, translucent glass layers, or floating glow pills.
* **NO Smooth Rounded Corners:** Avoid `rounded-xl`, `rounded-2xl`, and `rounded-full` (except circular pilot lamps and rubber stamps). Buttons and containers must use `rounded-none` or `rounded-xs`.
* **NO Soft Gradients or Neon Highlights:** Stick to flat matte paper, heavy mechanical textures, and carbon ink bleed.
* **NO Modern SaaS Icons:** Use literal period-accurate glyphs, stamped text tags, metal paperclips, or brackets (`[ + ]`, `[ • ]`, `[ X ]`) instead of minimalist line-art icon libraries.

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
The handler's live war room console during active operations, synchronized with physical telephone handset calls and real-time Server-Sent Events (SSE).

* **Bureau Status Header & Emergency Controls:**
  * Bureau Title: `OPERATOR MANAGEMENT BUREAU // ACTIVE OPERATIONS FREQUENCY`
  * Mechanical Nixie-tube or mechanical flip-counter mission clock tracking total operation elapsed time.
  * **Emergency Abort Switch:** Industrial red mechanical toggle switch protected under a flip-up transparent acrylic safety hood: `[ EMERGENCY ABORT // SEVER FREQUENCY ]` (calls backend `/sessions/:sessionId/end`).

* **Top Operative Badge Switchboard:**
  * Horizontal row of heavy cardstock ID badges pinned along the top of the desk.
  * **Badge Anatomy:**
    * Black-and-white passport mugshot of the operative.
    * Stencil codename (e.g., `OPERATIVE: FALCON`).
    * Faceted jewel pilot lamp indicating status:
      * *Flashing Red/Amber:* Incoming ring to handler's real-world handset.
      * *Steady Green:* Active call in progress (audio cipher connected).
      * *Dim Amber:* Operative en route between checkpoints.
      * *Red Rubber Stamp:* M.I.A. / Compromised or Cleared.
    * Interaction: Clicking any badge opens the **Agent Detail Dossier Pop-Up**.

* **Live Call Transmission Pop-Up (Active Line HUD):**
  * Appears prominently when a call is answered on the physical handset:
    * Displays the speaking operative's badge and codename.
    * Glowing green pilot lamp: `SECURE AUDIO ENCRYPTED // CALL TIME: [MM:SS]`.
    * Analog needle-deflecting **VU Meter** in a brushed-metal bezel, vibrating to simulate audio transmission feedback over the telephone line.
    * Subtle background static / telephone line frequency hum graphic.

* **Agent Detail Dossier Pop-Up (Modal on Badge Click):**
  * Manila personnel file folder (`FORM OMB-88: OPERATIVE EVALUATION`) with brass brads and paperclip graphics.
  * **Contents:**
    * Operative portrait, clearance grade, and redacted civilian name (`NAME: ████████`).
    * **Operational Strengths:** Typewriter bulleted traits (e.g., `+ Master Locksmith & Safe Infiltration`, `+ Fluent in German/Russian`, `+ Calm under surveillance`).
    * **Known Vulnerabilities / Weaknesses:** Typewriter warning section with red ink flags (e.g., `! Impulsive in fire fights`, `! Susceptible to blackmail concerning family`).
    * Close button: Stamped wooden ink mark: `[ RETURN TO OPERATIONS DESK ]`.

* **Unified Mission Objective & Checkpoint Timeline:**
  * Single chronological mission progression track shared across all operatives, displayed as a stamped bureaucratic docket across the desk surface:
    * **Objectives (Major Phases):** Heavy manila folder tabs dividing mission chapters (e.g., `PHASE 1: EMBASSY INFILTRATION`).
    * **Checkpoint Cards (Operational Steps):**
      * Operative Assignment Tag: Stamped mini-badge showing which operative is assigned to this specific checkpoint.
      * *Cleared Checkpoints:* Stamped with angled green rubber ink `[ SECURED // HH:MM:SS ]` with single strikethrough lines.
      * *Active Live Checkpoint:* Circled with red wax pencil, pulsing amber jewel light, displaying the real-time crisis or decision facing the operative currently on the telephone line.
      * *Pending Checkpoints:* Blacked out with classified marker bars (`CLASSIFIED // LEVEL 4`) to preserve decision suspense.
    * **Toggleable Handler Intel Drawer:**
      * Each checkpoint card features a tactile metal switch or tab: `[ FLIP FOR INTERCEPT INTEL / CLUES ]`.
      * Toggling reveals hand-scribbled handler margin notes, intercepted radio frequencies, blueprints, or guard rotation timetables to assist the player during their voice decision.

* **Live Teletype Dispatch Stream (Bottom Ribbon):**
  * Continuous teletype ribbon roll along the bottom edge, outputting real-time Server-Sent Events (SSE) timestamps:
    * `11:14:02 - OMB DISPATCH: LINE CONNECTED TO OPERATIVE FALCON`
    * `11:15:30 - CHECKPOINT 1 CLEARED: PERIMETER BREACH VERIFIED`

### Mission History
Styled as an opened, wide hardbound government ledger book resting on an institutional desk surface (`FORM OMB-99: MASTER REGISTRY OF COVERT ENGAGEMENTS`).
* **Persistent Bureau Header:**
  * Bureau Title: `OPERATOR MANAGEMENT BUREAU // CENTRAL ARCHIVAL DIVISION`
  * Navigation Tabs: `[ REQUISITION OPERATION (NEW) ]`, `[ ARCHIVAL LEDGER (ACTIVE) ]`, `[ SEVER LINE (LOGOUT) ]`
* **Ledger Book Container:**
  * Heavy canvas-bound book spine and aged cream paper with faint blue/red vertical accounting ruling lines.
  * Official bureau seal ink mark in the top margin with stamped archival volume: `VOLUME IV // CLASSIFIED OPERATIONS REGISTRY`.
* **Ledger Entries (Columns):**
  * **DATE ATTEMPTED:** Cold War typewriter date stamp format (e.g., `14 OCT 1964 // 21:40 HRS`).
  * **MISSION NAME:** Bold monospace typewriter font (e.g., `OPERATION: COLD BREEZE`).
  * **OUTCOME:** Inked rubber stamps slightly misaligned across the entry:
    * Bold Green Ink: `[ ACCOMPLISHED // OBJECTIVE SECURED ]`
    * Crimson Ink: `[ COMPROMISED // ASSETS LOST ]`
    * Carbon Black Ink: `[ ABORTED // LINE SEVERED BY HANDLER ]`
* **Interaction & Routing:**
  * Hovering an entry casts a soft yellow grease-pencil highlight line across the ledger row.
  * Clicking any entry navigates the handler to the **Mission History Detail** page for that specific operation.

### Mission History Detail
Styled as an opened classified "AFTER-ACTION DEBRIEFING & INVESTIGATION REPORT" (`FORM OMB-701-A`) dossier folder spread open across a briefing desk.
* **Header & Official Ruling:**
  * Bureau Title: `OPERATOR MANAGEMENT BUREAU // POST-OPERATION INQUIRY DIVISION`
  * Operation Codename & Date: `CASE FILE: OPERATION [CODENAME] // RECORDED [DATE]`
  * Bold diagonal rubber ink stamp across the report header: `DECLASSIFIED FOR INTERNAL INQUIRY // CASE CLOSED`.
  * **Bureau Performance Assessment:** Stamped rating box (e.g., `OFFICIAL EVALUATION: MERITORIOUS FIELD GUIDANCE` or `OFFICIAL EVALUATION: CRITICAL ASSET LOSS // REPRIMAND`).
* **Operative Fate & Status Roster:**
  * Pinned passport badges of all participating field operatives with stamped post-action status overlays:
    * `EXTRACTED SAFELY TO BERLIN SECTOR` (Green stamp)
    * `APPREHENDED BY HOSTILE COUNTER-INTEL` (Red stamp)
    * `RADIO CONTACT SEVERED / M.I.A.` (Black stamp)
* **Sequential Checkpoint & Directive Transcript:**
  * Chronological typewriter breakdown of the operation timeline:
    * **Checkpoint Step:** Location and situation encountered.
    * **Handler Directives:** Logged instruction provided by the handler during the physical phone call.
    * **Operational Outcome:** Resulting field development and timing metrics.
* **Navigation Actions:**
  * Primary Action: Embossed black Dymo tape button: `[ RETURN TO MASTER ARCHIVAL LEDGER ]` -> routes back to Mission History.
  * Secondary Action: Manila tab button: `[ REQUISITION NEW OPERATION ]` -> routes to New Mission Page.