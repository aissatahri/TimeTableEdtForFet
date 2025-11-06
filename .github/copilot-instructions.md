# Timetable Manager - AI Coding Agent Instructions

**Last Updated**: November 3, 2025 at 14:30 UTC

## Project Overview
A bilingual (French/Arabic) school timetable management system with Spring Boot backend and Angular 17 frontend. Parses FET (Free Timetabling Software) XML exports to display teacher/class schedules, vacant rooms, and generate PDFs with proper Arabic text rendering.

## Architecture & Data Flow

### Backend (Spring Boot 3.3.5 / Java 17)
- **Entry Point**: `TimetableController` handles all API endpoints and maintains in-memory state
- **XML Parsing**: `TimetableParser` reads FET XML files (teachers.xml, subgroups.xml, activities.xml)
- **Auto-loading**: On startup, backend automatically loads XMLs from `backend/data/` directory if present
- **Renaming System**: Teacher/room names can be aliased via `mappings.json` (persisted in `backend/data/`)
  - Original names used internally for data lookup
  - Renamed aliases returned in API responses
  - Critical: Always use `applyTeacherMapping()`/`applyRoomMapping()` in API responses

### Frontend (Angular 17 Standalone)
- **No NgModules**: All components use `standalone: true` with explicit imports
- **State Management**: Local component state, no NgRx/services for state
- **Language**: `LanguageService` provides FR/AR translations, updates `dir` attribute for RTL
- **School Config**: Stored in browser `localStorage` (logo as base64, academy/direction/establishment names)

### Critical Data Structures
```typescript
// Backend maintains these in-memory after XML upload:
Map<teacherName, Map<dayRaw, Map<hour, {subject, students, room}>>>
Map<subgroupName, Map<dayRaw, Map<hour, {teacher, subject, room}>>>
List<ActivitySlot{dayRaw, hour, room}>

// dayRaw format: "Lundi_M" (morning) or "Lundi_S" (evening)
// hour format: "H1" through "H4" (mapped to actual times)
// Subgroup naming: "3APIC-5:G1" (class:group) or auto-generated variants
```

## Development Workflows

### Running the Application
```bash
# Backend (PowerShell)
cd backend
mvn clean package -DskipTests
java -jar target/timetable-backend-0.0.1-SNAPSHOT.jar
# Runs on http://localhost:8081

# Frontend (PowerShell)
cd timetable-frontend-angular17
npm install
npm start
# Runs on http://localhost:4200
```

### Testing API Endpoints
```bash
# Upload XMLs
curl -X POST http://localhost:8081/api/upload -F teachersXml=@teachers.xml -F subgroupsXml=@subgroups.xml

# Get teacher timetable (handles renamed names)
curl http://localhost:8081/api/timetable/teacher/John%20Doe

# Get class timetable with labeling options
curl "http://localhost:8081/api/timetable/subgroup/3APIC-5?labelMode=diff&labelSubjects=Math"
```

### Debugging Common Issues
1. **CORS Errors**: Check `SecurityConfig.java` allows `http://localhost:4200`
2. **Arabic Text Not Rendering**: Verify Google Fonts loaded in browser DevTools > Network
3. **PDF Export Blank**: Check browser console for font loading errors; fallback to print dialog
4. **Data Not Persisting**: XMLs auto-save to `backend/data/` on upload; check file permissions

## Project-Specific Patterns

### 1. Subgroup Label Logic (Class Timetables)
**The "why"**: FET generates automatic subgroups (e.g., "3APIC-5:auto"), but real subgroups use ":G1", ":G2" suffixes. The system must:
- Hide auto-generated subgroups from lists (`isAutoSubgroup()` checks for ":auto", empty suffix)
- When multiple subgroups have SAME session → display once without labels (default)
- When subgroups DIFFER → append "(G1)" to subject for each subgroup
- `labelMode=always` forces per-subgroup entries even when sessions match
- `labelSubjects` forces labeling for specific subjects (partial case-insensitive match)

**Key Methods**: `TimetableController.timetableForSubgroup()`, `extractClassBase()`, `sanitizeClassName()`

### 2. Slot Merging & Consecutive Hours
**Pattern**: Adjacent time slots with identical details are merged into ranges (e.g., "H1-H2 → 08:30 - 10:30")
- Backend merges teacher/room timetables via `canMergeTeacherSlots()`/`canMergeRoomSlots()`
- Must check: same day, period (matin/soir), subject, teacher, room, AND consecutive `hourId`
- Frontend displays merged slots in UI/PDF

