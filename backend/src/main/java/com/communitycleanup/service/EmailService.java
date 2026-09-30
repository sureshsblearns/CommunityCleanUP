package com.communitycleanup.service;

import com.communitycleanup.config.AppProperties;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.task.TaskExecutor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.util.HtmlUtils;

/**
 * Sends HTML notification emails asynchronously after the surrounding transaction commits.
 * When SMTP is not configured the message is only logged, so local development keeps working.
 */
@Slf4j
@Service
public class EmailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final TaskExecutor taskExecutor;
    private final AppProperties properties;
    private final boolean smtpConfigured;

    public EmailService(ObjectProvider<JavaMailSender> mailSenderProvider,
                        TaskExecutor taskExecutor,
                        AppProperties properties,
                        @Value("${spring.mail.host:}") String mailHost) {
        this.mailSenderProvider = mailSenderProvider;
        this.taskExecutor = taskExecutor;
        this.properties = properties;
        this.smtpConfigured = properties.mail().enabled() && mailHost != null && !mailHost.isBlank();
        if (!smtpConfigured) {
            log.info("SMTP is not configured; emails will be logged instead of sent.");
        }
    }

    /**
     * Queues an email built from a heading, paragraphs and an optional call-to-action link (path relative to the
     * frontend URL). All dynamic text is HTML-escaped.
     */
    public void send(String to, String subject, String heading, String body, String ctaLabel, String ctaPath) {
        String html = render(heading, body, ctaLabel, ctaPath);
        Runnable task = () -> deliver(to, subject, html);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    taskExecutor.execute(task);
                }
            });
        } else {
            taskExecutor.execute(task);
        }
    }

    private void deliver(String to, String subject, String html) {
        if (isDemoAddress(to)) {
            log.debug("[email skipped - demo address] to={} subject=\"{}\"", to, subject);
            return;
        }
        if (!smtpConfigured) {
            log.info("[email not sent - SMTP not configured] to={} subject=\"{}\"", to, subject);
            return;
        }
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            log.warn("No JavaMailSender available; skipping email \"{}\"", subject);
            return;
        }
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(properties.mail().from());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            sender.send(message);
            log.debug("Email \"{}\" sent to {}", subject, to);
        } catch (Exception e) {
            log.warn("Failed to send email \"{}\" to {}: {}", subject, to, e.getMessage());
        }
    }

    /** Seeded demo accounts use reserved domains that must never receive real mail. */
    private static boolean isDemoAddress(String to) {
        return to == null || to.endsWith("@example.com") || to.endsWith(".local");
    }

    private String render(String heading, String body, String ctaLabel, String ctaPath) {
        StringBuilder paragraphs = new StringBuilder();
        for (String paragraph : body.split("\n\n")) {
            paragraphs.append("<p style=\"margin:0 0 14px;line-height:1.6;color:#374151\">")
                    .append(HtmlUtils.htmlEscape(paragraph).replace("\n", "<br>"))
                    .append("</p>");
        }
        String cta = "";
        if (ctaLabel != null && ctaPath != null) {
            String url = properties.frontendUrl().replaceAll("/+$", "") + ctaPath;
            cta = "<p style=\"margin:24px 0\"><a href=\"" + HtmlUtils.htmlEscape(url) + "\" "
                    + "style=\"background:#059669;color:#fff;padding:12px 22px;border-radius:8px;"
                    + "text-decoration:none;font-weight:600\">" + HtmlUtils.htmlEscape(ctaLabel) + "</a></p>";
        }
        return """
                <div style="font-family:Segoe UI,Arial,sans-serif;background:#f0fdf4;padding:32px">
                  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #d1fae5">
                    <div style="background:#064e3b;color:#fff;padding:18px 24px;font-weight:700;font-size:18px">Community Clean-Up Portal</div>
                    <div style="padding:24px">
                      <h2 style="margin:0 0 16px;color:#064e3b;font-size:20px">%s</h2>
                      %s
                      %s
                    </div>
                    <div style="padding:14px 24px;background:#f9fafb;color:#6b7280;font-size:12px">
                      You are receiving this email because you have an account on Community Clean-Up Portal.
                    </div>
                  </div>
                </div>
                """.formatted(HtmlUtils.htmlEscape(heading), paragraphs, cta);
    }
}
