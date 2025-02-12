package com.webstore.backoffice.dtos;

import com.webstore.backoffice.models.IsoCountryCode;

public class IsoCountryCodeDTO {
    private Long id;
    private String countryName;
    private String phoneCode;

    public IsoCountryCodeDTO(IsoCountryCode isoCountryCode) {
        this.id = isoCountryCode.getId();
        this.countryName = isoCountryCode.getCountryName();
        this.phoneCode = isoCountryCode.getPhoneCode();
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

    public String getPhoneCode() {
        return phoneCode;
    }

    public void setPhoneCode(String phoneCode) {
        this.phoneCode = phoneCode;
    }
}