package com.webstore.backoffice.crud.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/**
 * Mapping for DB view
 */
@Entity
@Immutable
@Table(name = "country_codes_view")
public class CountryCodesView {
    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "country_name", length = Integer.MAX_VALUE)
    private String countryName;

    @Column(name = "country_code", length = Integer.MAX_VALUE)
    private String countryCode;

    @Column(name = "phone_code", length = Integer.MAX_VALUE)
    private String phoneCode;

    public Long getId() {
        return id;
    }

    public String getCountryName() {
        return countryName;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public String getPhoneCode() {
        return phoneCode;
    }

    protected CountryCodesView() {
    }
}