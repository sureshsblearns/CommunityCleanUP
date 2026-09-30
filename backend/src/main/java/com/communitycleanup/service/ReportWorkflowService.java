package com.communitycleanup.service;

import com.communitycleanup.entity.*;
import com.communitycleanup.exception.ApiException;
import com.communitycleanup.repository.ReportStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/**
 * Single place where a report's status changes. Enforces the lifecycle state machine defined in
 * {@link ReportStatus}, records history and notifies the reporter. Callers are responsible for
 * checking whether the acting user is <em>permitted</em> to request the change.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportWorkflowService {

    private final ReportStatusHistoryRepository historyRepository;
    private final RewardService rewardService;
    private final EmailService emailService;

    @Transactional
    public void recordInitial(Report report, User actor) {
        historyRepository.save(ReportStatusHistory.builder()
                .report(report)
                .oldStatus(null)
                .newStatus(report.getStatus())
                .changedBy(actor)
                .comment("Report submitted")
                .build());
    }

    @Transactional
    public void transition(Report report, ReportStatus target, User actor, String comment) {
        ReportStatus current = report.getStatus();
        if (current == target) {
            return;
        }
        if (!current.canTransitionTo(target)) {
            throw ApiException.unprocessable("A report cannot move from " + label(current) + " to " + label(target));
        }
        report.setStatus(target);
        if (target == ReportStatus.REJECTED || target == ReportStatus.VERIFIED) {
            report.setAdminComment(comment);
        }
        historyRepository.save(ReportStatusHistory.builder()
                .report(report)
                .oldStatus(current)
                .newStatus(target)
                .changedBy(actor)
                .comment(comment == null || comment.isBlank() ? null : comment.trim())
                .build());
        log.debug("Report {} moved {} -> {}", report.getId(), current, target);

        if (target == ReportStatus.COMPLETED) {
            rewardService.awardBadge(report.getUser(), BadgeType.ECO_REPORTER);
        }
        notifyReporter(report, target, comment);
    }

    private void notifyReporter(Report report, ReportStatus status, String comment) {
        User reporter = report.getUser();
        String body = switch (status) {
            case VERIFIED -> "Good news! Your report has been verified by our team and is now visible to cleanup organisers.";
            case REJECTED -> "Unfortunately your report could not be verified."
                    + (comment != null && !comment.isBlank() ? "\n\nReason: " + comment : "")
                    + "\n\nYou can edit the report and resubmit it.";
            case CLEANING_SCHEDULED -> "A cleanup event has been scheduled for the area you reported.";
            case IN_PROGRESS -> "Volunteers are cleaning the area you reported right now.";
            case COMPLETED -> "The area you reported has been cleaned. Thank you for helping your community!";
            case CANCELLED -> "Your report has been cancelled.";
            case PENDING -> "Your report has been resubmitted and is awaiting review.";
        };
        emailService.send(reporter.getEmail(), "Report update: " + label(status), "\"" + report.getTitle() + "\" is now "
                + label(status), body, "View report", "/reports/" + report.getId());
    }

    public static String label(ReportStatus status) {
        String text = status.name().replace('_', ' ').toLowerCase(Locale.ROOT);
        return Character.toUpperCase(text.charAt(0)) + text.substring(1);
    }
}
