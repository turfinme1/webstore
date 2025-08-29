package com.webstore.backoffice.crud.controllers;

import com.webstore.backoffice.crud.dtos.CategoryDto;
import com.webstore.backoffice.crud.dtos.ProductDto;
import com.webstore.backoffice.crud.services.ProductService;
import com.webstore.backoffice.crud.models.Product;
import jakarta.transaction.Transactional;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/products")
public class ProductController extends GenericController<ProductDto, Product, Long> {

    public ProductController(ProductService service) {
        super(service);
    }

    @Transactional
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ProductDto> create(@RequestParam("name") String name,
                                             @RequestParam("price") BigDecimal price,
                                             @RequestParam("quantity") Long quantity,
                                             @RequestParam("short_description") String shortDescription,
                                             @RequestParam("long_description") String longDescription,
                                             @RequestParam("categories") String categories,
                                             @RequestPart(value = "file1", required = false) MultipartFile image1,
                                             @RequestPart(value = "file2", required = false) MultipartFile image2,
                                             @RequestPart(value = "file3", required = false) MultipartFile image3) {
        var dto = new ProductDto();
        dto.setName(name);
        dto.setPrice(price);
        dto.setQuantity(quantity);
        dto.setShortDescription(shortDescription);
        dto.setLongDescription(longDescription);
        Set<CategoryDto> categoryDtos = new HashSet<>();
        for (Long categoryId : Arrays
                .stream(categories.replaceAll("[\\[\\]\"]", "").split(","))
                .filter(s -> !s.isEmpty())
                .map(Long::parseLong)
                .toList()) {
            CategoryDto category = new CategoryDto();
            category.setId(categoryId);
            categoryDtos.add(category);
        }
        dto.setCategories(categoryDtos);
        dto.setCode("P" + System.currentTimeMillis());
        dto.setImages(Arrays.stream(new MultipartFile[] {image1, image2, image3})
                .filter(image -> image.getSize() > 0)
                .toArray(MultipartFile[]::new));
        return super.create(dto);
    }

    @Transactional
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ProductDto> update(@PathVariable Long id,
                                             @RequestParam("name") String name,
                                             @RequestParam("price") BigDecimal price,
                                             @RequestParam("quantity") Long quantity,
                                             @RequestParam("short_description") String shortDescription,
                                             @RequestParam("long_description") String longDescription,
                                             @RequestParam("categories") String categories,
                                             @RequestParam("imagesToDelete") String imagesToDelete,
                                             @RequestPart(value = "file1", required = false) MultipartFile image1,
                                             @RequestPart(value = "file2", required = false) MultipartFile image2,
                                             @RequestPart(value = "file3", required = false) MultipartFile image3) {
        var dto = new ProductDto();
        dto.setId(id);
        dto.setName(name);
        dto.setPrice(price);
        dto.setQuantity(quantity);
        dto.setShortDescription(shortDescription);
        dto.setLongDescription(longDescription);
        Set<CategoryDto> categoryDtos = new HashSet<>();
        for (Long categoryId : Arrays
                .stream(categories.replaceAll("[\\[\\]\"]", "").split(","))
                .filter(s -> !s.isEmpty())
                .map(Long::parseLong)
                .toList()) {
            CategoryDto category = new CategoryDto();
            category.setId(categoryId);
            categoryDtos.add(category);
        }
        List<String> imagesToDeleteList = Arrays
                .stream(imagesToDelete.replaceAll("[\\[\\]\"]", "").split(","))
                .filter(s -> !s.isEmpty())
                .toList();
        dto.setImagesToDelete(imagesToDeleteList);
        dto.setCategories(categoryDtos);
        dto.setImages(Arrays.stream(new MultipartFile[] {image1, image2, image3})
                .filter(image -> image.getSize() > 0)
                .toArray(MultipartFile[]::new));
        return super.update(id, dto);
    }
}
