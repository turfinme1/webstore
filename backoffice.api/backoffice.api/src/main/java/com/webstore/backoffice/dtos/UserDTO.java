package com.webstore.backoffice.dtos;

import com.webstore.backoffice.models.User;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public class UserDTO {
    private Long id;
    private UUID userHash;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String address;
    private Boolean isEmailVerified;
    private Boolean hasFirstLogin;
    private Boolean isActive;
    private LocalDate birthDate;
    private OffsetDateTime createdAt;

    private IsoCountryCodeDTO isoCountryCode;
    private IsoCountryCodeDTO country;
    private GenderDTO gender;

    public UserDTO(User user) {
        this.id = user.getId();
        this.userHash = user.getUserHash();
        this.firstName = user.getFirstName();
        this.lastName = user.getLastName();
        this.email = user.getEmail();
        this.phone = user.getPhone();
        this.address = user.getAddress();
        this.isEmailVerified = user.getIsEmailVerified();
        this.hasFirstLogin = user.getHasFirstLogin();
        this.isActive = user.getIsActive();
        this.birthDate = user.getBirthDate();
        this.createdAt = user.getCreatedAt();

        // Map references to DTOs
        this.isoCountryCode = user.getIsoCountryCode() != null ? new IsoCountryCodeDTO(user.getIsoCountryCode()) : null;
        this.country = user.getCountry() != null ? new IsoCountryCodeDTO(user.getCountry()) : null;
        this.gender = user.getGender() != null ? new GenderDTO(user.getGender()) : null;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public UUID getUserHash() {
        return userHash;
    }

    public void setUserHash(UUID userHash) {
        this.userHash = userHash;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public Boolean getEmailVerified() {
        return isEmailVerified;
    }

    public void setEmailVerified(Boolean emailVerified) {
        isEmailVerified = emailVerified;
    }

    public Boolean getHasFirstLogin() {
        return hasFirstLogin;
    }

    public void setHasFirstLogin(Boolean hasFirstLogin) {
        this.hasFirstLogin = hasFirstLogin;
    }

    public Boolean getActive() {
        return isActive;
    }

    public void setActive(Boolean active) {
        isActive = active;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(LocalDate birthDate) {
        this.birthDate = birthDate;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public IsoCountryCodeDTO getIsoCountryCode() {
        return isoCountryCode;
    }

    public void setIsoCountryCode(IsoCountryCodeDTO isoCountryCode) {
        this.isoCountryCode = isoCountryCode;
    }

    public IsoCountryCodeDTO getCountry() {
        return country;
    }

    public void setCountry(IsoCountryCodeDTO country) {
        this.country = country;
    }

    public GenderDTO getGender() {
        return gender;
    }

    public void setGender(GenderDTO gender) {
        this.gender = gender;
    }
}

