package com.example.timetable.dto;
public record SlotDto(
    String day,
    String period,
    String hourId,
    String timeslot,
    String subject,
    String teacher,
    String subgroup,
    String room
) {}
