package com.webstore.backoffice.crud.controllers;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.webstore.backoffice.asserts.dtos.CustomErrorResponse;
import com.webstore.backoffice.crud.dtos.CategoryDto;
import com.webstore.backoffice.crud.dtos.ProductDto;
import com.webstore.backoffice.crud.services.ProductService;
import com.webstore.backoffice.crud.models.Product;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.transaction.Transactional;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/crud/products")
public class ProductController extends GenericController<ProductDto, Product, Long> {

    public ProductController(ProductService service) {
        super(service);
    }

    @Operation
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Product found",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = ProductDto.class))
                    }),
            @ApiResponse(responseCode = "400", description = "Invalid input",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class))
                    }),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class))
                    })
    })
    @Override
    @GetMapping("/{id}")
    public ResponseEntity<ProductDto> getById(@PathVariable Long id) {
        return super.getById(id);
    }

    @Operation
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Products found",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = ProductDto.class))
                    }),
            @ApiResponse(responseCode = "400", description = "Invalid input",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class))
                    }),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class))
                    })
    })
    @Override
    @GetMapping("/filtered")
    public ResponseEntity<?> findAll(@RequestParam Map<String, String> allParams) throws JsonProcessingException {
        return super.findAll(allParams);
    }

    @Operation
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Product deleted"),
            @ApiResponse(responseCode = "400", description = "Invalid input",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class))
                    }),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class))
                    })
    })
    @Override
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return super.delete(id);
    }

    @Operation
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Product created",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = ProductDto.class))
                    }),
            @ApiResponse(responseCode = "400", description = "Invalid input",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class ))
                    }),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class))
                    })
    })
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

    @Operation
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Product updated",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = ProductDto.class))
                    }),
            @ApiResponse(responseCode = "400", description = "Invalid input",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class ))
                    }),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class))
                    })
    })
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
