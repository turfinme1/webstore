package com.webstore.backoffice.crud.dtos;

import com.webstore.backoffice.crud.models.IsoCountryCode;

public class IsoCountryCodeDto extends BaseDto<IsoCountryCode> {
    private Long id;
    private String countryName;
    private String phoneCode;

    public IsoCountryCodeDto(IsoCountryCode isoCountryCode) {
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

    @Override
    public IsoCountryCode toDomainEntity() {
        var entity = new IsoCountryCode();
        entity.setId(this.id);
        entity.setCountryName(this.countryName);
        entity.setPhoneCode(this.phoneCode);
        return entity;
    }

    @Override
    public String getSchemaName() {
        return "iso_country_code";
    }
}