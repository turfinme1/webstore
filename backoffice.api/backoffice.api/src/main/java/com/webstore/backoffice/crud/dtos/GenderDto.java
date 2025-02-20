package com.webstore.backoffice.crud.dtos;

import com.webstore.backoffice.crud.models.Gender;

public class GenderDto extends BaseDto<Gender>{
    private Long id;
    private String name;

    public GenderDto(Gender gender) {
        this.id = gender.getId();
        this.name = gender.getType();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    @Override
    public Gender toDomainEntity() {
        var entity = new Gender();
        entity.setId(this.id);
        entity.setType(this.name);
        return entity;
    }

    @Override
    public String getSchemaName() {
        return "gender";
    }
}

