package com.example.timetable.controller;

import com.example.timetable.xml.TimetableParser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpSession;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Classe pour stocker les données d'un utilisateur (session)
 */
class UserData {
    Map<String, Map<String, Map<String, Map<String,String>>>> teachers = new HashMap<>();
    Map<String, Map<String, Map<String, Map<String,String>>>> subgroups = new HashMap<>();
    List<TimetableParser.ActivitySlot> activities = new ArrayList<>();
    Map<String, String> teacherMappings = new HashMap<>();
    Map<String, String> roomMappings = new HashMap<>();
    
    public boolean hasData() {
        return !teachers.isEmpty() || !subgroups.isEmpty() || !activities.isEmpty();
    }
}

@RestController
@RequestMapping("/api")
@CrossOrigin(
    origins = {
        "http://localhost:4200",
        "https://astonishing-charm-production.up.railway.app",
        "http://localhost:8081"
    },
    allowedHeaders = "*",
    methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, 
               RequestMethod.DELETE, RequestMethod.OPTIONS},
    allowCredentials = "true",
    maxAge = 3600
)
public class TimetableController {

    private static final String DATA_DIR = "data";
    private static final String SESSIONS_DIR = "sessions";
    private static final String TEACHERS_FILE = "teachers.xml";
    private static final String SUBGROUPS_FILE = "subgroups.xml";
    private static final String ACTIVITIES_FILE = "activities.xml";
    private static final String MAPPINGS_FILE = "mappings.json";

    // Stockage des données par session (multi-utilisateurs)
    private Map<String, UserData> userSessions = new ConcurrentHashMap<>();

    /**
     * Récupère les données de l'utilisateur courant (basé sur sa session)
     */
    private UserData getUserData(HttpSession session) {
        String sessionId = session.getId();
        return userSessions.computeIfAbsent(sessionId, k -> new UserData());
    }

    /**
     * Chargement automatique des fichiers XML au démarrage du backend
     * Désormais désactivé car chaque utilisateur a ses propres données
     */
    @PostConstruct
    public void loadDataOnStartup() {
        System.out.println("═══════════════════════════════════════════════════════════");
        System.out.println("  🚀 Backend Multi-Utilisateurs Démarré !");
        System.out.println("═══════════════════════════════════════════════════════════");
        System.out.println("  ✓ Chaque utilisateur aura son propre emploi du temps");
        System.out.println("  ✓ Les données sont isolées par session HTTP");
        System.out.println("  ✓ Prêt à recevoir des connexions...");
        System.out.println("═══════════════════════════════════════════════════════════");
    }
    
    /**
     * Sauvegarde les mappings de renommage pour un utilisateur dans son dossier de session
     */
    private void saveMappings(String sessionId, UserData userData) throws IOException {
        Path sessionPath = Paths.get(DATA_DIR, SESSIONS_DIR, sessionId);
        if (!Files.exists(sessionPath)) {
            Files.createDirectories(sessionPath);
        }
        
        // Construire le JSON manuellement
        StringBuilder json = new StringBuilder("{");
        json.append("\"teachers\":{");
        boolean first = true;
        for (Map.Entry<String, String> entry : userData.teacherMappings.entrySet()) {
            if (!first) json.append(",");
            json.append("\"").append(escapeJson(entry.getKey())).append("\":");
            json.append("\"").append(escapeJson(entry.getValue())).append("\"");
            first = false;
        }
        json.append("},\"rooms\":{");
        first = true;
        for (Map.Entry<String, String> entry : userData.roomMappings.entrySet()) {
            if (!first) json.append(",");
            json.append("\"").append(escapeJson(entry.getKey())).append("\":");
            json.append("\"").append(escapeJson(entry.getValue())).append("\"");
            first = false;
        }
        json.append("}}");
        
        Files.writeString(sessionPath.resolve(MAPPINGS_FILE), json.toString());
        System.out.println("✓ Mappings sauvegardés pour session: " + sessionId);
    }
    
    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
    
    /**
     * Applique les renommages aux noms de professeurs
     */
    private String applyTeacherMapping(String original, UserData userData) {
        if (original == null || original.isEmpty()) return original;
        return userData.teacherMappings.getOrDefault(original, original);
    }
    
    /**
     * Trouve le nom original d'un professeur à partir de son nom renommé
     */
    private String findOriginalTeacherName(String renamedOrOriginal, UserData userData) {
        if (renamedOrOriginal == null || renamedOrOriginal.isEmpty()) return renamedOrOriginal;
        
        // Vérifier si c'est déjà un nom original
        if (userData.teachers.containsKey(renamedOrOriginal)) {
            return renamedOrOriginal;
        }
        
        // Chercher dans les mappings (nom renommé -> nom original)
        for (Map.Entry<String, String> entry : userData.teacherMappings.entrySet()) {
            if (entry.getValue().equals(renamedOrOriginal)) {
                return entry.getKey(); // Retourner le nom original
            }
        }
        
        // Si pas trouvé, retourner tel quel
        return renamedOrOriginal;
    }
    
    /**
     * Applique les renommages aux noms de salles
     */
    private String applyRoomMapping(String original, UserData userData) {
        if (original == null || original.isEmpty()) return original;
        return userData.roomMappings.getOrDefault(original, original);
    }
    
    /**
     * Trouve le nom original d'une salle à partir de son nom renommé
     */
    private String findOriginalRoomName(String renamedOrOriginal, UserData userData) {
        if (renamedOrOriginal == null || renamedOrOriginal.isEmpty()) return renamedOrOriginal;
        
        // Chercher dans les mappings (nom renommé -> nom original)
        for (Map.Entry<String, String> entry : userData.roomMappings.entrySet()) {
            if (entry.getValue().equals(renamedOrOriginal)) {
                return entry.getKey(); // Retourner le nom original
            }
        }
        
        // Si pas trouvé, c'est peut-être déjà un nom original, retourner tel quel
        return renamedOrOriginal;
    }

