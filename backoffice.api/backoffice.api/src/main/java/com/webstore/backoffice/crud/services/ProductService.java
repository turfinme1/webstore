package com.webstore.backoffice.crud.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.webstore.backoffice.crud.configurations.GenericSpecificationBuilder;
import com.webstore.backoffice.crud.configurations.SchemaRegistry;
import com.webstore.backoffice.crud.constants.CrudConstants;
import com.webstore.backoffice.crud.dtos.ProductDto;
import com.webstore.backoffice.crud.models.Image;
import com.webstore.backoffice.crud.models.Product;
import com.webstore.backoffice.crud.repositories.ImageRepository;
import com.webstore.backoffice.security.repositories.AppSettingRepository;
import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.io.FilenameUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

import static com.webstore.backoffice.asserts.AssertUtil.*;

@Service
public class ProductService extends GenericAppService<ProductDto, Product, Long> {

    @Value("${app.upload.dir}")
    private String uploadDir;
    private final ImageRepository imageRepository;
    private final AppSettingRepository appSettingRepository;
    private BigDecimal vatPercentage;
    private final JpaRepository<Product, Long> repository;

    public ProductService(JpaRepository<Product, Long> repository,
                          SchemaRegistry schemaRegistry,
                          ObjectMapper objectMapper,
                          GenericSpecificationBuilder<Product> specificationBuilder,
                          ImageRepository imageRepository,
                          AppSettingRepository appSettingRepository) {
        super(repository, schemaRegistry, objectMapper, specificationBuilder);
        this.imageRepository = imageRepository;
        this.appSettingRepository = appSettingRepository;
        this.repository = repository;
    }

    public ProductDto convertToDto(Product product) {
        var appSetting = appSettingRepository.findById(1L);
        return appSetting
                .map(setting -> new ProductDto(product, setting.getVatPercentage()))
                .orElseGet(() -> new ProductDto(product, new BigDecimal("0.00")));
    }

    @Override
    protected String getSchemaName() {
        return CrudConstants.PRODUCT_SCHEMA_NAME;
    }

    @Override
    public ProductDto create(ProductDto dto) {
        var createdProduct = super.create(dto);
        var createdProductDomainEntity = createdProduct.toDomainEntity();

        List<String> imagePaths = handleImageUploads(dto.getImages());

        for (String imagePath : imagePaths) {
            Image productImage = new Image();
            productImage.setUrl(imagePath);
            productImage.setProduct(createdProductDomainEntity);
            imageRepository.save(productImage);
        }

        return createdProduct;
    }

    @Override
    public ProductDto update(Long id, ProductDto dto) {
        var product = repository.findById(id);
        ASSERT_USER(product.isPresent(), "Product not found",
                new HashMap<>() {{
                    put("code", "APP_SRV_00007_PRODUCT_NOT_FOUND");
                }});
        dto.setCode(product.get().getCode());
        var updatedProduct = super.update(id, dto);
        var updatedProductDomainEntity = updatedProduct.toDomainEntity();

        List<String> imagePaths = handleImageUploads(dto.getImages());

        for (String imagePath : imagePaths) {
            Image productImage = new Image();
            productImage.setUrl(imagePath);
            productImage.setProduct(updatedProductDomainEntity);
            imageRepository.save(productImage);
        }

        if (dto.getImagesToDelete() != null) {
            for (String imageToDelete : dto.getImagesToDelete()) {
                deleteImage(imageToDelete);
                imageRepository.deleteByUrl(imageToDelete);
            }
        }

        return updatedProduct;
    }

    private List<String> handleImageUploads(MultipartFile[] images) {
        ASSERT_USER(images != null && images.length <= 3, "Maximum 3 images allowed",
                new HashMap<>() {{
                    put("code", "APP_SRV_00008_MAX_IMAGES_EXCEEDED");
                }});

        List<String> imagePaths = new ArrayList<>();

        try {
            for (MultipartFile image : images) {
                String fileExtension = FilenameUtils.getExtension(image.getOriginalFilename());
                String hashedName = DigestUtils.sha256Hex(UUID.randomUUID().toString());
                String fileName = hashedName + "." + fileExtension;
                String filePath = uploadDir + "/" + fileName;

                Files.copy(image.getInputStream(), Paths.get(filePath),
                        StandardCopyOption.REPLACE_EXISTING);
                imagePaths.add("/images/" + fileName);
            }
        } catch (IOException e) {
            ASSERT_USER(false, "Failed to upload images",
                    new HashMap<>() {{
                        put("code", "APP_SRV_00009_IMAGE_UPLOAD_FAILED");
                    }});
        }
        return imagePaths;
    }

    private void deleteImage(String imagePath) {
        try {
            imagePath = imagePath.split("/images")[1];
            Files.delete(Paths.get(uploadDir + imagePath));
        } catch (IOException e) {
            ASSERT_USER(false, "Failed to delete image",
                    new HashMap<>() {{
                        put("code", "APP_SRV_00010_IMAGE_DELETE_FAILED");
                    }});
        }
    }
}
