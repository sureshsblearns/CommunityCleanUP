package com.communitycleanup.util;

public final class ValidationPatterns {

    /** 10-15 digits, optional leading +, spaces or dashes allowed between groups. */
    public static final String PHONE = "^\\+?[0-9][0-9\\s-]{8,18}[0-9]$";

    /** At least 8 characters with an uppercase letter, a lowercase letter and a digit. */
    public static final String PASSWORD = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,72}$";

    public static final String PASSWORD_MESSAGE =
            "Password must be 8-72 characters and include an uppercase letter, a lowercase letter and a number";

    private ValidationPatterns() {
    }
}