    /**
     * Endpoint debug : lister toutes les sessions actives avec le nombre de profs/subgroups/activities
     * Utile pour diagnostiquer les problèmes de parsing
     */
    @GetMapping("/debug/sessions")
    public ResponseEntity<?> debugSessions() {
        Map<String, Object> result = new LinkedHashMap<>();
        List<Map<String, Object>> sessions = new ArrayList<>();
        
        for (Map.Entry<String, UserData> entry : userSessions.entrySet()) {
            Map<String, Object> sessionInfo = new LinkedHashMap<>();
            String sessionId = entry.getKey();
            UserData data = entry.getValue();
            
            sessionInfo.put("sessionId", sessionId);
            sessionInfo.put("teachersCount", data.teachers.size());
            sessionInfo.put("subgroupsCount", data.subgroups.size());
            sessionInfo.put("activitiesCount", data.activities.size());
            sessionInfo.put("hasData", data.hasData());
            
            sessions.add(sessionInfo);
        }
        
        result.put("activeSessions", sessions.size());
        result.put("sessions", sessions);
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam(required=false) MultipartFile teachersXml,
                                    @RequestParam(required=false) MultipartFile subgroupsXml,
                                    @RequestParam(required=false) MultipartFile activitiesXml,
                                    HttpSession session) throws Exception {
        
        // Récupérer les données de l'utilisateur
        UserData userData = getUserData(session);
        String sessionId = session.getId();
        
        System.out.println("📤 Upload pour session: " + sessionId);
        
        // Parser les fichiers XML
        if(teachersXml != null) {
            userData.teachers = TimetableParser.parseTeachers(teachersXml.getInputStream());
            System.out.println("  ✓ Professeurs parsés: " + userData.teachers.size());
        }
        if(subgroupsXml != null) {
            userData.subgroups = TimetableParser.parseSubgroups(subgroupsXml.getInputStream());
            System.out.println("  ✓ Sous-groupes parsés: " + userData.subgroups.size());
        }
        if(activitiesXml != null) {
            userData.activities = TimetableParser.parseActivities(activitiesXml.getInputStream());
            System.out.println("  ✓ Activités parsées: " + userData.activities.size());
        }
        
        // Sauvegarder les fichiers dans le dossier de session
        saveUploadedFilesForSession(sessionId, teachersXml, subgroupsXml, activitiesXml);
        
        // Build response with detected lists so frontend can display immediately
        List<String> teacherList = new ArrayList<>(userData.teachers.keySet());
        // classes (without subgroup suffix), sanitize to hide placeholder terms
        Set<String> classes = new HashSet<>();
        for (String sgKey : userData.subgroups.keySet()) {
            String base = extractClassBase(sgKey);
            String clean = sanitizeClassName(base);
            if (!clean.isBlank()) classes.add(clean);
        }
        // Sorted list
        List<String> classList = classes.stream().sorted().toList();
        // full subgroup identifiers
        List<String> subgroupList = new ArrayList<>(userData.subgroups.keySet());

        Map<String,Object> resp = new HashMap<>();
        resp.put("status","ok");
        resp.put("teachers", teacherList);
        resp.put("classes", classList);
        resp.put("subgroups", subgroupList);
        resp.put("sessionId", sessionId); // Pour info
        
        System.out.println("✅ Upload terminé pour session: " + sessionId);
        return ResponseEntity.ok(resp);
    }
    
