package com.webstore.backoffice.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.ColumnDefault;

import java.time.OffsetDateTime;

@Entity
@Table(name = "emails")
public class Email {
    @Id
    @ColumnDefault("nextval('emails_id_seq')")
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "sent_at")
    private OffsetDateTime sentAt;

    @NotNull
    @ColumnDefault("'pending'")
    @Column(name = "status", nullable = false, length = Integer.MAX_VALUE)
    private String status;

    @NotNull
    @ColumnDefault("now()")
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "recipient_id")
    private Long recipientId;

    @Column(name = "recipient_email", length = Integer.MAX_VALUE)
    private String recipientEmail;

    @Column(name = "text_content", length = Integer.MAX_VALUE)
    private String textContent;

    @Column(name = "subject", length = Integer.MAX_VALUE)
    private String subject;

    @NotNull
    @ColumnDefault("'Email'")
    @Column(name = "type", nullable = false, length = Integer.MAX_VALUE)
    private String type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "notification_id")
    private Notification notification;

    @NotNull
    @ColumnDefault("0")
    @Column(name = "email_attempts", nullable = false)
    private Integer emailAttempts;

    @Column(name = "email_last_attempt")
    private OffsetDateTime emailLastAttempt;

    @ColumnDefault("5")
    @Column(name = "email_priority")
    private Integer emailPriority;

    @Column(name = "email_retry_after")
    private OffsetDateTime emailRetryAfter;

    @Column(name = "email_processing_started_at")
    private OffsetDateTime emailProcessingStartedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public OffsetDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(OffsetDateTime sentAt) {
        this.sentAt = sentAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Long getRecipientId() {
        return recipientId;
    }

    public void setRecipientId(Long recipientId) {
        this.recipientId = recipientId;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public void setRecipientEmail(String recipientEmail) {
        this.recipientEmail = recipientEmail;
    }

    public String getTextContent() {
        return textContent;
    }

    public void setTextContent(String textContent) {
        this.textContent = textContent;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Notification getNotification() {
        return notification;
    }

    public void setNotification(Notification notification) {
        this.notification = notification;
    }

    public Integer getEmailAttempts() {
        return emailAttempts;
    }

    public void setEmailAttempts(Integer emailAttempts) {
        this.emailAttempts = emailAttempts;
    }

    public OffsetDateTime getEmailLastAttempt() {
        return emailLastAttempt;
    }

    public void setEmailLastAttempt(OffsetDateTime emailLastAttempt) {
        this.emailLastAttempt = emailLastAttempt;
    }

    public Integer getEmailPriority() {
        return emailPriority;
    }

    public void setEmailPriority(Integer emailPriority) {
        this.emailPriority = emailPriority;
    }

    public OffsetDateTime getEmailRetryAfter() {
        return emailRetryAfter;
    }

    public void setEmailRetryAfter(OffsetDateTime emailRetryAfter) {
        this.emailRetryAfter = emailRetryAfter;
    }

    public OffsetDateTime getEmailProcessingStartedAt() {
        return emailProcessingStartedAt;
    }

    public void setEmailProcessingStartedAt(OffsetDateTime emailProcessingStartedAt) {
        this.emailProcessingStartedAt = emailProcessingStartedAt;
    }

}