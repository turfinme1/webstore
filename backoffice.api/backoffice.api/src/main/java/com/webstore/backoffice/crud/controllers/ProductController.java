package com.webstore.backoffice.crud.controllers;

import com.webstore.backoffice.crud.dtos.ProductDto;
import com.webstore.backoffice.crud.services.ProductService;
import com.webstore.backoffice.crud.models.Product;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;

@RestController
@RequestMapping("/crud/products")
public class ProductController extends GenericController<ProductDto, Product, Long> {

    public ProductController(ProductService service) {
        super(service);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductDto> create(@RequestPart(value = "name", required = false) String name,
                                             @RequestPart(value = "price", required = false) BigDecimal price,
                                             @RequestPart(value = "short_description", required = false) String shortDescription,
                                             @RequestPart(value = "long_description", required = false) String longDescription,
                                             @RequestPart(value = "file1", required = false) MultipartFile image1,
                                             @RequestPart(value = "file2", required = false) MultipartFile image2,
                                             @RequestPart(value = "file3", required = false) MultipartFile image3) {
//        return super.create(dto);
        return super.create(new ProductDto());
    }
}
