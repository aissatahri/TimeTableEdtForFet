package com.example.timetable.controller;

import com.example.timetable.service.PdfGeneratorService;
import com.example.timetable.xml.TimetableParser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.*;

@RestController
@RequestMapping("/api/pdf")
@CrossOrigin(origins = "http://localhost:4200")
public class PdfController {

    @Autowired
    private PdfGeneratorService pdfGeneratorService;

    @Autowired
    private TimetableController timetableController;

    /**
     * Générer PDF pour un professeur
     */
    @GetMapping("/teacher/{name}")
    public ResponseEntity<Resource> generateTeacherPdf(@PathVariable("name") String name, HttpSession session) {
        try {
            // Récupérer les données d'emploi du temps
            List<Map<String, Object>> timetableData = timetableController.timetableForTeacher(name, session);
            
            if (timetableData == null || timetableData.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            // Générer le PDF
            byte[] pdfBytes = pdfGeneratorService.generateTimetablePdf(name, timetableData, "teacher");
            
            if (pdfBytes == null) {
                return ResponseEntity.internalServerError().build();
            }

            ByteArrayResource resource = new ByteArrayResource(pdfBytes);
            
            // Utiliser un nom de fichier simple sans caractères arabes pour éviter les erreurs HTTP
            String safeFilename = "emploi-temps-professeur-" + System.currentTimeMillis() + ".pdf";
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + safeFilename + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(pdfBytes.length)
                    .body(resource);

        } catch (Exception e) {
            System.err.println("⚠ Erreur génération PDF professeur: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Générer PDF pour une classe
     */
    @GetMapping("/subgroup/{name}")
    public ResponseEntity<Resource> generateSubgroupPdf(
            @PathVariable("name") String name,
            @RequestParam(value = "labelMode", defaultValue = "diff") String labelMode,
            @RequestParam(value = "labelSubjects", required = false) String labelSubjects,
            HttpSession session) {
        try {
            // Récupérer les données d'emploi du temps
            List<Map<String, Object>> timetableData = timetableController.timetableForSubgroup(name, labelMode, labelSubjects, session);
            
            if (timetableData == null || timetableData.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            // Générer le PDF
            byte[] pdfBytes = pdfGeneratorService.generateTimetablePdf(name, timetableData, "subgroup");
            
            if (pdfBytes == null) {
                return ResponseEntity.internalServerError().build();
            }

            ByteArrayResource resource = new ByteArrayResource(pdfBytes);
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"emploi-temps-classe-" + System.currentTimeMillis() + ".pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(pdfBytes.length)
                    .body(resource);

        } catch (Exception e) {
            System.err.println("⚠ Erreur génération PDF classe: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Générer PDF des salles vacantes
     */
    @GetMapping("/vacant-rooms")
    public ResponseEntity<Resource> generateVacantRoomsPdf(HttpSession session) {
        try {
            // Récupérer les données des salles vacantes
            List<Map<String, Object>> vacantData = timetableController.listVacantRooms(session);
            
            if (vacantData == null || vacantData.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            // Générer le PDF
            byte[] pdfBytes = pdfGeneratorService.generateVacantRoomsPdf(vacantData);
            
            if (pdfBytes == null) {
                return ResponseEntity.internalServerError().build();
            }

            ByteArrayResource resource = new ByteArrayResource(pdfBytes);
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"salles-vacantes.pdf\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(pdfBytes.length)
                    .body(resource);

        } catch (Exception e) {
            System.err.println("⚠ Erreur génération PDF salles vacantes: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Générer PDF pour tous les professeurs (en lot)
     */
    @GetMapping("/all-teachers")
    public ResponseEntity<Resource> generateAllTeachersPdf(HttpSession session) {
        try {
            // Récupérer la liste des professeurs
            Map<String, List<String>> teachersBySubject = timetableController.listTeachers(session);
            List<String> allTeachers = new ArrayList<>();
            teachersBySubject.values().forEach(allTeachers::addAll);
            
            if (allTeachers.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            // TODO: Implémenter génération PDF multiple
            // Pour l'instant, retourner une erreur
            return ResponseEntity.status(501).build(); // Not Implemented

        } catch (Exception e) {
            System.err.println("⚠ Erreur génération PDF tous professeurs: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Générer PDF pour toutes les classes (en lot)
     */
    @GetMapping("/all-subgroups")
    public ResponseEntity<Resource> generateAllSubgroupsPdf(HttpSession session) {
        try {
            // Récupérer la liste des classes
            List<String> allSubgroups = timetableController.listSubgroups(session);
            
            if (allSubgroups.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            // TODO: Implémenter génération PDF multiple
            // Pour l'instant, retourner une erreur
            return ResponseEntity.status(501).build(); // Not Implemented

        } catch (Exception e) {
            System.err.println("⚠ Erreur génération PDF toutes classes: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}
