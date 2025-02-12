package com.webstore.backoffice.models;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotNull;
import org.hibernate.Hibernate;

import java.util.Objects;

@Embeddable
public class UserTargetGroupId implements java.io.Serializable {
    private static final long serialVersionUID = 3832085149099921451L;
    @NotNull
    @Column(name = "target_group_id", nullable = false)
    private Long targetGroupId;

    @NotNull
    @Column(name = "user_id", nullable = false)
    private Long userId;

    public Long getTargetGroupId() {
        return targetGroupId;
    }

    public void setTargetGroupId(Long targetGroupId) {
        this.targetGroupId = targetGroupId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || Hibernate.getClass(this) != Hibernate.getClass(o)) return false;
        UserTargetGroupId entity = (UserTargetGroupId) o;
        return Objects.equals(this.targetGroupId, entity.targetGroupId) &&
                Objects.equals(this.userId, entity.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(targetGroupId, userId);
    }

}