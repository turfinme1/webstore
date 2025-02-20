package com.webstore.backoffice.crud.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

/**
 * Mapping for DB view
 */
@Entity
@Immutable
@Table(name = "admin_users_view")
public class AdminUsersView {
    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "first_name", length = Integer.MAX_VALUE)
    private String firstName;

    @Column(name = "last_name", length = Integer.MAX_VALUE)
    private String lastName;

    @Column(name = "email", length = Integer.MAX_VALUE)
    private String email;

    @Column(name = "phone", length = Integer.MAX_VALUE)
    private String phone;

    @Column(name = "phone_code", length = Integer.MAX_VALUE)
    private String phoneCode;

    @Column(name = "iso_country_code_id")
    private Long isoCountryCodeId;

    @Column(name = "country_name", length = Integer.MAX_VALUE)
    private String countryName;

    @Column(name = "country_id")
    private Long countryId;

    @Column(name = "gender", length = Integer.MAX_VALUE)
    private String gender;

    @Column(name = "gender_id")
    private Long genderId;

    @Column(name = "address", length = Integer.MAX_VALUE)
    private String address;

    @Column(name = "is_email_verified")
    private Boolean isEmailVerified;

    @Column(name = "has_first_login")
    private Boolean hasFirstLogin;

    @Column(name = "roles")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> roles;

    public Long getId() {
        return id;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getPhoneCode() {
        return phoneCode;
    }

    public Long getIsoCountryCodeId() {
        return isoCountryCodeId;
    }

    public String getCountryName() {
        return countryName;
    }

    public Long getCountryId() {
        return countryId;
    }

    public String getGender() {
        return gender;
    }

    public Long getGenderId() {
        return genderId;
    }

    public String getAddress() {
        return address;
    }

    public Boolean getIsEmailVerified() {
        return isEmailVerified;
    }

    public Boolean getHasFirstLogin() {
        return hasFirstLogin;
    }

    public Map<String, Object> getRoles() {
        return roles;
    }

    protected AdminUsersView() {
    }
}