### 3. Arabic PDF Generation Strategy
**Challenge**: jsPDF and html2canvas have poor Arabic shaping/bidi support.
**Solution**: Frontend applies Google Fonts (Cairo, Tajawal, Almarai) with explicit styles before PDF capture:
```typescript
// In timetable.component.ts exportPdf()
const arabicFonts = "'Cairo', 'Tajawal', 'Almarai', 'Noto Naskh Arabic', 'Amiri'";
element.style.fontFamily = arabicFonts;
element.style.fontFeatureSettings = "'liga', 'calt', 'kern', 'mark', 'mkmk', 'ccmp'";
```
- **Critical**: Wait for fonts to load (`document.fonts.ready`) before capture
- Fallback to browser print dialog (`window.print()`) for best Arabic rendering
- Backend PDF service (`PdfGeneratorService`) also loads TTF fonts but currently unused (frontend handles PDFs)

### 4. Renaming System
**Use Cases**: Display "منعم بكاوي" instead of "_منعم___بكاوي__FA48540", or "S1" instead of "P-A-002"
- Backend stores mappings in `TimetableController.teacherMappings` / `roomMappings`
- API endpoints: `POST /api/rename/teacher`, `POST /api/rename/room`
- Persisted to `backend/data/mappings.json` (simple JSON: `{"teachers":{orig:renamed}, "rooms":{...}}`)
- **Critical**: Always call `applyTeacherMapping()` / `applyRoomMapping()` before returning API responses
- When searching by renamed name, use `findOriginalTeacherName()` / `findOriginalRoomName()` to look up data

### 5. CORS Configuration
**Why Duplicated**: Both `@CrossOrigin` annotation on `TimetableController` AND `SecurityConfig.corsConfigurationSource()` bean exist for defense-in-depth. Spring Security intercepts before controller, so both layers needed.

### 6. Angular Standalone Components
**Pattern**: No `app.module.ts`. Each component declares imports:
```typescript
@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, TimetableComponent]
})
```
- Bootstrap in `main.ts` via `bootstrapApplication(AppComponent, {...})`

## Testing & Validation

### Manual Testing Checklist
1. Upload 3 XML files → verify teacher/class lists populate
2. Switch FR ↔ AR → check RTL layout and translations
3. Test renaming → ensure API returns renamed values, lookup still works
4. Export PDF with Arabic text → verify fonts render correctly
5. Test vacant rooms view → ensure all rooms appear, time slots match

### Key Files for Common Tasks
- **Add new API endpoint**: Edit `TimetableController.java`, add method, test with curl
- **Add translation**: Update `LanguageService.TRANSLATIONS` object
- **Modify timetable display**: Edit `timetable.component.html` grid rendering logic
- **Fix PDF fonts**: Check `timetable.component.ts` `loadGoogleFonts()` and font fallback list

## External Dependencies
- **FET Timetabling Software**: Source of XML exports (not included, user provides)
- **Google Fonts CDN**: Cairo, Tajawal, Almarai for Arabic rendering
- **iText7**: Backend PDF library (currently unused; frontend handles PDFs)
- **jsPDF + autoTable**: Frontend PDF generation

## Special Conventions
1. **Day Names**: Backend returns French ("Lundi"), frontend translates for display
2. **Time Slot IDs**: "H1" through "H4" per period, mapped to actual times in `TimetableParser.mapHourToTimeslot()`
3. **Period Suffix**: dayRaw ends with "_M" (matin) or "_S" (soir) to distinguish morning/afternoon
4. **Sanitization**: Remove Arabic placeholder phrases like "مجموعات فرعية تلقائية" from class names before display

## Environment Notes
- **Windows PowerShell**: Use `;` for command chaining, not `&&`
- **Ports**: Backend :8081, Frontend :4200 (hardcoded in CORS config)
- **Data Persistence**: Only `backend/data/` XML files and `mappings.json`; no database

## When Making Changes
- **Backend API**: Update CORS if adding new headers/methods
- **Frontend UI**: Test both FR and AR languages, verify RTL layout
- **PDF Export**: Test with Arabic text, check font loading in browser DevTools
- **Renaming**: Ensure both forward (original→renamed) and reverse (renamed→original) lookups work
