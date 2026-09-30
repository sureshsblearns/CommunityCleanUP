package com.communitycleanup.config;

import com.communitycleanup.entity.*;
import com.communitycleanup.repository.*;
import com.communitycleanup.service.ReportWorkflowService;
import com.communitycleanup.service.RewardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Creates the administrator account (always, if none exists) and — when {@code app.seed.demo-data} is true and
 * the database has no other users — a realistic demo dataset so every dashboard is populated on first start.
 * All people and contact details are fictional; demo emails use the reserved example.com domain.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    public static final String DEMO_PASSWORD = "Demo@123";
    private static final String IMG = "https://images.unsplash.com/photo-%s?w=1200&q=80&auto=format&fit=crop";

    private final AppProperties properties;
    private final UserRepository userRepository;
    private final ReportRepository reportRepository;
    private final EventRepository eventRepository;
    private final EventParticipantRepository participantRepository;
    private final PhotoRepository photoRepository;
    private final FeedbackRepository feedbackRepository;
    private final GalleryItemRepository galleryRepository;
    private final ReportWorkflowService workflow;
    private final RewardService rewardService;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbc;

    private final List<Runnable> backdates = new ArrayList<>();

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        User admin = ensureAdmin();
        if (properties.seed().demoData() && userRepository.count() == 1) {
            seedDemo(admin);
            // Flush pending inserts so the timestamp back-dating below (plain JDBC) sees every row.
            reportRepository.flush();
            backdates.forEach(Runnable::run);
            log.info("Demo data seeded. Demo accounts use the password '{}'.", DEMO_PASSWORD);
        }
    }

    private User ensureAdmin() {
        return userRepository.findAll().stream().filter(u -> u.getRole() == Role.ADMIN).findFirst()
                .orElseGet(() -> {
                    User admin = userRepository.save(User.builder()
                            .name("Portal Administrator")
                            .email(properties.seed().adminEmail().toLowerCase(Locale.ROOT))
                            .phone("+910000000000")
                            .password(passwordEncoder.encode(properties.seed().adminPassword()))
                            .role(Role.ADMIN)
                            .build());
                    log.info("Seeded administrator account {}", admin.getEmail());
                    return admin;
                });
    }

    private void seedDemo(User admin) {
        LocalDate today = LocalDate.now();

        User greenEarth = user("Kavya Menon", "ngo@example.com", Role.NGO, "Green Earth Foundation", 150);
        User cleanCity = user("Farhan Ali", "cleancity@example.com", Role.NGO, "Clean City Collective", 120);
        User arjun = user("Arjun Kumar", "volunteer@example.com", Role.VOLUNTEER, null, 140);
        User meera = user("Meera Iyer", "meera@example.com", Role.VOLUNTEER, null, 135);
        User rahul = user("Rahul Verma", "rahul@example.com", Role.VOLUNTEER, null, 110);
        User sneha = user("Sneha Pillai", "sneha@example.com", Role.VOLUNTEER, null, 95);
        User vikram = user("Vikram Rao", "vikram@example.com", Role.VOLUNTEER, null, 60);
        User anita = user("Anita Sharma", "resident@example.com", Role.RESIDENT, null, 160);
        User ravi = user("Ravi Shankar", "ravi@example.com", Role.RESIDENT, null, 100);

        // ---- Reports across the full lifecycle ----
        Report beach = report(anita, "Plastic waste piling up near the beach walkway",
                "Large amounts of plastic bottles, wrappers and fishing nets have washed up along the northern end of the beach walkway. It gets worse after every high tide.",
                WasteType.PLASTIC, Urgency.HIGH, "Beach walkway, north end near lighthouse", 13.0418, 80.2824, 118, "1530587191325-3db32d826c18");
        Report park = report(ravi, "Overflowing bins at the community park entrance",
                "The two bins at the main gate of the community park have been overflowing for a week. Stray animals are scattering the waste across the jogging track.",
                WasteType.GENERAL_WASTE, Urgency.MEDIUM, "Community Park main gate, Anna Nagar", 13.0850, 80.2101, 95, "1605600659908-0ef719419d41");
        Report market = report(anita, "Cardboard and packaging dumped behind the market",
                "Shops are dumping flattened cardboard boxes and plastic packaging in the lane behind the vegetable market. The lane is now blocked for pedestrians.",
                WasteType.MIXED_WASTE, Urgency.MEDIUM, "Service lane behind T. Nagar vegetable market", 13.0418, 80.2341, 70, "1567393528677-d6adae7d4a0a");
        Report riverbank = report(ravi, "Bottles and bags along the river bank",
                "The stretch of river bank near the footbridge is covered in plastic bottles and carry bags. Birds nest here, so this needs attention soon.",
                WasteType.PLASTIC, Urgency.HIGH, "Adyar river bank near Kotturpuram footbridge", 13.0180, 80.2420, 40, "1595278069441-2cf29f8005a4");
        Report busStop = report(anita, "Litter around the bus stop shelter",
                "Food packets and paper cups are thrown around the bus shelter every evening. There is no dustbin nearby.",
                WasteType.FOOD_WASTE, Urgency.LOW, "Bus stop opposite city library, Egmore", 13.0732, 80.2609, 25, "1528190336454-13cd56b45b5a");
        Report lake = report(ravi, "Floating plastic in the lake inlet",
                "Plastic bags and bottles are collecting at the inlet channel of the lake and blocking water flow.",
                WasteType.PLASTIC, Urgency.CRITICAL, "Lake inlet channel, Velachery", 12.9791, 80.2185, 18, "1621451537084-482c73073a0f");
        Report schoolRoad = report(anita, "Construction debris on the school road",
                "Broken bricks and cement bags were left on the footpath outside the primary school after roadwork.",
                WasteType.CONSTRUCTION_WASTE, Urgency.HIGH, "School Road footpath, Mylapore", 13.0339, 80.2676, 12, "1528323273322-d81458248d40");
        Report eWaste = report(ravi, "Old electronics dumped near apartment block",
                "Someone dumped old monitors, cables and a broken printer next to the apartment compound wall.",
                WasteType.E_WASTE, Urgency.MEDIUM, "Compound wall, Lotus Apartments, Adyar", 13.0012, 80.2565, 6, "1571727153934-b9e0059b7ab2");
        Report vacantPlot = report(anita, "Garden waste burning risk at vacant plot",
                "Dry leaves and branches have been piled on the vacant plot and residents fear someone will set them on fire.",
                WasteType.ORGANIC_WASTE, Urgency.MEDIUM, "Vacant plot on 4th Cross Street, Besant Nagar", 12.9990, 80.2668, 3, "1416879595882-3373a0480b5b");
        Report duplicate = report(ravi, "Dirty area near park gate",
                "Waste near the park gate again, same as another report.",
                WasteType.OTHER, Urgency.LOW, "Community Park main gate, Anna Nagar", 13.0851, 80.2102, 30, "1605600659908-0ef719419d41");
        Report playground = report(anita, "Broken glass and wrappers at the playground",
                "Glass bottles have been smashed near the children's slide and snack wrappers are everywhere.",
                WasteType.GENERAL_WASTE, Urgency.HIGH, "Children's playground, Shenoy Nagar", 13.0790, 80.2270, 1, "1530587191325-3db32d826c18");

        // Moderation
        for (Report r : List.of(beach, park, market, riverbank, busStop, lake, schoolRoad)) {
            workflow.transition(r, ReportStatus.VERIFIED, admin, "Verified — location and photos confirmed.");
        }
        workflow.transition(duplicate, ReportStatus.REJECTED, admin,
                "Duplicate of an existing report for the same location.");

        // ---- Events ----
        Event beachEvent = event(greenEarth, beach, "Beach Walkway Plastic Sweep",
                "Join us to clear plastic from the northern beach walkway. Gloves, grabbers and sacks will be provided. Collected plastic will be handed over to an authorised recycler.",
                today.minusDays(100), LocalTime.of(7, 0), LocalTime.of(10, 0), 20, EventStatus.COMPLETED);
        Event parkEvent = event(cleanCity, park, "Community Park Gate Clean-Up",
                "A morning drive to clear the park entrance and install two new segregated bins with the resident welfare association.",
                today.minusDays(75), LocalTime.of(8, 0), LocalTime.of(11, 0), 15, EventStatus.COMPLETED);
        Event marketEvent = event(greenEarth, market, "Market Lane Cardboard Drive",
                "We will clear the service lane behind the market and sort cardboard for recycling. Shop owners have agreed to join.",
                today.minusDays(45), LocalTime.of(16, 0), LocalTime.of(19, 0), 12, EventStatus.COMPLETED);
        Event riverEvent = event(greenEarth, riverbank, "Riverbank Restoration Morning",
                "Cleaning the river bank near the footbridge. Please wear closed shoes — the ground can be muddy.",
                today, LocalTime.of(7, 30), LocalTime.of(11, 0), 25, EventStatus.IN_PROGRESS);
        Event busEvent = event(cleanCity, busStop, "Bus Shelter Spruce-Up",
                "Quick evening clean-up of the bus shelter followed by installing a new litter bin with the ward office.",
                today.plusDays(5), LocalTime.of(17, 0), LocalTime.of(19, 0), 10, EventStatus.OPEN);
        Event lakeEvent = event(greenEarth, lake, "Lake Inlet Rescue",
                "Removing floating plastic from the lake inlet. Volunteers will work from the bank only; no swimming.",
                today.plusDays(9), LocalTime.of(7, 0), LocalTime.of(10, 30), 3, EventStatus.FULL);
        Event neighbourhood = event(cleanCity, null, "Neighbourhood Clean Sunday",
                "A general neighbourhood walk-and-clean across three streets. Great for first-time volunteers and families.",
                today.plusDays(14), LocalTime.of(8, 0), LocalTime.of(10, 0), 30, EventStatus.OPEN);
        Event awareness = event(greenEarth, null, "Waste Segregation Awareness Walk",
                "Door-to-door awareness walk explaining wet/dry waste segregation. Registration opens soon.",
                today.plusDays(25), LocalTime.of(9, 0), LocalTime.of(12, 0), 20, EventStatus.UPCOMING);
        Event cancelled = event(cleanCity, null, "Railway Underpass Clean-Up",
                "Cancelled due to heavy rain warning. We will reschedule soon.",
                today.plusDays(3), LocalTime.of(7, 0), LocalTime.of(9, 0), 15, EventStatus.CANCELLED);

        schedule(beach, beachEvent);
        schedule(park, parkEvent);
        schedule(market, marketEvent);
        schedule(riverbank, riverEvent);
        schedule(busStop, busEvent);
        schedule(lake, lakeEvent);
        workflow.transition(riverbank, ReportStatus.IN_PROGRESS, greenEarth, "Cleanup started: " + riverEvent.getTitle());

        // ---- Participation ----
        register(beachEvent, 108, List.of(arjun, meera, rahul, sneha, vikram, anita), List.of(arjun, meera, rahul, sneha, anita));
        register(parkEvent, 82, List.of(arjun, meera, rahul, ravi), List.of(arjun, meera, rahul, ravi));
        register(marketEvent, 55, List.of(arjun, meera, sneha, vikram), List.of(arjun, meera, sneha));
        register(riverEvent, 20, List.of(arjun, meera, rahul, sneha), List.of(arjun, rahul));
        register(busEvent, 4, List.of(arjun, sneha, anita), List.of());
        register(lakeEvent, 3, List.of(meera, rahul, vikram), List.of());
        register(neighbourhood, 2, List.of(arjun, ravi), List.of());

        // Complete past events: award points, badges and certificates via the real reward rules.
        for (Event e : List.of(beachEvent, parkEvent, marketEvent)) {
            participantRepository.findByEventIdOrderByRegistrationDateAsc(e.getId()).stream()
                    .filter(EventParticipant::isAttendance)
                    .forEach(rewardService::rewardAttendance);
        }
        workflow.transition(beach, ReportStatus.IN_PROGRESS, greenEarth, "Cleanup started: " + beachEvent.getTitle());
        workflow.transition(beach, ReportStatus.COMPLETED, greenEarth, "Cleanup completed: 42 bags of plastic collected.");
        workflow.transition(park, ReportStatus.IN_PROGRESS, cleanCity, "Cleanup started: " + parkEvent.getTitle());
        workflow.transition(park, ReportStatus.COMPLETED, cleanCity, "Cleanup completed and new bins installed.");
        workflow.transition(market, ReportStatus.IN_PROGRESS, greenEarth, "Cleanup started: " + marketEvent.getTitle());
        workflow.transition(market, ReportStatus.COMPLETED, greenEarth, "Lane cleared; cardboard sent for recycling.");

        // ---- Before/after photos, gallery and feedback ----
        eventPhotos(beachEvent, greenEarth, "1530587191325-3db32d826c18", "1507525428034-b723cf961d3e", "1618477461853-cf6ed80faba5");
        eventPhotos(parkEvent, cleanCity, "1605600659908-0ef719419d41", "1519331379826-f10be5486c6f", null);
        eventPhotos(marketEvent, greenEarth, "1567393528677-d6adae7d4a0a", "1532996122724-e3c354a0b15b", null);
        eventPhotos(riverEvent, greenEarth, "1595278069441-2cf29f8005a4", null, null);

        gallery(beachEvent, greenEarth, "Beach walkway restored",
                "Volunteers removed 42 bags of plastic and discarded nets from the beach walkway in three hours.",
                "1530587191325-3db32d826c18", "1507525428034-b723cf961d3e", true);
        gallery(parkEvent, cleanCity, "Park entrance cleaned and bins installed",
                "The overflowing entrance was cleared and two segregated bins were installed with the residents' association.",
                "1605600659908-0ef719419d41", "1611284446314-60a58ac0deb9", true);
        gallery(marketEvent, greenEarth, "Market lane cleared for pedestrians",
                "Shop owners and volunteers cleared the lane together; all cardboard went to a local recycler.",
                "1567393528677-d6adae7d4a0a", "1542739674-b449a8938b59", true);
        gallery(null, cleanCity, "Garden corner revived (awaiting review)",
                "Submitted by Clean City Collective for admin approval.",
                "1528190336454-13cd56b45b5a", "1585320806297-9794b3e4eeae", false);

        feedback(beachEvent, arjun, 5, "Very well organised and the team explained safety rules clearly.");
        feedback(beachEvent, meera, 5, "Loved the energy! Would be great to have more water stations.");
        feedback(beachEvent, sneha, 4, "Good event, started a little late.");
        feedback(parkEvent, rahul, 4, "Happy to see the new bins installed on the same day.");
        feedback(marketEvent, arjun, 5, "Shop owners joining made a big difference.");

        log.info("Seeded {} users, {} reports and {} events", userRepository.count(), reportRepository.count(),
                eventRepository.count());
    }

    // ------------------------------------------------------------------ builders

    private User user(String name, String email, Role role, String organization, int daysAgo) {
        User user = userRepository.save(User.builder()
                .name(name)
                .email(email)
                .phone("+9190000" + String.format("%05d", Math.abs(email.hashCode()) % 100000))
                .password(passwordEncoder.encode(DEMO_PASSWORD))
                .role(role)
                .organizationName(organization)
                .build());
        backdate("users", "created_at", "user_id", user.getId(), daysAgo);
        return user;
    }

    private Report report(User reporter, String title, String description, WasteType type, Urgency urgency,
                          String location, double lat, double lng, int daysAgo, String photoId) {
        Report report = reportRepository.save(Report.builder()
                .user(reporter)
                .title(title)
                .description(description)
                .wasteType(type)
                .urgency(urgency)
                .location(location)
                .latitude(BigDecimal.valueOf(lat))
                .longitude(BigDecimal.valueOf(lng))
                .status(ReportStatus.PENDING)
                .build());
        workflow.recordInitial(report, reporter);
        Photo photo = Photo.builder().photoUrl(IMG.formatted(photoId)).photoType(PhotoType.REPORT)
                .uploadedBy(reporter).build();
        report.addPhoto(photo);
        photoRepository.save(photo);
        backdate("reports", "created_date", "report_id", report.getId(), daysAgo);
        backdates.add(() -> {
            Instant base = daysAgoInstant(daysAgo);
            List<Long> ids = jdbc.queryForList(
                    "select history_id from report_status_history where report_id = ? order by history_id", Long.class,
                    report.getId());
            for (int i = 0; i < ids.size(); i++) {
                Instant when = base.plus(Duration.ofHours(i * Math.max(2L, daysAgo * 4L / Math.max(1, ids.size()))));
                if (when.isAfter(Instant.now())) {
                    when = Instant.now().minusSeconds((ids.size() - i) * 600L);
                }
                jdbc.update("update report_status_history set changed_at = ? where history_id = ?",
                        Timestamp.from(when), ids.get(i));
            }
            jdbc.update("update photos set uploaded_date = ? where report_id = ?", Timestamp.from(base), report.getId());
        });
        return report;
    }

    private Event event(User organizer, Report related, String title, String description, LocalDate date,
                        LocalTime start, LocalTime end, int capacity, EventStatus status) {
        String location = related != null ? related.getLocation() : "Ward office, Anna Salai";
        BigDecimal lat = related != null ? related.getLatitude() : BigDecimal.valueOf(13.0604);
        BigDecimal lng = related != null ? related.getLongitude() : BigDecimal.valueOf(80.2496);
        Event event = eventRepository.save(Event.builder()
                .createdBy(organizer)
                .relatedReport(related)
                .title(title)
                .description(description)
                .eventDate(date)
                .startTime(start)
                .endTime(end)
                .location(location)
                .latitude(lat)
                .longitude(lng)
                .volunteersRequired(capacity)
                .status(status)
                .build());
        long daysAgo = Math.max(1, LocalDate.now().toEpochDay() - date.toEpochDay() + 14);
        backdate("events", "created_at", "event_id", event.getId(), (int) daysAgo);
        return event;
    }

    private void schedule(Report report, Event event) {
        workflow.transition(report, ReportStatus.CLEANING_SCHEDULED, event.getCreatedBy(),
                "Cleanup event scheduled: " + event.getTitle());
    }

    private void register(Event event, int daysAgo, List<User> registered, List<User> attended) {
        int offset = 0;
        for (User u : registered) {
            EventParticipant p = participantRepository.save(EventParticipant.builder()
                    .event(event).user(u).attendance(attended.contains(u)).build());
            event.getParticipants().add(p);
            int days = Math.max(1, daysAgo - offset++);
            backdates.add(() -> jdbc.update("update event_participants set registration_date = ? where participant_id = ?",
                    Timestamp.from(daysAgoInstant(days)), p.getId()));
        }
        if (event.getStatus() == EventStatus.COMPLETED) {
            Instant completedAt = event.getEventDate().atTime(event.getEndTime()).toInstant(ZoneOffset.UTC);
            backdates.add(() -> {
                jdbc.update("update reward_transactions set created_at = ? where event_id = ?", Timestamp.from(completedAt), event.getId());
                jdbc.update("update certificates set issued_at = ? where event_id = ?", Timestamp.from(completedAt), event.getId());
                jdbc.update("""
                        update badges set awarded_date = ? where awarded_date > ? and user_id in
                          (select user_id from event_participants where event_id = ? and attendance = true)
                        """, Timestamp.from(completedAt), Timestamp.from(completedAt), event.getId());
            });
        }
    }

    private void eventPhotos(Event event, User uploader, String before, String after, String activity) {
        photoRepository.save(Photo.builder().event(event).photoUrl(IMG.formatted(before)).photoType(PhotoType.BEFORE)
                .uploadedBy(uploader).build());
        if (activity != null) {
            photoRepository.save(Photo.builder().event(event).photoUrl(IMG.formatted(activity))
                    .photoType(PhotoType.AFTER).uploadedBy(uploader).build());
        }
        if (after != null) {
            photoRepository.save(Photo.builder().event(event).photoUrl(IMG.formatted(after)).photoType(PhotoType.AFTER)
                    .uploadedBy(uploader).build());
        }
    }

    private void gallery(Event event, User creator, String title, String description, String before, String after,
                         boolean approved) {
        galleryRepository.save(GalleryItem.builder()
                .event(event)
                .title(title)
                .description(description)
                .location(event != null ? event.getLocation() : "Besant Nagar")
                .completionDate(event != null ? event.getEventDate() : LocalDate.now().minusDays(2))
                .beforeImageUrl(IMG.formatted(before))
                .afterImageUrl(IMG.formatted(after))
                .approved(approved)
                .createdBy(creator)
                .build());
    }

    private void feedback(Event event, User user, int rating, String comments) {
        feedbackRepository.save(Feedback.builder().event(event).user(user).rating(rating).comments(comments).build());
    }

    private void backdate(String table, String column, String idColumn, Long id, int daysAgo) {
        backdates.add(() -> jdbc.update("update " + table + " set " + column + " = ? where " + idColumn + " = ?",
                Timestamp.from(daysAgoInstant(daysAgo)), id));
    }

    private static Instant daysAgoInstant(int days) {
        return Instant.now().minus(Duration.ofDays(days)).minus(Duration.ofHours(3));
    }
}
