package com.webstore.backoffice.crud.dtos;

import com.webstore.backoffice.crud.constants.CrudConstants;
import com.webstore.backoffice.crud.models.Product;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.List;

public class ProductDto extends BaseDto<Product> {

    private Long id;

    @NotBlank(message = CrudConstants.NAME_REQUIRED)
    private String name;

    @NotBlank(message = CrudConstants.PRICE_REQUIRED)
    private BigDecimal price;

    @NotBlank(message = CrudConstants.SHORT_DESCRIPTION_REQUIRED)
    private String shortDescription;

    @NotBlank(message = CrudConstants.LONG_DESCRIPTION_REQUIRED)
    private String longDescription;

    @NotBlank(message = CrudConstants.CATEGORIES_REQUIRED)
    private List<Long> categories;

    public ProductDto() {
    }

    public ProductDto(Product product) {
        this.id = product.getId();
        this.name = product.getName();
        this.price = product.getPrice();
        this.shortDescription = product.getShortDescription();
        this.longDescription = product.getLongDescription();
    }

    @Override
    public Product toDomainEntity() {
        Product product = new Product();
        product.setId(this.id);
        product.setName(this.name);
        product.setPrice(this.price);
        product.setShortDescription(this.shortDescription);
        product.setLongDescription(this.longDescription);
        return product;
    }

    @Override
    public String getSchemaName() {
        return CrudConstants.PRODUCT_SCHEMA_NAME;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public @NotBlank(message = CrudConstants.NAME_REQUIRED) String getName() {
        return name;
    }

    public void setName(@NotBlank(message = CrudConstants.NAME_REQUIRED) String name) {
        this.name = name;
    }

    public @NotBlank(message = CrudConstants.PRICE_REQUIRED) BigDecimal getPrice() {
        return price;
    }

    public void setPrice(@NotBlank(message = CrudConstants.PRICE_REQUIRED) BigDecimal price) {
        this.price = price;
    }

    public @NotBlank(message = CrudConstants.SHORT_DESCRIPTION_REQUIRED) String getShortDescription() {
        return shortDescription;
    }

    public void setShortDescription(@NotBlank(message = CrudConstants.SHORT_DESCRIPTION_REQUIRED) String shortDescription) {
        this.shortDescription = shortDescription;
    }

    public @NotBlank(message = CrudConstants.LONG_DESCRIPTION_REQUIRED) String getLongDescription() {
        return longDescription;
    }

    public void setLongDescription(@NotBlank(message = CrudConstants.LONG_DESCRIPTION_REQUIRED) String longDescription) {
        this.longDescription = longDescription;
    }

    public @NotBlank(message = CrudConstants.CATEGORIES_REQUIRED) List<Long> getCategories() {
        return categories;
    }

    public void setCategories(@NotBlank(message = CrudConstants.CATEGORIES_REQUIRED) List<Long> categories) {
        this.categories = categories;
    }
}
