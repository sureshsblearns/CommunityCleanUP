package com.communitycleanup.service;

import com.communitycleanup.dto.feedback.FeedbackDtos.EventFeedbackDto;
import com.communitycleanup.dto.feedback.FeedbackDtos.FeedbackDto;
import com.communitycleanup.dto.feedback.FeedbackDtos.FeedbackRequest;
import com.communitycleanup.entity.Event;
import com.communitycleanup.entity.EventParticipant;
import com.communitycleanup.entity.EventStatus;
import com.communitycleanup.entity.Feedback;
import com.communitycleanup.exception.ApiException;
import com.communitycleanup.mapper.DtoMapper;
import com.communitycleanup.repository.EventParticipantRepository;
import com.communitycleanup.repository.EventRepository;
import com.communitycleanup.repository.FeedbackRepository;
import com.communitycleanup.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final EventRepository eventRepository;
    private final EventParticipantRepository participantRepository;

    @Transactional
    public FeedbackDto submit(Long eventId, FeedbackRequest request, UserPrincipal principal) {
        Event event = eventRepository.findById(eventId).orElseThrow(() -> ApiException.notFound("Event"));
        if (event.getStatus() != EventStatus.COMPLETED) {
            throw ApiException.unprocessable("Feedback can be submitted once the event is completed");
        }
        EventParticipant participant = participantRepository.findByEventIdAndUserId(eventId, principal.getId())
                .orElseThrow(() -> ApiException.forbidden("Only volunteers who took part in this event can leave feedback"));
        if (!participant.isAttendance()) {
            throw ApiException.forbidden("Only volunteers whose attendance was confirmed can leave feedback");
        }
        if (feedbackRepository.existsByUserIdAndEventId(principal.getId(), eventId)) {
            throw ApiException.conflict("You have already submitted feedback for this event");
        }
        Feedback feedback = feedbackRepository.save(Feedback.builder()
                .user(participant.getUser())
                .event(event)
                .rating(request.rating())
                .comments(request.comments() == null || request.comments().isBlank() ? null : request.comments().trim())
                .build());
        return DtoMapper.toFeedbackDto(feedback);
    }

    @Transactional(readOnly = true)
    public EventFeedbackDto forEvent(Long eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw ApiException.notFound("Event");
        }
        var items = feedbackRepository.findByEventIdOrderBySubmittedDateDesc(eventId).stream()
                .map(DtoMapper::toFeedbackDto).toList();
        return new EventFeedbackDto(feedbackRepository.averageRatingForEvent(eventId), items.size(), items);
    }
}
