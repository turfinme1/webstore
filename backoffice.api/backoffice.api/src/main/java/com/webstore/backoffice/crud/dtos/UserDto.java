package com.webstore.backoffice.crud.dtos;

import com.webstore.backoffice.crud.constants.CrudConstants;
import com.webstore.backoffice.crud.models.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public class UserDto extends BaseDto<User>{
    @NotBlank(message = CrudConstants.FIRST_NAME_REQUIRED)
    private String firstName;

    @NotBlank(message = CrudConstants.LAST_NAME_REQUIRED)
    private String lastName;

    @Email(message = CrudConstants.EMAIL_VALID)
    @NotBlank(message = CrudConstants.EMAIL_REQUIRED)
    private String email;

    @NotNull(message = CrudConstants.ISO_COUNTRY_CODE_REQUIRED)
    private Long isoCountryCodeId;

    @NotBlank(message = CrudConstants.PHONE_REQUIRED)
    private String phone;

    @NotNull(message = CrudConstants.COUNTRY_ID_REQUIRED)
    private Long countryId;

    private LocalDate birthDate;

    @NotNull(message = CrudConstants.GENDER_ID_REQUIRED)
    private Long genderId;

    private String address;

    @NotNull(message = CrudConstants.EMAIL_VERIFICATION_STATUS_REQUIRED)
    private Boolean isEmailVerified;

    private String passwordHash;

    private Long id;
    private UUID userHash = UUID.randomUUID();
    private Boolean hasFirstLogin = false;
    private Boolean isActive = true;
    private OffsetDateTime createdAt = OffsetDateTime.now();
    private IsoCountryCodeDto isoCountryCode;
    private IsoCountryCodeDto country;
    private GenderDto gender;

    public UserDto() {
    }

    public UserDto(User user) {
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
        this.isoCountryCode = user.getIsoCountryCode() != null ? new IsoCountryCodeDto(user.getIsoCountryCode()) : null;
        this.country = user.getCountry() != null ? new IsoCountryCodeDto(user.getCountry()) : null;
        this.gender = user.getGender() != null ? new GenderDto(user.getGender()) : null;
    }

    @Override
    public User toDomainEntity() {
        User user = new User();
        user.setId(this.id);
        user.setUserHash(this.userHash);
        user.setFirstName(this.firstName);
        user.setLastName(this.lastName);
        user.setEmail(this.email);
        user.setPhone(this.phone);
        user.setAddress(this.address);
        user.setIsEmailVerified(this.isEmailVerified);
        user.setHasFirstLogin(this.hasFirstLogin);
        user.setIsActive(this.isActive);
        user.setBirthDate(this.birthDate);
        user.setCreatedAt(this.createdAt);
        user.setPasswordHash(this.passwordHash);

        user.setIsoCountryCode(this.isoCountryCode != null ? this.isoCountryCode.toDomainEntity() : null);
        user.setCountry(this.country != null ? this.country.toDomainEntity() : null);
        user.setGender(this.gender != null ? this.gender.toDomainEntity() : null);

        return user;
    }

    public Long getIsoCountryCodeId() {
        return isoCountryCodeId;
    }

    public void setIsoCountryCodeId(Long isoCountryCodeId) {
        this.isoCountryCodeId = isoCountryCodeId;
    }

    public Long getCountryId() {
        return countryId;
    }

    public void setCountryId(Long countryId) {
        this.countryId = countryId;
    }

    public Long getGenderId() {
        return genderId;
    }

    public void setGenderId(Long genderId) {
        this.genderId = genderId;
    }

    public Boolean getIsEmailVerified() {
        return isEmailVerified;
    }

    public void setIsEmailVerified(Boolean isEmailVerified) {
        this.isEmailVerified = isEmailVerified;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    @Override
    public String getSchemaName() {
        return "users";
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

    public IsoCountryCodeDto getIsoCountryCode() {
        return isoCountryCode;
    }

    public void setIsoCountryCode(IsoCountryCodeDto isoCountryCode) {
        this.isoCountryCode = isoCountryCode;
    }

    public IsoCountryCodeDto getCountry() {
        return country;
    }

    public void setCountry(IsoCountryCodeDto country) {
        this.country = country;
    }

    public GenderDto getGender() {
        return gender;
    }

    public void setGender(GenderDto gender) {
        this.gender = gender;
    }
}


