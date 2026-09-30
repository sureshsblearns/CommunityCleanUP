package com.communitycleanup.entity;

public enum EventStatus {
    UPCOMING, OPEN, FULL, IN_PROGRESS, COMPLETED, CANCELLED;

    public boolean isActive() {
        return this != COMPLETED && this != CANCELLED;
    }
}
