package com.communitycleanup.entity;

public enum Role {
    RESIDENT, VOLUNTEER, NGO, ADMIN;

    public boolean isSelfRegistrable() {
        return this != ADMIN;
    }
}
