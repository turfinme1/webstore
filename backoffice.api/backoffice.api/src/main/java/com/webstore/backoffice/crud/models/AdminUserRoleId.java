package com.webstore.backoffice.crud.models;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotNull;
import org.hibernate.Hibernate;

import java.util.Objects;

@Embeddable
public class AdminUserRoleId implements java.io.Serializable {
    private static final long serialVersionUID = 2673225404071433266L;
    @NotNull
    @Column(name = "admin_user_id", nullable = false)
    private Long adminUserId;

    @NotNull
    @Column(name = "role_id", nullable = false)
    private Long roleId;

    public Long getAdminUserId() {
        return adminUserId;
    }

    public void setAdminUserId(Long adminUserId) {
        this.adminUserId = adminUserId;
    }

    public Long getRoleId() {
        return roleId;
    }

    public void setRoleId(Long roleId) {
        this.roleId = roleId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || Hibernate.getClass(this) != Hibernate.getClass(o)) return false;
        AdminUserRoleId entity = (AdminUserRoleId) o;
        return Objects.equals(this.adminUserId, entity.adminUserId) &&
                Objects.equals(this.roleId, entity.roleId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(adminUserId, roleId);
    }

}