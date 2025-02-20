package com.webstore.backoffice.crud.controllers;

import com.webstore.backoffice.crud.dtos.ProductDto;
import com.webstore.backoffice.crud.services.ProductService;
import com.webstore.backoffice.crud.models.Product;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/crud/products")
public class ProductController extends GenericController<ProductDto, Product, Long> {

    public ProductController(ProductService service) {
        super(service);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ProductDto> create(@RequestParam("name") String name,
                                             @RequestParam("price") BigDecimal price,
                                             @RequestParam("short_description") String shortDescription,
                                             @RequestParam("long_description") String longDescription,
                                             @RequestParam("categories") String categories,
                                             @RequestPart(value = "file1", required = false) MultipartFile image1,
                                             @RequestPart(value = "file2", required = false) MultipartFile image2,
                                             @RequestPart(value = "file3", required = false) MultipartFile image3) {
        var dto = new ProductDto();
        dto.setName(name);
        dto.setPrice(price);
        dto.setShortDescription(shortDescription);
        dto.setLongDescription(longDescription);
        var parsedCategories = Arrays
                .stream(categories.replaceAll("[\\[\\]\"]", "").split(","))
                .filter(s -> !s.isEmpty())
                .map(Long::parseLong)
                .collect(Collectors.toList());
        dto.setCategories(parsedCategories);
        return super.create(dto);
    }
}
