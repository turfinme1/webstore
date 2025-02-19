package com.webstore.backoffice.crud.dtos;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.webstore.backoffice.models.BaseEntity;

public abstract class BaseDto<E extends BaseEntity<?>> {

    public abstract E toDomainEntity();

    @JsonIgnore
    public abstract String getSchemaName();
}
