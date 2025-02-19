package com.webstore.backoffice.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.ColumnDefault;

@Entity
@Table(name = "iso_country_codes")
public class IsoCountryCode extends BaseEntity<Long> {
    @Id
    @ColumnDefault("nextval('iso_country_codes_id_seq')")
    @Column(name = "id", nullable = false)
    private Long id;

    @NotNull
    @Column(name = "country_name", nullable = false, length = Integer.MAX_VALUE)
    private String countryName;

    @NotNull
    @Column(name = "country_code", nullable = false, length = Integer.MAX_VALUE)
    private String countryCode;

    @NotNull
    @Column(name = "phone_code", nullable = false, length = Integer.MAX_VALUE)
    private String phoneCode;

    @Override
    public boolean isValid() {
        return true;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCountryName() {
        return countryName;
    }

    public void setCountryName(String countryName) {
        this.countryName = countryName;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public void setCountryCode(String countryCode) {
        this.countryCode = countryCode;
    }

    public String getPhoneCode() {
        return phoneCode;
    }

    public void setPhoneCode(String phoneCode) {
        this.phoneCode = phoneCode;
    }

}