package com.webstore.backoffice.crud.dtos;

import com.webstore.backoffice.crud.constants.CrudConstants;
import com.webstore.backoffice.crud.models.Product;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

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
}