    /**
     * Sauvegarde les fichiers XML uploadés dans le dossier de la session utilisateur
     */
    private void saveUploadedFilesForSession(String sessionId, MultipartFile teachersXml, 
                                            MultipartFile subgroupsXml, MultipartFile activitiesXml) throws IOException {
        Path sessionPath = Paths.get(DATA_DIR, SESSIONS_DIR, sessionId);
        if (!Files.exists(sessionPath)) {
            Files.createDirectories(sessionPath);
        }

        if (teachersXml != null && !teachersXml.isEmpty()) {
            Path targetPath = sessionPath.resolve(TEACHERS_FILE);
            Files.copy(teachersXml.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        }
        if (subgroupsXml != null && !subgroupsXml.isEmpty()) {
            Path targetPath = sessionPath.resolve(SUBGROUPS_FILE);
            Files.copy(subgroupsXml.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        }
        if (activitiesXml != null && !activitiesXml.isEmpty()) {
            Path targetPath = sessionPath.resolve(ACTIVITIES_FILE);
            Files.copy(activitiesXml.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    @GetMapping("/teachers")
    public Map<String, List<String>> listTeachers(HttpSession session) {
        UserData userData = getUserData(session);
        
        // Créer un Map matière -> liste de professeurs (avec noms renommés)
        Map<String, Set<String>> subjectTeachers = new TreeMap<>();
        
        // Parcourir tous les professeurs et leurs emplois du temps
        for (var teacher : userData.teachers.entrySet()) {
            String teacherName = teacher.getKey();
            String renamedTeacherName = applyTeacherMapping(teacherName, userData); // Appliquer le renommage
            
            // Parcourir l'emploi du temps pour trouver les matières enseignées
            for (var day : teacher.getValue().values()) {
                for (var hour : day.values()) {
                    Map<String, String> slot = hour;
                    if (slot != null && slot.containsKey("subject")) {
                        String subject = slot.getOrDefault("subject", "").trim();
                        if (!subject.isEmpty()) {
                            // Ajouter le professeur renommé à la liste de cette matière
                            subjectTeachers.computeIfAbsent(subject, k -> new TreeSet<>()).add(renamedTeacherName);
                        }
                    }
                }
            }
        }
        
        // Convertir les Set en List pour la réponse
        Map<String, List<String>> result = new TreeMap<>();
        for (Map.Entry<String, Set<String>> entry : subjectTeachers.entrySet()) {
            result.put(entry.getKey(), new ArrayList<>(entry.getValue()));
        }
        
        return result;
    }
    
    @GetMapping("/subgroups")
    public List<String> listSubgroups(HttpSession session){
        UserData userData = getUserData(session);
        Set<String> classes = new HashSet<>();
        for (String sgKey : userData.subgroups.keySet()) {
            String base = extractClassBase(sgKey);
            String clean = sanitizeClassName(base);
            if (!clean.isBlank()) classes.add(clean);
        }
        return classes.stream().sorted().toList();
    }

    @GetMapping("/classes/{name}/subgroups")
    public List<String> getSubgroupsForClass(@PathVariable("name") String name, HttpSession session) {
        UserData userData = getUserData(session);
        // Return full subgroup identifiers (e.g. "3APIC-5:G1") that belong to the sanitized class name
        String target = sanitizeClassName(name);
        return userData.subgroups.keySet().stream()
                .filter(sg -> {
                    String base = extractClassBase(sg);
                    return sanitizeClassName(base).equals(target) && !isAutoSubgroup(sg);
                })
                .sorted()
                .toList();
    }

    @GetMapping(value = "/timetable/teacher/{name}", produces = "application/json")
    public List<Map<String,Object>> timetableForTeacher(@PathVariable("name") String name, HttpSession session) {
        UserData userData = getUserData(session);
        // Convertir le nom renommé en nom original si nécessaire
        String originalName = findOriginalTeacherName(name, userData);
        
        List<Map<String,Object>> res = new ArrayList<>();
        var schedule = userData.teachers.getOrDefault(originalName, Collections.emptyMap());

        // Build raw list and try to attach subgroup label when possible
        for(var dayEntry: schedule.entrySet()){
            String dayRaw = dayEntry.getKey();
            String day = TimetableParser.normalizeDayName(dayRaw);
            boolean morning = dayRaw.toLowerCase().endsWith("_m");
            for(var hourEntry: dayEntry.getValue().entrySet()){
                String hour = hourEntry.getKey();
                Map<String,String> d = hourEntry.getValue();
                String timeslot = TimetableParser.mapHourToTimeslot(morning, hour);
                String subject = d.getOrDefault("subject", "");
                String students = d.getOrDefault("students", "");
                String room = d.getOrDefault("room", "");

                // Vérifier si c'est un cours avec sous-groupes coïncidents
        boolean hasCoincidentGroups = hasCoincidentGroupsForTeacherSlot(students, dayEntry.getKey(), hour, name, subject, userData);

        // N'ajouter le label du groupe que si ce n'est pas un cours avec sous-groupes coïncidents
        // et seulement si le sous-groupe n'est pas déjà explicite dans le champ students (ex: "2APIC-2:G1").
        String studentsWithLabel = students;
        if (!hasCoincidentGroups) {
            String groupLabel = findSubgroupLabelForTeacherSlot(students, dayEntry.getKey(), hour, name, subject, userData);
            // Détecter si students contient déjà un suffixe explicite ":Gx"
            String existingLabel = null;
            int colonIdx = students != null ? students.indexOf(':') : -1;
            if (colonIdx >= 0 && colonIdx + 1 < (students != null ? students.length() : 0)) {
                existingLabel = students.substring(colonIdx + 1).trim();
            }

            if (groupLabel != null && !groupLabel.isBlank()) {
                // Si le label est déjà présent après ":", ne rien ajouter pour éviter "G1 (G1)"
                if (existingLabel != null && !existingLabel.isBlank()) {
                    // si différent, on évite aussi d'ajouter pour ne pas doubler
                    studentsWithLabel = students;
                } else {
                    studentsWithLabel = students + " (" + groupLabel + ")";
                }
            }
        }

                res.add(slotEntry(day, morning ? "matin" : "soir", hour, timeslot,
                        subject, originalName, studentsWithLabel, room, userData));
            }
        }

        // Sort by day and time
        res.sort((a, b) -> {
            int dayCompare = getDayOrder((String)a.get("day")).compareTo(getDayOrder((String)b.get("day")));
            if (dayCompare != 0) return dayCompare;

            if (!Objects.equals(a.get("period"), b.get("period"))) {
                return Objects.equals(a.get("period"), "matin") ? -1 : 1;
            }

            return ((String)a.get("hourId")).compareTo((String)b.get("hourId"));
        });

        // Merge consecutive slots with same subject, same teacher and same students (labels included)
        List<Map<String,Object>> merged = new ArrayList<>();
        for (int i = 0; i < res.size(); i++) {
            Map<String,Object> cur = res.get(i);
            if (merged.isEmpty()) {
                merged.add(cur);
                continue;
            }
            Map<String,Object> last = merged.get(merged.size() - 1);
            if (canMergeTeacherSlots(last, cur)) {
                // create merged slot from last and cur
                String newHourId = mergeHourIds((String)last.get("hourId"), (String)cur.get("hourId"));
                String newTimeslot = mapHourRange((String)last.get("hourId"), (String)cur.get("hourId"), Objects.equals(last.get("period"), "matin"));
                Map<String,Object> newSlot = slotEntry(
                        (String)last.get("day"),
                        (String)last.get("period"),
                        newHourId,
                        newTimeslot,
                        (String)last.get("subject"),
                        (String)last.get("teacher"),
                        (String)last.get("subgroup"),
                        (String)last.get("room"),
                        userData
                );
                // replace last
                merged.set(merged.size() - 1, newSlot);
            } else {
                merged.add(cur);
            }
        }

        return merged;
    }

    private boolean hasCoincidentGroupsForTeacherSlot(String studentsBase, String dayRaw, String hour, String teacherName, String subject, UserData userData) {
        if (studentsBase == null || studentsBase.isBlank()) return false;

        // Chercher tous les sous-groupes candidats (G1, G2, etc.)
        List<String> candidates = new ArrayList<>();
        for (String sg : userData.subgroups.keySet()) {
            if (sg.equals(studentsBase) || sg.startsWith(studentsBase + ":")) {
                candidates.add(sg);
            }
        }
        if (candidates.size() <= 1) return false;

        // Compter combien de sous-groupes ont cours avec ce prof à ce créneau
        int groupsWithClass = 0;
        for (String sg : candidates) {
            var schedule = userData.subgroups.get(sg);
            if (schedule == null) continue;
            var dayMap = schedule.get(dayRaw);
            if (dayMap == null) continue;
            var det = dayMap.get(hour);
            if (det == null) continue;
            String sgTeacher = det.getOrDefault("teacher", "");
            String sgSubject = det.getOrDefault("subject", "");
            
            // Vérifier si c'est le même cours
            if (!sgTeacher.isBlank() && sgTeacher.equals(teacherName)) {
                groupsWithClass++;
            } else if (!sgSubject.isBlank() && !subject.isBlank()) {
                String subjLow = subject.toLowerCase();
                String sgSubjLow = sgSubject.toLowerCase();
                if (subjLow.equals(sgSubjLow) || subjLow.contains(sgSubjLow) || sgSubjLow.contains(subjLow)) {
                    groupsWithClass++;
                }
            }
        }

        // Retourner true si plusieurs sous-groupes ont cours simultanément
        return groupsWithClass > 1;
    }

    private String findSubgroupLabelForTeacherSlot(String studentsBase, String dayRaw, String hour, String teacherName, String subject, UserData userData) {
        if (studentsBase == null || studentsBase.isBlank()) return null;
        // Look for subgroup keys that equal studentsBase or start with studentsBase+":"
        List<String> candidates = new ArrayList<>();
        for (String sg : userData.subgroups.keySet()) {
            if (sg.equals(studentsBase) || sg.startsWith(studentsBase + ":")) candidates.add(sg);
        }
        if (candidates.isEmpty()) return null;

        // Check each candidate subgroup at this day/hour: if the subgroup's teacher (in subgroup XML) matches teacherName
        // OR the subject matches, we infer this subgroup is the intended one.
        for (String sg : candidates) {
            var schedule = userData.subgroups.get(sg);
            if (schedule == null) continue;
            var dayMap = schedule.get(dayRaw);
            if (dayMap == null) continue;
            var hourMap = dayMap.get(hour);
            if (hourMap == null) continue;
            String sgTeacher = hourMap.getOrDefault("teacher", "");
            String sgSubject = hourMap.getOrDefault("subject", "");
            // Normalize quick matches
            if (!sgTeacher.isBlank() && sgTeacher.equals(teacherName)) return extractGroupPart(sg);
            if (!sgSubject.isBlank() && !subject.isBlank()) {
                String subjLow = subject.toLowerCase();
                String sgSubjLow = sgSubject.toLowerCase();
                if (subjLow.equals(sgSubjLow) || subjLow.contains(sgSubjLow) || sgSubjLow.contains(subjLow)) {
                    return extractGroupPart(sg);
                }
            }
        }
        return null;
    }

    private String extractGroupPart(String subgroupId) {
        if (subgroupId == null) return null;
        int idx = subgroupId.indexOf(':');
        if (idx >= 0 && idx + 1 < subgroupId.length()) return subgroupId.substring(idx + 1);
        return null;
    }

    /**
     * Heuristic to detect automatically-created subgroup identifiers.
     * We treat subgroup IDs as automatic when the part after ':' is empty
     * or contains the word "auto" (case-insensitive) or obvious markers like "(auto)".
     */
    private boolean isAutoSubgroup(String subgroupId) {
        if (subgroupId == null) return false;
        int idx = subgroupId.indexOf(':');
        if (idx < 0) return false; // no subgroup suffix -> it's a class identifier, not an auto subgroup
        String part = subgroupId.substring(idx + 1).trim();
        if (part.isEmpty()) return true;
        String low = part.toLowerCase();
        if (low.contains("auto") || low.contains("(auto)")) return true;
        // other heuristics: sometimes autogenerated labels include "-" with digits only like "-1" or similar;
        // we avoid marking common valid labels like G1/G2 as automatic.
        return false;
    }

    // Extract the class part before any subgroup suffix like ":G1"
    private String extractClassBase(String subgroupKey){
        if (subgroupKey == null) return "";
        int idx = subgroupKey.indexOf(':');
        return idx > 0 ? subgroupKey.substring(0, idx) : subgroupKey;
    }

    // Remove placeholder phrases like "مجموعات فرعية تلقائية" from class names
    private String sanitizeClassName(String name){
        if (name == null) return "";
        String n = name;
        String[] tokens = new String[]{
                "مجموعات فرعية تلقائية",
                "مجموعة فرعية تلقائية",
                "sous-groupes automatiques",
                "sous groupe automatique",
                "automatic subgroups",
                "automatic subgroup",
                "auto subgroups",
                "auto subgroup"
        };
        for (String t : tokens){
            n = n.replace(t, "");
        }
        // collapse extra whitespace and trim
        n = n.replaceAll("\\s{2,}", " ").trim();
        return n;
    }

    // Detect known automatic placeholder class names to hide from lists
    private boolean isAutoPlaceholderClassName(String name) {
        if (name == null) return true;
        String n = name.trim();
        if (n.isEmpty()) return true;
        // Arabic common label seen in FET exports
        if (n.equalsIgnoreCase("مجموعات فرعية تلقائية")) return true;
        // Potential translations to be safe
        String low = n.toLowerCase();
        if (low.equals("automatic subgroups")) return true;
        if (low.equals("sous-groupes automatiques")) return true;
        return false;
    }

    private boolean canMergeTeacherSlots(Map<String,Object> a, Map<String,Object> b) {
        // same day, same period, consecutive hours, same subject, same teacher, same subgroup and same room
        if (!Objects.equals(a.get("day"), b.get("day"))) return false;
        if (!Objects.equals(a.get("period"), b.get("period"))) return false;
        if (!Objects.equals(a.get("subject"), b.get("subject"))) return false;
        if (!Objects.equals(a.get("teacher"), b.get("teacher"))) return false;
        if (!Objects.equals(a.get("subgroup"), b.get("subgroup"))) return false;
        if (!Objects.equals(a.get("room"), b.get("room"))) return false;
        return areHoursConsecutive((String)a.get("hourId"), (String)b.get("hourId"));
    }

    private boolean areHoursConsecutive(String h1, String h2) {
        // expect format H1..H4 or merged like H1-H2
        int end1 = parseHourEnd(h1);
        int start2 = parseHourStart(h2);
        return end1 >= 0 && start2 >= 0 && end1 + 1 == start2;
    }

    private int parseHourStart(String hourId) {
        // H1 or H1-H2 -> return numeric start
        if (hourId == null) return -1;
        String[] parts = hourId.split("-", 2);
        try {
            if (parts[0].startsWith("H")) return Integer.parseInt(parts[0].substring(1));
        } catch (Exception e) { }
        return -1;
    }

    private int parseHourEnd(String hourId) {
        // H1 or H1-H2 -> return numeric end
        if (hourId == null) return -1;
        String[] parts = hourId.split("-", 2);
        try {
            if (parts.length == 2 && parts[1].startsWith("H")) return Integer.parseInt(parts[1].substring(1));
            if (parts[0].startsWith("H")) return Integer.parseInt(parts[0].substring(1));
        } catch (Exception e) { }
        return -1;
    }

    private String mergeHourIds(String h1, String h2) {
        int start = parseHourStart(h1);
        int end = parseHourEnd(h2);
        if (start > 0 && end > 0) return "H" + start + "-H" + end;
        return h1 + "," + h2;
    }

    private String mapHourRange(String hStart, String hEnd, boolean morning) {
        String t1 = TimetableParser.mapHourToTimeslot(morning, hStart);
        String t2 = TimetableParser.mapHourToTimeslot(morning, hEnd);
        // t1 = "08:30 - 09:30" ; t2 = "09:30 - 10:30"
        String start = t1.split(" - ")[0];
        String end = t2.split(" - ")[1];
        return start + " - " + end;
    }

    @GetMapping(value = "/timetable/subgroup/{name}", produces = "application/json")
    public List<Map<String,Object>> timetableForSubgroup(
        @PathVariable("name") String name,
        @RequestParam(value = "labelMode", defaultValue = "diff") String labelMode,
        @RequestParam(value = "labelSubjects", required = false) String labelSubjects,
        HttpSession session
    ) {
        UserData userData = getUserData(session);
        List<Map<String,Object>> res = new ArrayList<>();

        // Find all subgroups that match the (sanitized) class name (exclude automatic subgroups)
        String target = sanitizeClassName(name);
        List<String> matchingSubgroups = userData.subgroups.keySet().stream()
            .filter(sg -> {
                String base = extractClassBase(sg);
                return sanitizeClassName(base).equals(target) && !isAutoSubgroup(sg);
            })
            .toList();

        // Aggregate entries by (dayRaw, hour) -> subgroup -> details
        // key format: dayRaw::hour
        Map<String, Map<String, Map<String, String>>> aggregated = new HashMap<>();

        for (String subgroup : matchingSubgroups) {
            var schedule = userData.subgroups.get(subgroup);
            if (schedule == null) continue;
            for (var dayEntry : schedule.entrySet()) {
                String dayRaw = dayEntry.getKey();
                for (var hourEntry : dayEntry.getValue().entrySet()) {
                    String hour = hourEntry.getKey();
                    Map<String, String> details = hourEntry.getValue();
                    String key = dayRaw + "::" + hour;
                    aggregated.putIfAbsent(key, new LinkedHashMap<>());
                    // store under subgroup key (full subgroup name)
                    aggregated.get(key).put(subgroup, details);
                }
            }
        }

        // Ensure each aggregated timeslot key has an entry for every matching subgroup.
        // If a subgroup has no entry at that timeslot, insert an empty details map so
        // it will be considered "different" from subgroups that do have a session.
        for (String key : new ArrayList<>(aggregated.keySet())) {
            Map<String, Map<String, String>> per = aggregated.get(key);
            for (String sg : matchingSubgroups) {
                per.putIfAbsent(sg, new HashMap<>());
            }
        }

        // Build SlotDto list from aggregated data
        for (var entry : aggregated.entrySet()) {
            String key = entry.getKey();
            String[] parts = key.split("::", 2);
            String dayRaw = parts[0];
            String hour = parts[1];
            String day = TimetableParser.normalizeDayName(dayRaw);
            boolean morning = dayRaw.toLowerCase().endsWith("_m");
            String timeslot = TimetableParser.mapHourToTimeslot(morning, hour);

            Map<String, Map<String, String>> perGroup = entry.getValue();

            // Build a set of distinct detail signatures to detect sameness.
            // Consider sessions identical if subject and teacher match (case-insensitive, trimmed).
            Set<String> signatures = new HashSet<>();
            for (Map<String, String> det : perGroup.values()) {
                String subj = det.getOrDefault("subject", "").trim().toLowerCase();
                String teach = det.getOrDefault("teacher", "").trim().toLowerCase();
                String sig = subj + "|" + teach;
                signatures.add(sig);
            }

            // Prepare label subject set (case-insensitive, partial match)
            List<String> labelListLower = new ArrayList<>();
            if (labelSubjects != null && !labelSubjects.isBlank()) {
                for (String s : labelSubjects.split(",")) {
                    String trimmed = s.trim();
                    if (!trimmed.isEmpty()) labelListLower.add(trimmed.toLowerCase());
                }
            }

            if (signatures.size() == 1) {
                // All groups share the same session. By default emit a single combined slot,
                // but if labelMode=always OR the subject is listed in labelSubjects, emit per-subgroup labeled slots.
                Map<String, String> any = perGroup.values().iterator().next();
                String subjectCommon = any.getOrDefault("subject", "");

                boolean forceLabel = "always".equalsIgnoreCase(labelMode);
                if (!forceLabel && !labelListLower.isEmpty()) {
                    String subjLow = subjectCommon.toLowerCase();
                    for (String lbl : labelListLower) {
                        // partial, case-insensitive match: if the label is contained in subject or vice-versa
                        if (subjLow.contains(lbl) || lbl.contains(subjLow)) { forceLabel = true; break; }
                    }
                }

                if (!forceLabel) {
                    String teacher = any.getOrDefault("teacher", "");
                    String room = any.getOrDefault("room", "");
            res.add(slotEntry(day, morning ? "matin" : "soir", hour, timeslot,
                subjectCommon, teacher, name, room, userData));
                } else {
                    // Emit one entry per subgroup with group label appended
                    for (var sgEntry : perGroup.entrySet()) {
                        String subgroup = sgEntry.getKey();
                        Map<String, String> det = sgEntry.getValue();
                        String subject = det.getOrDefault("subject", "");
                        String teacher = det.getOrDefault("teacher", "");
                        String room = det.getOrDefault("room", "");
                        // If subgroup has no session (no subject and no teacher and no room), emit empty fields
                        boolean emptySession = (subject == null || subject.isBlank())
                                && (teacher == null || teacher.isBlank())
                                && (room == null || room.isBlank());

                        if (!emptySession) {
                            // Class view: append subgroup label (G1/G2) to subject to indicate subgroup session
                            String label = extractGroupPart(subgroup);
                            if (label != null && !label.isBlank()) {
                                subject = subject + " (" + label + ")";
                            }
                        } else {
                            // keep subject/teacher/room empty and do not append group label
                            subject = "";
                            teacher = "";
                            room = "";
                        }

                        // Use the actual subgroup identifier in the SlotDto.subgroup field so the UI
                        // can show which subgroup (e.g. "3APIC-5:G1"). Do not use the path variable 'name' here.
                        res.add(slotEntry(day, morning ? "matin" : "soir", hour, timeslot,
                                subject, teacher, subgroup, room, userData));
                    }
                }
            } else {
                // Different sessions across groups -> emit one entry per subgroup and append group label to subject
                for (var sgEntry : perGroup.entrySet()) {
                    String subgroup = sgEntry.getKey();
                    Map<String, String> det = sgEntry.getValue();
                    String subject = det.getOrDefault("subject", "");
                    String teacher = det.getOrDefault("teacher", "");
                    String room = det.getOrDefault("room", "");

                    boolean emptySession = (subject == null || subject.isBlank())
                            && (teacher == null || teacher.isBlank())
                            && (room == null || room.isBlank());

                        if (!emptySession) {
                            // Append subgroup label to subject for clarity in class timetable
                            String label = extractGroupPart(subgroup);
                            if (label != null && !label.isBlank()) {
                                subject = subject + " (" + label + ")";
                            }
                        } else {
                            // keep fields empty and do not append a label
                            subject = "";
                            teacher = "";
                            room = "";
                        }

                        // Use subgroup identifier, not the class name
                        res.add(slotEntry(day, morning ? "matin" : "soir", hour, timeslot,
                                subject, teacher, subgroup, room, userData));
                }
            }
        }

        // Sort by day and time
        res.sort((a, b) -> {
            int dayCompare = getDayOrder((String)a.get("day")).compareTo(getDayOrder((String)b.get("day")));
            if (dayCompare != 0) return dayCompare;

            if (!Objects.equals(a.get("period"), b.get("period"))) {
                return Objects.equals(a.get("period"), "matin") ? -1 : 1;
            }

            return ((String)a.get("hourId")).compareTo((String)b.get("hourId"));
        });

        return res;
    }

    @GetMapping(value = "/rooms/vacant", produces = "application/json")
    public List<Map<String,Object>> listVacantRooms(HttpSession session) {
        UserData userData = getUserData(session);
        // Collect all rooms seen anywhere (from both subgroups and teachers)
        Set<String> allRooms = new TreeSet<>();
        // From subgroups file
        for (var sgSchedule : userData.subgroups.values()) {
            for (var dayEntry : sgSchedule.entrySet()) {
                for (var hourEntry : dayEntry.getValue().entrySet()) {
                    Map<String, String> det = hourEntry.getValue();
                    String room = det.getOrDefault("room", "").trim();
                    if (!room.isEmpty()) allRooms.add(room);
                }
            }
        }
        // From teachers file
        for (var tSchedule : userData.teachers.values()) {
            for (var dayEntry : tSchedule.entrySet()) {
                for (var hourEntry : dayEntry.getValue().entrySet()) {
                    Map<String, String> det = hourEntry.getValue();
                    String room = det.getOrDefault("room", "").trim();
                    if (!room.isEmpty()) allRooms.add(room);
                }
            }
        }
        // From activities file
        for (var a : userData.activities) {
            String room = (a.room == null ? "" : a.room.trim());
            if (!room.isEmpty()) allRooms.add(room);
        }
        
        // Aggregate used rooms per (dayRaw,hour) from both datasets
        Map<String, Set<String>> used = new HashMap<>(); // key dayRaw::hour -> rooms
        // From subgroups
        for (var sgSchedule : userData.subgroups.entrySet()) {
            for (var dayEntry : sgSchedule.getValue().entrySet()) {
                String dayRaw = dayEntry.getKey();
                for (var hourEntry : dayEntry.getValue().entrySet()) {
                    String hour = hourEntry.getKey();
                    Map<String, String> det = hourEntry.getValue();
                    String room = det.getOrDefault("room", "").trim();
                    if (room.isEmpty()) continue;
                    String key = dayRaw + "::" + hour;
                    used.computeIfAbsent(key, k -> new HashSet<>()).add(room);
                }
            }
        }
        // From teachers
        for (var tSchedule : userData.teachers.entrySet()) {
            for (var dayEntry : tSchedule.getValue().entrySet()) {
                String dayRaw = dayEntry.getKey();
                for (var hourEntry : dayEntry.getValue().entrySet()) {
                    String hour = hourEntry.getKey();
                    Map<String, String> det = hourEntry.getValue();
                    String room = det.getOrDefault("room", "").trim();
                    if (room.isEmpty()) continue;
                    String key = dayRaw + "::" + hour;
                    used.computeIfAbsent(key, k -> new HashSet<>()).add(room);
                }
            }
        }
        // From activities
        for (var a : userData.activities) {
            String room = (a.room == null ? "" : a.room.trim());
            if (room.isEmpty()) continue;
            String key = a.dayRaw + "::" + a.hour;
            used.computeIfAbsent(key, k -> new HashSet<>()).add(room);
        }

        // Build SlotDto entries with vacant rooms for each key
    List<Map<String,Object>> res = new ArrayList<>();
        for (var entry : used.entrySet()) {
            String key = entry.getKey();
            String[] parts = key.split("::", 2);
            String dayRaw = parts[0];
            String hour = parts[1];
            String day = TimetableParser.normalizeDayName(dayRaw);
            boolean morning = dayRaw.toLowerCase().endsWith("_m");
            String timeslot = TimetableParser.mapHourToTimeslot(morning, hour);

            Set<String> usedRooms = entry.getValue();
            for (String room : allRooms) {
                if (!usedRooms.contains(room)) {
                    // subject empty to keep neutral color; teacher empty; subgroup carries the room name (renamed)
                    String renamedRoom = applyRoomMapping(room, userData);
                    res.add(slotEntry(day, morning ? "matin" : "soir", hour, timeslot,
                        "", "", renamedRoom, "", userData));
                }
            }
        }

        // Sort for stable output
        res.sort((a, b) -> {
            int dayCompare = getDayOrder((String)a.get("day")).compareTo(getDayOrder((String)b.get("day")));
            if (dayCompare != 0) return dayCompare;
            if (!Objects.equals(a.get("period"), b.get("period"))) return Objects.equals(a.get("period"), "matin") ? -1 : 1;
            int hourCmp = ((String)a.get("hourId")).compareTo((String)b.get("hourId"));
            if (hourCmp != 0) return hourCmp;
            return ((String)a.get("subgroup")).compareToIgnoreCase((String)b.get("subgroup")); // here subgroup field holds the room name
        });
        return res;
    }

    @GetMapping(value = "/rooms/vacant/diagnostics", produces = "application/json")
    public Map<String,Object> vacantDiagnostics(HttpSession session) {
        UserData userData = getUserData(session);
        Map<String,Object> out = new LinkedHashMap<>();
        // collect rooms from all datasets
        Set<String> allRooms = new TreeSet<>();
        for (var sgSchedule : userData.subgroups.values()) {
            for (var dayEntry : sgSchedule.entrySet()) {
                for (var hourEntry : dayEntry.getValue().entrySet()) {
                    String room = hourEntry.getValue().getOrDefault("room", "").trim();
                    if (!room.isEmpty()) allRooms.add(room);
                }
            }
        }
        for (var tSchedule : userData.teachers.values()) {
            for (var dayEntry : tSchedule.entrySet()) {
                for (var hourEntry : dayEntry.getValue().entrySet()) {
                    String room = hourEntry.getValue().getOrDefault("room", "").trim();
                    if (!room.isEmpty()) allRooms.add(room);
                }
            }
        }
        for (var a : userData.activities) {
            String room = (a.room == null ? "" : a.room.trim());
            if (!room.isEmpty()) allRooms.add(room);
        }

        Map<String, Set<String>> used = new HashMap<>();
        for (var sgSchedule : userData.subgroups.entrySet()) {
            for (var dayEntry : sgSchedule.getValue().entrySet()) {
                String dayRaw = dayEntry.getKey();
                for (var hourEntry : dayEntry.getValue().entrySet()) {
                    String hour = hourEntry.getKey();
                    String room = hourEntry.getValue().getOrDefault("room", "").trim();
                    if (room.isEmpty()) continue;
                    used.computeIfAbsent(dayRaw+"::"+hour, k->new HashSet<>()).add(room);
                }
            }
        }
        for (var tSchedule : userData.teachers.entrySet()) {
            for (var dayEntry : tSchedule.getValue().entrySet()) {
                String dayRaw = dayEntry.getKey();
                for (var hourEntry : dayEntry.getValue().entrySet()) {
                    String hour = hourEntry.getKey();
                    String room = hourEntry.getValue().getOrDefault("room", "").trim();
                    if (room.isEmpty()) continue;
                    used.computeIfAbsent(dayRaw+"::"+hour, k->new HashSet<>()).add(room);
                }
            }
        }
        for (var a : userData.activities) {
            String room = (a.room == null ? "" : a.room.trim());
            if (room.isEmpty()) continue;
            used.computeIfAbsent(a.dayRaw+"::"+a.hour, k->new HashSet<>()).add(room);
        }

        out.put("teachersCount", userData.teachers.size());
        out.put("subgroupsCount", userData.subgroups.size());
        out.put("activitiesCount", userData.activities.size());
        out.put("allRoomsCount", allRooms.size());
        out.put("usedKeysCount", used.size());

        List<Map<String,Object>> samples = new ArrayList<>();
        int i = 0;
        for (var e : used.entrySet()) {
            if (i++ >= 5) break;
            Map<String,Object> s = new LinkedHashMap<>();
            s.put("key", e.getKey());
            s.put("usedRoomsCount", e.getValue().size());
            s.put("usedRooms", new TreeSet<>(e.getValue()));
            samples.add(s);
        }
        out.put("usedSamples", samples);
        return out;
    }

    /**
     * Liste toutes les salles disponibles (avec renommage appliqué)
     */
    @GetMapping(value = "/rooms/list", produces = "application/json")
    public List<String> listRooms(HttpSession session) {
        UserData userData = getUserData(session);
        Set<String> allRoomsOriginal = new TreeSet<>();
        // Collecter toutes les salles depuis subgroups
        for (var sgSchedule : userData.subgroups.values()) {
            for (var dayEntry : sgSchedule.entrySet()) {
                for (var hourEntry : dayEntry.getValue().entrySet()) {
                    String room = hourEntry.getValue().getOrDefault("room", "").trim();
                    if (!room.isEmpty()) allRoomsOriginal.add(room);
                }
            }
        }
        // Collecter depuis teachers
        for (var tSchedule : userData.teachers.values()) {
            for (var dayEntry : tSchedule.entrySet()) {
                for (var hourEntry : dayEntry.getValue().entrySet()) {
                    String room = hourEntry.getValue().getOrDefault("room", "").trim();
                    if (!room.isEmpty()) allRoomsOriginal.add(room);
                }
            }
        }
        // Collecter depuis activities
        for (var a : userData.activities) {
            String room = (a.room == null ? "" : a.room.trim());
            if (!room.isEmpty()) allRoomsOriginal.add(room);
        }
        
        // Appliquer le renommage et retourner la liste triée
        Set<String> renamedRooms = new TreeSet<>();
        for (String originalRoom : allRoomsOriginal) {
            String renamedRoom = applyRoomMapping(originalRoom, userData);
            renamedRooms.add(renamedRoom);
        }
        return new ArrayList<>(renamedRooms);
    }

    /**
     * Récupère l'emploi du temps d'une salle spécifique
     */
    @GetMapping(value = "/timetable/room/{name}", produces = "application/json")
    public List<Map<String,Object>> timetableForRoom(@PathVariable("name") String roomName, HttpSession session) {
        UserData userData = getUserData(session);
        // Trouver le nom original de la salle (si c'est un nom renommé)
        String originalRoomName = findOriginalRoomName(roomName, userData);
        
        // Utiliser une Map pour agréger et dédupliquer les créneaux
        // Clé: dayRaw::hour::subject::teacher::classBase
        Map<String, Map<String,Object>> aggregated = new LinkedHashMap<>();
        
        // Chercher dans tous les emplois du temps (subgroups) les créneaux utilisant cette salle
        for (var sgEntry : userData.subgroups.entrySet()) {
            String subgroupId = sgEntry.getKey();
            String classBase = extractClassBase(subgroupId);
            // Nettoyer le nom de la classe (supprimer les marqueurs automatiques)
            String cleanedClass = sanitizeClassName(classBase);
            
            // Ignorer les classes vides après nettoyage (qui ne contenaient que des marqueurs)
            if (cleanedClass.isEmpty()) continue;
            
            for (var dayEntry : sgEntry.getValue().entrySet()) {
                String dayRaw = dayEntry.getKey();
                String day = TimetableParser.normalizeDayName(dayRaw);
                boolean morning = dayRaw.toLowerCase().endsWith("_m");
                
                for (var hourEntry : dayEntry.getValue().entrySet()) {
                    String hour = hourEntry.getKey();
                    Map<String, String> det = hourEntry.getValue();
                    String room = det.getOrDefault("room", "").trim();
                    
                    // Vérifier si c'est la salle recherchée (comparer avec le nom original)
                    if (room.equalsIgnoreCase(originalRoomName)) {
                        String timeslot = TimetableParser.mapHourToTimeslot(morning, hour);
                        String subject = det.getOrDefault("subject", "");
                        String teacher = det.getOrDefault("teacher", "");
                        
                        // Créer une clé unique pour ce créneau (déduplication)
                        String key = dayRaw + "::" + hour + "::" + subject + "::" + teacher + "::" + cleanedClass;
                        
                        // Si la clé n'existe pas encore, ajouter l'entrée
                        // Note: slotEntry() appliquera automatiquement le renommage via applyRoomMapping()
                        if (!aggregated.containsKey(key)) {
                            aggregated.put(key, slotEntry(day, morning ? "matin" : "soir", hour, timeslot,
                                    subject, teacher, cleanedClass, room, userData));
                        }
                    }
                }
            }
        }
        
        // Convertir en liste
        List<Map<String,Object>> res = new ArrayList<>(aggregated.values());
        
        // Trier par jour et heure
        res.sort((a, b) -> {
            int dayCompare = getDayOrder((String)a.get("day")).compareTo(getDayOrder((String)b.get("day")));
            if (dayCompare != 0) return dayCompare;

            if (!Objects.equals(a.get("period"), b.get("period"))) {
                return Objects.equals(a.get("period"), "matin") ? -1 : 1;
            }

            return ((String)a.get("hourId")).compareTo((String)b.get("hourId"));
        });
        
        // Fusionner les créneaux consécutifs identiques
        List<Map<String,Object>> merged = new ArrayList<>();
        for (int i = 0; i < res.size(); i++) {
            Map<String,Object> cur = res.get(i);
            if (merged.isEmpty()) {
                merged.add(cur);
                continue;
            }
            Map<String,Object> last = merged.get(merged.size() - 1);
            if (canMergeRoomSlots(last, cur)) {
                // Fusionner les créneaux
                String newHourId = mergeHourIds((String)last.get("hourId"), (String)cur.get("hourId"));
                String newTimeslot = mapHourRange((String)last.get("hourId"), (String)cur.get("hourId"), 
                                                  Objects.equals(last.get("period"), "matin"));
                Map<String,Object> newSlot = slotEntry(
                        (String)last.get("day"),
                        (String)last.get("period"),
                        newHourId,
                        newTimeslot,
                        (String)last.get("subject"),
                        (String)last.get("teacher"),
                        (String)last.get("subgroup"),
                        (String)last.get("room"),
                        userData
                );
                merged.set(merged.size() - 1, newSlot);
            } else {
                merged.add(cur);
            }
        }
        
        return merged;
    }
    
    private boolean canMergeRoomSlots(Map<String,Object> a, Map<String,Object> b) {
        // Mêmes critères que pour les profs: même jour, période, matière, prof, classe
        if (!Objects.equals(a.get("day"), b.get("day"))) return false;
        if (!Objects.equals(a.get("period"), b.get("period"))) return false;
        if (!Objects.equals(a.get("subject"), b.get("subject"))) return false;
        if (!Objects.equals(a.get("teacher"), b.get("teacher"))) return false;
        if (!Objects.equals(a.get("subgroup"), b.get("subgroup"))) return false;
        if (!Objects.equals(a.get("room"), b.get("room"))) return false;
        return areHoursConsecutive((String)a.get("hourId"), (String)b.get("hourId"));
    }
    
    // ==================== ENDPOINTS DE RENOMMAGE ====================
    
    /**
     * Récupère tous les noms de professeurs originaux (pour l'interface de configuration)
     */
    @GetMapping("/rename/teachers/list")
    public ResponseEntity<?> listTeachersForRename(HttpSession session) {
        UserData userData = getUserData(session);
        List<Map<String, String>> result = new ArrayList<>();
        for (String original : userData.teachers.keySet()) {
            Map<String, String> item = new HashMap<>();
            item.put("original", original);
            item.put("renamed", userData.teacherMappings.getOrDefault(original, ""));
            result.add(item);
        }
        result.sort((a, b) -> a.get("original").compareToIgnoreCase(b.get("original")));
        return ResponseEntity.ok(result);
    }
    
    /**
     * Récupère tous les noms de salles originaux (pour l'interface de configuration)
     */
    @GetMapping("/rename/rooms/list")
    public ResponseEntity<?> listRoomsForRename(HttpSession session) {
        UserData userData = getUserData(session);
        Set<String> allRooms = new TreeSet<>();
        // Collecter toutes les salles
        for (var sgSchedule : userData.subgroups.values()) {
            for (var dayEntry : sgSchedule.entrySet()) {
                for (var hourEntry : dayEntry.getValue().entrySet()) {
                    String room = hourEntry.getValue().getOrDefault("room", "").trim();
                    if (!room.isEmpty()) allRooms.add(room);
                }
            }
        }
        for (var tSchedule : userData.teachers.values()) {
            for (var dayEntry : tSchedule.entrySet()) {
                for (var hourEntry : dayEntry.getValue().entrySet()) {
                    String room = hourEntry.getValue().getOrDefault("room", "").trim();
                    if (!room.isEmpty()) allRooms.add(room);
                }
            }
        }
        for (var a : userData.activities) {
            String room = (a.room == null ? "" : a.room.trim());
            if (!room.isEmpty()) allRooms.add(room);
        }
        
        List<Map<String, String>> result = new ArrayList<>();
        for (String original : allRooms) {
            Map<String, String> item = new HashMap<>();
            item.put("original", original);
            item.put("renamed", userData.roomMappings.getOrDefault(original, ""));
            result.add(item);
        }
        return ResponseEntity.ok(result);
    }
    
    /**
     * Définir un renommage pour un professeur
     */
    @PostMapping("/rename/teacher")
    public ResponseEntity<?> renameTeacher(@RequestBody Map<String, String> request, HttpSession session) {
        UserData userData = getUserData(session);
        String sessionId = session.getId();
        try {
            String original = request.get("original");
            String renamed = request.get("renamed");
            
            if (original == null || original.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Le nom original est requis"));
            }
            
            if (renamed == null || renamed.trim().isEmpty()) {
                // Supprimer le mapping
                userData.teacherMappings.remove(original);
            } else {
                // Ajouter/modifier le mapping
                userData.teacherMappings.put(original, renamed);
            }
            
            saveMappings(sessionId, userData);
            return ResponseEntity.ok(Map.of("status", "ok", "message", "Renommage enregistré"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Définir un renommage pour une salle
     */
    @PostMapping("/rename/room")
    public ResponseEntity<?> renameRoom(@RequestBody Map<String, String> request, HttpSession session) {
        UserData userData = getUserData(session);
        String sessionId = session.getId();
        try {
            String original = request.get("original");
            String renamed = request.get("renamed");
            
            if (original == null || original.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Le nom original est requis"));
            }
            
            if (renamed == null || renamed.trim().isEmpty()) {
                // Supprimer le mapping
                userData.roomMappings.remove(original);
            } else {
                // Ajouter/modifier le mapping
                userData.roomMappings.put(original, renamed);
            }
            
            saveMappings(sessionId, userData);
            return ResponseEntity.ok(Map.of("status", "ok", "message", "Renommage enregistré"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Récupérer tous les mappings
     */
    @GetMapping("/rename/mappings")
    public ResponseEntity<?> getMappings(HttpSession session) {
        UserData userData = getUserData(session);
        Map<String, Object> result = new HashMap<>();
        result.put("teachers", userData.teacherMappings);
        result.put("rooms", userData.roomMappings);
        return ResponseEntity.ok(result);
    }

    private Map<String,Object> slotEntry(String day, String period, String hourId, String timeslot,
                                         String subject, String teacher, String subgroup, String room, UserData userData) {
        Map<String,Object> m = new HashMap<>();
        m.put("day", day);
        m.put("period", period);
        m.put("hourId", hourId);
        m.put("timeslot", timeslot);
        m.put("subject", subject);
        m.put("teacher", applyTeacherMapping(teacher, userData));  // Appliquer le renommage
        m.put("subgroup", subgroup);
        m.put("room", applyRoomMapping(room, userData));  // Appliquer le renommage
        return m;
    }
    
    private Integer getDayOrder(String day) {
        return switch (day) {
            case "Lundi" -> 1;
            case "Mardi" -> 2;
            case "Mercredi" -> 3;
            case "Jeudi" -> 4;
            case "Vendredi" -> 5;
            case "Samedi" -> 6;
            default -> 7;
        };
    }
}
