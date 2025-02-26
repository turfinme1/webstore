package com.webstore.backoffice.crud.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.webstore.backoffice.crud.configurations.GenericSpecificationBuilder;
import com.webstore.backoffice.crud.configurations.SchemaRegistry;
import com.webstore.backoffice.crud.dtos.CategoryDto;
import com.webstore.backoffice.crud.dtos.ProductDto;
import com.webstore.backoffice.crud.models.AppSetting;
import com.webstore.backoffice.crud.models.Category;
import com.webstore.backoffice.crud.models.Image;
import com.webstore.backoffice.crud.models.Product;
import com.webstore.backoffice.crud.repositories.ImageRepository;
import com.webstore.backoffice.crud.repositories.ProductRepository;

import com.webstore.backoffice.security.repositories.AppSettingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ProductServiceTest {

    private ProductService productService;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private SchemaRegistry schemaRegistry;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private GenericSpecificationBuilder<Product> specificationBuilder;

    @Mock
    private ImageRepository imageRepository;

    @Mock
    private AppSettingRepository appSettingRepository;

    private String tempDir;

    @BeforeEach
    void setUp() throws IOException {
        productService = new ProductService(
                productRepository,
                schemaRegistry,
                objectMapper,
                specificationBuilder,
                imageRepository,
                appSettingRepository
        );

        // Create a temporary directory for testing file operations
        tempDir = Files.createTempDirectory("test-uploads").toString();
        ReflectionTestUtils.setField(productService, "uploadDir", tempDir);
    }

    @Test
    void testGetSchemaName() {
        assertEquals("products", productService.getSchemaName());
    }

    @Test
    void testConvertToDto_WithVatPercentage() {
        // Given
        Product product = new Product();
        product.setId(1L);
        product.setName("Test Product");
        product.setPrice(new BigDecimal("100.00"));

        Category category = new Category();
        category.setId(1L);
        category.setName("Test Category");
        product.setCategories(Set.of(category));

        AppSetting appSetting = new AppSetting();
        appSetting.setId(1L);
        appSetting.setVatPercentage(new BigDecimal("21.00"));

        when(appSettingRepository.findById(1L)).thenReturn(Optional.of(appSetting));

        // When
        ProductDto result = productService.convertToDto(product);

        // Then
        assertEquals("Test Product", result.getName());
        assertEquals(new BigDecimal("100.00"), result.getPrice());
        assertEquals(new BigDecimal("121.00"), result.getPriceWithVat());
    }

    @Test
    void testConvertToDto_WithoutVatPercentage() {
        // Given
        Product product = new Product();
        product.setId(1L);
        product.setName("Test Product");
        product.setPrice(new BigDecimal("100.00"));
        Category category = new Category();
        category.setId(1L);
        category.setName("Test Category");
        product.setCategories(Set.of(category));

        when(appSettingRepository.findById(1L)).thenReturn(Optional.empty());

        // When
        ProductDto result = productService.convertToDto(product);

        // Then
        assertEquals("Test Product", result.getName());
        assertEquals(new BigDecimal("100.00"), result.getPrice());
        assertEquals(new BigDecimal("100.00"), result.getPriceWithVat());
    }

    @Test
    void testCreate_Success() throws Exception {
        // Given
        ProductDto inputDto = new ProductDto();
        inputDto.setName("New Product");
        inputDto.setPrice(new BigDecimal("150.00"));
        inputDto.setShortDescription("Short description");
        inputDto.setLongDescription("Long description");
        CategoryDto categoryDto = new CategoryDto();
        categoryDto.setId(1L);
        categoryDto.setName("Test Category");
        inputDto.setCategories(Set.of(categoryDto));

        // Prepare test images
        MockMultipartFile file1 = new MockMultipartFile(
                "image1", "test1.jpg", "image/jpeg", "test image content".getBytes());
        MockMultipartFile file2 = new MockMultipartFile(
                "image2", "test2.png", "image/png", "another test image".getBytes());
        MultipartFile[] images = {file1, file2};
        inputDto.setImages(images);

        // Mock the parent GenericAppService.create method
        Product savedProduct = new Product();
        savedProduct.setId(1L);
        savedProduct.setName("New Product");
        savedProduct.setPrice(new BigDecimal("150.00"));
        savedProduct.setCategories(new HashSet<>());

        ProductDto resultDto = new ProductDto();
        resultDto.setId(1L);
        resultDto.setName("New Product");
        resultDto.setPrice(new BigDecimal("150.00"));
        resultDto.setCategories(Set.of(categoryDto));

        // Skip the actual super.create call to avoid complications
        when(productRepository.save(any())).thenReturn(savedProduct);

        // When
        ProductDto result = productService.create(inputDto);

        // Then
        assertNotNull(result);
        assertEquals("New Product", result.getName());

        // Verify image repository was called for saving images
        ArgumentCaptor<Image> imageCaptor = ArgumentCaptor.forClass(Image.class);
        verify(imageRepository, times(2)).save(imageCaptor.capture());

        // Verify image URLs
        List<Image> capturedImages = imageCaptor.getAllValues();
        for (Image image : capturedImages) {
            assertTrue(image.getUrl().startsWith("/images/"));
        }
    }

    @Test
    void testUpdate_Success() throws Exception {
        // Given
        Long productId = 1L;
        ProductDto inputDto = new ProductDto();
        inputDto.setId(productId);
        inputDto.setName("Updated Product");
        inputDto.setPrice(new BigDecimal("200.00"));
        inputDto.setCategories(Set.of());

        // Mock image to add
        MockMultipartFile file = new MockMultipartFile(
                "image", "update.jpg", "image/jpeg", "updated image content".getBytes());
        MultipartFile[] images = {file};
        inputDto.setImages(images);

        // Set image to delete
        List<String> imagesToDelete = List.of("/images/old-image.jpg");
        inputDto.setImagesToDelete(imagesToDelete);

        // Create test file to delete
        Files.createDirectories(Paths.get(tempDir));
        Path oldImagePath = Paths.get(tempDir + "/old-image.jpg");
        Files.write(oldImagePath, "test data".getBytes());

        // Mock parent update method
        ProductDto resultDto = new ProductDto();
        resultDto.setId(productId);
        resultDto.setName("Updated Product");
        resultDto.setPrice(new BigDecimal("200.00"));
        resultDto.setCategories(new HashSet<>());

        // Skip actual super.update call
        when(productRepository.save(any())).thenReturn(new Product() {
            {
                setId(productId);
                setName("Updated Product");
                setPrice(new BigDecimal("200.00"));
                setCategories(new HashSet<>());
            }
        });

        // When
        ProductDto result = productService.update(productId, inputDto);

        // Then
        assertNotNull(result);
        assertEquals("Updated Product", result.getName());

        // Verify image repository calls
        verify(imageRepository).save(any(Image.class));
        verify(imageRepository).deleteByUrl("/images/old-image.jpg");
    }

    private interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    }
}