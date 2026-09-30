package com.communitycleanup.entity;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReportStatusTest {

    @Test
    void followsTheDocumentedLifecycle() {
        assertThat(ReportStatus.PENDING.canTransitionTo(ReportStatus.VERIFIED)).isTrue();
        assertThat(ReportStatus.VERIFIED.canTransitionTo(ReportStatus.CLEANING_SCHEDULED)).isTrue();
        assertThat(ReportStatus.CLEANING_SCHEDULED.canTransitionTo(ReportStatus.IN_PROGRESS)).isTrue();
        assertThat(ReportStatus.IN_PROGRESS.canTransitionTo(ReportStatus.COMPLETED)).isTrue();
    }

    @Test
    void cannotSkipStraightToCompleted() {
        assertThat(ReportStatus.PENDING.canTransitionTo(ReportStatus.COMPLETED)).isFalse();
        assertThat(ReportStatus.VERIFIED.canTransitionTo(ReportStatus.COMPLETED)).isFalse();
        assertThat(ReportStatus.PENDING.canTransitionTo(ReportStatus.IN_PROGRESS)).isFalse();
    }

    @Test
    void terminalStatesHaveNoExits() {
        assertThat(ReportStatus.COMPLETED.allowedTransitions()).isEmpty();
        assertThat(ReportStatus.CANCELLED.allowedTransitions()).isEmpty();
    }

    @Test
    void rejectedReportsCanOnlyBeResubmitted() {
        assertThat(ReportStatus.REJECTED.allowedTransitions()).containsExactly(ReportStatus.PENDING);
    }
}
