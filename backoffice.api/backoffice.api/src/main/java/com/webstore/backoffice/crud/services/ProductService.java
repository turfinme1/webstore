package com.webstore.backoffice.crud.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.webstore.backoffice.crud.configurations.GenericSpecificationBuilder;
import com.webstore.backoffice.crud.configurations.SchemaRegistry;
import com.webstore.backoffice.crud.constants.CrudConstants;
import com.webstore.backoffice.crud.dtos.ProductDto;
import com.webstore.backoffice.crud.models.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;

@Service
public class ProductService extends GenericAppService<ProductDto, Product, Long> {

    public ProductService(JpaRepository<Product, Long> repository,
                          SchemaRegistry schemaRegistry,
                          ObjectMapper objectMapper,
                          GenericSpecificationBuilder<Product> specificationBuilder) {
        super(repository, schemaRegistry, objectMapper, specificationBuilder);
    }

    public ProductDto convertToDto(Product product) {
        return new ProductDto(product);
    }

    @Override
    protected String getSchemaName() {
        return CrudConstants.PRODUCT_SCHEMA_NAME;
    }
}
