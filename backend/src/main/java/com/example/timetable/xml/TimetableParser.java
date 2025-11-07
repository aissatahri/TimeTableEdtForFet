package com.example.timetable.xml;

import org.w3c.dom.*;
import javax.xml.parsers.*;
import java.io.InputStream;
import java.util.*;

public class TimetableParser {
    public static class ActivitySlot {
        public final String dayRaw;
        public final String hour;
        public final String room;
        public ActivitySlot(String dayRaw, String hour, String room) {
            this.dayRaw = dayRaw;
            this.hour = hour;
            this.room = room;
        }
    }

    public static Map<String, Map<String, Map<String, Map<String,String>>>> parseSubgroups(InputStream xmlStream) throws Exception {
        Map<String, Map<String, Map<String, Map<String,String>>>> out = new HashMap<>();
        DocumentBuilder db = DocumentBuilderFactory.newInstance().newDocumentBuilder();
        Document doc = db.parse(xmlStream);
        NodeList subgroups = doc.getElementsByTagName("Subgroup");
        for (int i=0; i<subgroups.getLength(); i++) {
            Element s = (Element) subgroups.item(i);
            String name = s.getAttribute("name");
            Map<String, Map<String, Map<String,String>>> schedule = new HashMap<>();
            NodeList days = s.getElementsByTagName("Day");
            for(int d=0; d<days.getLength(); d++) {
                Element day = (Element) days.item(d);
                String dayName = day.getAttribute("name");
                schedule.putIfAbsent(dayName, new HashMap<>());
                NodeList hours = day.getElementsByTagName("Hour");
                for(int h=0; h<hours.getLength(); h++) {
                    Element hour = (Element) hours.item(h);
                    String hourName = hour.getAttribute("name");
                    NodeList activities = hour.getElementsByTagName("Activity");
                    if (activities.getLength() > 0) {
                        Map<String,String> details = new HashMap<>();
                        details.put("teacher", attrOfChild(hour, "Teacher"));
                        details.put("subject", attrOfChild(hour, "Subject"));
                        details.put("room", attrOfChild(hour, "Room"));
                        schedule.get(dayName).put(hourName, details);
                    }
                }
            }
            out.put(name, schedule);
        }
        return out;
    }

    public static String mapHourToTimeslot(boolean morning, String hour) {
        if(morning) {
            return switch(hour) {
                case "H1" -> "08:30 - 09:30";
                case "H2" -> "09:30 - 10:30";
                case "H3" -> "10:30 - 11:30";
                case "H4" -> "11:30 - 12:30";
                default -> hour;
            };
        } else {
            return switch(hour) {
                case "H1" -> "14:30 - 15:30";
                case "H2" -> "15:30 - 16:30";
                case "H3" -> "16:30 - 17:30";
                case "H4" -> "17:30 - 18:30";
                default -> hour;
            };
        }
    }

    public static String normalizeDayName(String dayRaw) {
        String low = dayRaw.toLowerCase();
        if(low.startsWith("lundi")) return "Lundi";
        if(low.startsWith("mardi")) return "Mardi";
        if(low.startsWith("mercredi")) return "Mercredi";
        if(low.startsWith("jeudi")) return "Jeudi";
        if(low.startsWith("vendredi")) return "Vendredi";
        if(low.startsWith("samedi")) return "Samedi";
        return dayRaw;
    }

    public static Map<String, Map<String, Map<String, Map<String,String>>>> parseTeachers(InputStream xmlStream) throws Exception {
        Map<String, Map<String, Map<String, Map<String,String>>>> out = new HashMap<>();
        DocumentBuilder db = DocumentBuilderFactory.newInstance().newDocumentBuilder();
        Document doc = db.parse(xmlStream);
        NodeList teachers = doc.getElementsByTagName("Teacher");
        System.out.println("[parseTeachers] Found " + teachers.getLength() + " <Teacher> elements");
        for (int i=0;i<teachers.getLength();i++){
            Element t = (Element) teachers.item(i);
            String name = t.getAttribute("name");
            if(name==null || name.isEmpty()) name = t.getAttribute("id");
            System.out.println("  [parseTeachers] Processing teacher: " + name);
            Map<String, Map<String, Map<String,String>>> schedule = new HashMap<>();
            NodeList days = t.getElementsByTagName("Day");
            System.out.println("    [parseTeachers] Found " + days.getLength() + " <Day> elements for this teacher");
            for(int d=0; d<days.getLength(); d++){
                Element day = (Element) days.item(d);
                String dayName = day.getAttribute("name");
                schedule.putIfAbsent(dayName, new HashMap<>());
                NodeList hours = day.getElementsByTagName("Hour");
                System.out.println("      [parseTeachers] Found " + hours.getLength() + " <Hour> elements for day: " + dayName);
                for(int h=0; h<hours.getLength(); h++){
                    Element hour = (Element) hours.item(h);
                    String hourName = hour.getAttribute("name");
                    String subject = attrOfChild(hour, "Subject");
                    String students = attrOfChild(hour, "Students");
                    String room = attrOfChild(hour, "Room");
                    Map<String,String> details = new HashMap<>();
                    details.put("subject", subject);
                    details.put("students", students);
                    details.put("room", room);
                    schedule.get(dayName).put(hourName, details);
                }
            }
            out.put(name, schedule);
            System.out.println("  [parseTeachers] Finished processing teacher: " + name + " (total slots: " + schedule.values().stream().mapToLong(Map::size).sum() + ")");
        }
        System.out.println("[parseTeachers] TOTAL: " + out.size() + " teachers parsed");
        return out;
    }

    public static List<ActivitySlot> parseActivities(InputStream xmlStream) throws Exception {
        List<ActivitySlot> out = new ArrayList<>();
        DocumentBuilder db = DocumentBuilderFactory.newInstance().newDocumentBuilder();
        Document doc = db.parse(xmlStream);
        NodeList nodes = doc.getElementsByTagName("Activity");
        for (int i = 0; i < nodes.getLength(); i++) {
            Element a = (Element) nodes.item(i);
            String day = textOfChild(a, "Day");
            String hour = textOfChild(a, "Hour");
            String room = textOfChild(a, "Room");
            if (hour == null || hour.isBlank()) continue;
            if (day == null || day.isBlank()) continue;
            if (room == null) room = "";
            out.add(new ActivitySlot(day, hour, room));
        }
        return out;
    }

    private static String textOfChild(Element parent, String tag) {
        NodeList l = parent.getElementsByTagName(tag);
        if (l.getLength() == 0) return "";
        Node n = l.item(0);
        return n.getTextContent();
    }

    private static String attrOfChild(Element parent, String tag){
        NodeList l = parent.getElementsByTagName(tag);
        if(l.getLength()==0) return "";
        Element e = (Element) l.item(0);
        return e.getAttribute("name");
    }
}
