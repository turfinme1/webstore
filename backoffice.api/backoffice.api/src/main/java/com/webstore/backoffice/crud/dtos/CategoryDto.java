package com.webstore.backoffice.crud.dtos;

import com.webstore.backoffice.crud.constants.CrudConstants;
import com.webstore.backoffice.crud.models.Category;

public class CategoryDto extends BaseDto<Category> {

    private Long id;
    private String name;

    public CategoryDto() {
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
    public Category toDomainEntity() {
        Category category = new Category();
        category.setId(this.id);
        category.setName(this.name);
        return category;
    }

    @Override
    public String getSchemaName() {
        return CrudConstants.CATEGORY_SCHEMA_NAME;
    }
}
