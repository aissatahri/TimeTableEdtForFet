package com.example.timetable.service;

import com.itextpdf.io.font.FontProgram;
import com.itextpdf.io.font.FontProgramFactory;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;

import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
// import com.itextpdf.licensekey.LicenseKey; // Pas nécessaire pour version Community
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.util.List;
import java.util.Map;

@Service
public class PdfGeneratorService {

    private static final String[] DAYS = {"Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"};
    private static final String[] TIMESLOTS = {
        "08:30 - 09:30", "09:30 - 10:30", "10:30 - 11:30", "11:30 - 12:30",
        "14:30 - 15:30", "15:30 - 16:30", "16:30 - 17:30", "17:30 - 18:30"
    };

    private PdfFont arabicFont;
    private PdfFont regularFont;
    private PdfFont boldFont;

    public PdfGeneratorService() {
        try {
            // Charger les polices avec support arabe
            loadFonts();
        } catch (Exception e) {
            System.err.println("⚠ Erreur chargement polices: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void loadFonts() throws Exception {
        // Pour l'arabe, nous devons utiliser IDENTITY_H et forcer l'embedding
        String[] arabicFontPaths = {
            "c:/windows/fonts/tahoma.ttf",
            "c:/windows/fonts/arial.ttf", 
            "c:/windows/fonts/calibri.ttf",
            "c:/windows/fonts/segoeui.ttf",
            "c:/windows/fonts/times.ttf"
        };

        arabicFont = null;
        for (String fontPath : arabicFontPaths) {
            try {
                File fontFile = new File(fontPath);
                if (fontFile.exists()) {
                    // CRITIQUE : Utiliser "Identity-H" et forcer l'embedding pour l'arabe
                    arabicFont = PdfFontFactory.createFont(fontPath, 
                        "Identity-H", 
                        PdfFontFactory.EmbeddingStrategy.FORCE_EMBEDDED);
                    System.out.println("✓ Police arabe chargée avec IDENTITY_H: " + fontPath);
                    break;
                }
            } catch (Exception e) {
                System.out.println("⚠ Échec chargement police: " + fontPath + " (" + e.getMessage() + ")");
            }
        }

        // Si aucune police système n'a fonctionné, essayer une approche alternative
        if (arabicFont == null) {
            try {
                // Utiliser une police standard avec encodage Unicode
                arabicFont = PdfFontFactory.createFont(StandardFonts.HELVETICA, "Identity-H");
                System.out.println("⚠ Utilisation de Helvetica avec IDENTITY_H");
            } catch (Exception e) {
                // Dernier recours - sans Unicode (l'arabe ne fonctionnera pas)
                arabicFont = PdfFontFactory.createFont(StandardFonts.HELVETICA);
                System.out.println("❌ Police de base - l'arabe ne s'affichera pas");
            }
        }

        // IMPORTANT : Utiliser la même police pour tout pour assurer le rendu arabe
        regularFont = arabicFont;
        boldFont = arabicFont;
    }

    public byte[] generateTimetablePdf(String title, List<Map<String, Object>> timetableData, String type) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            
            // Format paysage A4
            pdfDoc.setDefaultPageSize(PageSize.A4.rotate());
            
            Document document = new Document(pdfDoc);
            document.setMargins(20, 20, 20, 20);

            // En-tête officiel
            addOfficialHeader(document, title, type);

            // Créer le tableau principal
            Table mainTable = createTimetableTable(timetableData);
            document.add(mainTable);

            // Pied de page si nécessaire
            if ("teacher".equals(type)) {
                addTeacherFooter(document, timetableData);
            }

            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            System.err.println("⚠ Erreur génération PDF: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    private void addOfficialHeader(Document document, String title, String type) throws Exception {
        // Logo et en-tête officiel
        Paragraph header = new Paragraph()
            .add("المملكة المغربية\n")
            .add("وزارة التربية الوطنية والتعليم الأولي والرياضة\n")
            .add("الأكاديمية الجهوية للتربية والتكوين\n")
            .add("مديرية الفقيه بن صالح\n")
            .add("المؤسسة التعليمية\n")
            .setFont(arabicFont)
            .setFontSize(12)
            .setTextAlignment(TextAlignment.CENTER)
            .setBold();

        document.add(header);

        // Titre principal
        String titleText = "teacher".equals(type) ? 
            "جدول الحصص - الأستاذ(ة): " + title :
            "جدول الحصص - القسم: " + title;

        Paragraph titlePara = new Paragraph(titleText)
            .setFont(arabicFont)
            .setFontSize(16)
            .setTextAlignment(TextAlignment.CENTER)
            .setBold()
            .setMarginBottom(20);

        document.add(titlePara);
    }

    private Table createTimetableTable(List<Map<String, Object>> timetableData) throws Exception {
        // Créer tableau : 1 colonne pour l'heure + 6 colonnes pour les jours
        Table table = new Table(UnitValue.createPercentArray(new float[]{15, 14, 14, 14, 14, 14, 15}));
        table.setWidth(UnitValue.createPercentValue(100));

        // En-tête du tableau
        addTableHeader(table);

        // Organiser les données par créneau horaire
        Map<String, Map<String, String>> schedule = organizeByTimeslot(timetableData);

        // Trier les créneaux horaires pour un affichage cohérent
        java.util.List<String> sortedTimeslots = new java.util.ArrayList<>(schedule.keySet());
        sortedTimeslots.sort((t1, t2) -> {
            // Extraire l'heure de début pour le tri
            try {
                String time1 = t1.split(" - ")[0].replace(":", "");
                String time2 = t2.split(" - ")[0].replace(":", "");
                return time1.compareTo(time2);
            } catch (Exception e) {
                return t1.compareTo(t2);
            }
        });

        // Ajouter les lignes pour chaque créneau
        for (String timeslot : sortedTimeslots) {
            addTimeslotRow(table, timeslot, schedule.get(timeslot));
        }

        return table;
    }

    private void addTableHeader(Table table) throws Exception {
        // Cellule vide pour l'intersection
        Cell timeHeader = new Cell()
            .add(new Paragraph("الوقت / الأيام").setFont(arabicFont).setFontSize(10))
            .setTextAlignment(TextAlignment.CENTER)
            .setVerticalAlignment(VerticalAlignment.MIDDLE)
            .setBackgroundColor(ColorConstants.LIGHT_GRAY)
            .setBold();
        table.addHeaderCell(timeHeader);

        // En-têtes des jours en arabe
        String[] arabicDays = {"الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"};
        for (String day : arabicDays) {
            Cell dayHeader = new Cell()
                .add(new Paragraph(day).setFont(arabicFont).setFontSize(10))
                .setTextAlignment(TextAlignment.CENTER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setBackgroundColor(ColorConstants.LIGHT_GRAY)
                .setBold();
            table.addHeaderCell(dayHeader);
        }
    }

    private Map<String, Map<String, String>> organizeByTimeslot(List<Map<String, Object>> timetableData) {
        Map<String, Map<String, String>> schedule = new java.util.HashMap<>();
        
        // Collecter tous les créneaux uniques des données réelles
        java.util.Set<String> allTimeslots = new java.util.HashSet<>();
        for (Map<String, Object> slot : timetableData) {
            String timeslot = (String) slot.get("timeslot");
            if (timeslot != null && !timeslot.trim().isEmpty()) {
                allTimeslots.add(timeslot.trim());
            }
        }
        
        // Ajouter les créneaux prédéfinis s'ils ne sont pas déjà présents
        for (String timeslot : TIMESLOTS) {
            allTimeslots.add(timeslot);
        }
        
        // Initialiser toutes les cases vides pour tous les créneaux
        for (String timeslot : allTimeslots) {
            schedule.put(timeslot, new java.util.HashMap<>());
            for (String day : DAYS) {
                schedule.get(timeslot).put(day, "");
            }
        }

        // Remplir avec les données réelles
        for (Map<String, Object> slot : timetableData) {
            String timeslot = (String) slot.get("timeslot");
            String day = (String) slot.get("day");
            String subject = (String) slot.get("subject");
            String teacher = (String) slot.get("teacher");
            String subgroup = (String) slot.get("subgroup");
            String room = (String) slot.get("room");

            if (timeslot != null && day != null && !timeslot.trim().isEmpty() && !day.trim().isEmpty()) {
                // S'assurer que le créneau existe dans le schedule
                if (!schedule.containsKey(timeslot.trim())) {
                    schedule.put(timeslot.trim(), new java.util.HashMap<>());
                    for (String d : DAYS) {
                        schedule.get(timeslot.trim()).put(d, "");
                    }
                }
                
                StringBuilder content = new StringBuilder();
                if (subject != null && !subject.trim().isEmpty()) {
                    content.append(subject.trim()).append("\n");
                }
                if (teacher != null && !teacher.trim().isEmpty()) {
                    content.append("الأستاذ: ").append(teacher.trim()).append("\n");
                }
                if (subgroup != null && !subgroup.trim().isEmpty()) {
                    content.append("القسم: ").append(subgroup.trim()).append("\n");
                }
                if (room != null && !room.trim().isEmpty()) {
                    content.append("القاعة: ").append(room.trim());
                }

                schedule.get(timeslot.trim()).put(day.trim(), content.toString().trim());
            }
        }

        return schedule;
    }

    private void addTimeslotRow(Table table, String timeslot, Map<String, String> dayData) throws Exception {
        // Cellule de l'heure
        Cell timeCell = new Cell()
            .add(new Paragraph(timeslot).setFont(regularFont).setFontSize(9))
            .setTextAlignment(TextAlignment.CENTER)
            .setVerticalAlignment(VerticalAlignment.MIDDLE)
            .setBackgroundColor(ColorConstants.LIGHT_GRAY);
        table.addCell(timeCell);

        // Cellules pour chaque jour
        for (String day : DAYS) {
            String content = dayData != null ? dayData.getOrDefault(day, "") : "";
            
            Cell dayCell = new Cell()
                .setTextAlignment(TextAlignment.CENTER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setMinHeight(40);

            if (!content.isEmpty()) {
                Paragraph para = new Paragraph(content)
                    .setFont(arabicFont)
                    .setFontSize(8)
                    .setTextAlignment(TextAlignment.CENTER);
                dayCell.add(para);
            }

            table.addCell(dayCell);
        }
    }

    private void addTeacherFooter(Document document, List<Map<String, Object>> timetableData) throws Exception {
        // Extraire les classes enseignées
        java.util.Set<String> classes = new java.util.LinkedHashSet<>();
        for (Map<String, Object> slot : timetableData) {
            String subgroup = (String) slot.get("subgroup");
            if (subgroup != null && !subgroup.trim().isEmpty()) {
                classes.add(subgroup.trim());
            }
        }

        if (!classes.isEmpty()) {
            Paragraph classesPara = new Paragraph("\nالأقسام المدرسة: " + String.join(", ", classes))
                .setFont(arabicFont)
                .setFontSize(10)
                .setMarginTop(20);
            document.add(classesPara);
        }

        // Signature
        Paragraph signature = new Paragraph("\n\nتوقيع الإدارة: ___________________")
            .setFont(arabicFont)
            .setFontSize(10)
            .setTextAlignment(TextAlignment.RIGHT)
            .setMarginTop(20);
        document.add(signature);
    }

    public byte[] generateVacantRoomsPdf(List<Map<String, Object>> vacantData) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            pdfDoc.setDefaultPageSize(PageSize.A4.rotate());
            
            Document document = new Document(pdfDoc);
            document.setMargins(20, 20, 20, 20);

            // En-tête
            Paragraph header = new Paragraph("القاعات الفارغة - جدول التوقيتات")
                .setFont(arabicFont)
                .setFontSize(16)
                .setTextAlignment(TextAlignment.CENTER)
                .setBold()
                .setMarginBottom(20);
            document.add(header);

            // Organiser les données par créneau
            Map<String, java.util.Set<String>> vacantBySlot = new java.util.HashMap<>();
            for (Map<String, Object> slot : vacantData) {
                String timeslot = (String) slot.get("timeslot");
                String day = (String) slot.get("day");
                String room = (String) slot.get("subgroup"); // Le nom de la salle est dans subgroup
                
                if (timeslot != null && day != null && room != null) {
                    String key = day + " - " + timeslot;
                    vacantBySlot.computeIfAbsent(key, k -> new java.util.LinkedHashSet<>()).add(room);
                }
            }

            // Créer le tableau des salles vacantes
            Table vacantTable = new Table(UnitValue.createPercentArray(new float[]{30, 70}));
            vacantTable.setWidth(UnitValue.createPercentValue(100));

            // En-têtes
            vacantTable.addHeaderCell(new Cell().add(new Paragraph("اليوم والوقت").setFont(arabicFont).setFontSize(10)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setBold());
            vacantTable.addHeaderCell(new Cell().add(new Paragraph("القاعات الفارغة").setFont(arabicFont).setFontSize(10)).setBackgroundColor(ColorConstants.LIGHT_GRAY).setBold());

            // Ajouter les données
            for (Map.Entry<String, java.util.Set<String>> entry : vacantBySlot.entrySet()) {
                vacantTable.addCell(new Cell().add(new Paragraph(entry.getKey()).setFont(arabicFont).setFontSize(9)));
                vacantTable.addCell(new Cell().add(new Paragraph(String.join(", ", entry.getValue())).setFont(arabicFont).setFontSize(9)));
            }

            document.add(vacantTable);
            document.close();
            
            return baos.toByteArray();
        } catch (Exception e) {
            System.err.println("⚠ Erreur génération PDF salles vacantes: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }
}