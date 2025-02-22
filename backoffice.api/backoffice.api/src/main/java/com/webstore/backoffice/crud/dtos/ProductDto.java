package com.webstore.backoffice.crud.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.webstore.backoffice.crud.constants.CrudConstants;
import com.webstore.backoffice.crud.models.Category;
import com.webstore.backoffice.crud.models.Image;
import com.webstore.backoffice.crud.models.Product;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class ProductDto extends BaseDto<Product> {

    private Long id;

    @NotBlank(message = CrudConstants.NAME_REQUIRED)
    private String name;

    @NotBlank(message = CrudConstants.PRICE_REQUIRED)
    private BigDecimal price;

    @NotBlank(message = CrudConstants.SHORT_DESCRIPTION_REQUIRED)
    @JsonProperty("short_description")
    private String shortDescription;

    @NotBlank(message = CrudConstants.LONG_DESCRIPTION_REQUIRED)
    @JsonProperty("long_description")
    private String longDescription;

    @NotBlank(message = CrudConstants.IMAGE_REQUIRED)
    private MultipartFile[] images;

    @NotBlank(message = CrudConstants.CATEGORIES_REQUIRED)
    private Set<CategoryDto> categories;

    private List<String> imageUrls;

    private List<String> imagesToDelete;

    private String code;

    private BigDecimal priceWithVat;

    public ProductDto(Product product, BigDecimal vatPercentage) {
        this.id = product.getId();
        this.name = product.getName();
        this.price = product.getPrice();
        this.shortDescription = product.getShortDescription();
        this.longDescription = product.getLongDescription();
        this.categories = product.getCategories()
                .stream().map(category -> new CategoryDto() {
                    {
                        setId(category.getId());
                        setName(category.getName());
                    }
                })
                .collect(Collectors.toSet());
        this.imageUrls = product.getImages()
                .stream().map(Image::getUrl)
                .collect(Collectors.toList());
        this.code = product.getCode();
        this.priceWithVat = product.getPrice().multiply(
                BigDecimal.ONE.add(
                        vatPercentage.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)
                )
        ).setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    public Product toDomainEntity() {
        Product product = new Product();
        product.setId(this.id);
        product.setName(this.name);
        product.setPrice(this.price);
        product.setShortDescription(this.shortDescription);
        product.setLongDescription(this.longDescription);
        product.setCategories(this.categories
                .stream().map(category -> new Category() {
                    {
                        setId(category.getId());
                        setName(category.getName());
                    }
                })
                .collect(Collectors.toSet()));
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

    public MultipartFile[] getImages() {
        return images;
    }

    public void setImages(MultipartFile[] images) {
        this.images = images;
    }

    public @NotBlank(message = CrudConstants.CATEGORIES_REQUIRED) Set<CategoryDto> getCategories() {
        return categories;
    }

    public void setCategories(@NotBlank(message = CrudConstants.CATEGORIES_REQUIRED) Set<CategoryDto> categories) {
        this.categories = categories;
    }

    public List<String> getImagesToDelete() {
        return imagesToDelete;
    }

    public void setImagesToDelete(List<String> imagesToDelete) {
        this.imagesToDelete = imagesToDelete;
    }

    public List<String> getImageUrls() {
        return imageUrls;
    }

    public void setImageUrls(List<String> imageUrls) {
        this.imageUrls = imageUrls;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public BigDecimal getPriceWithVat() {
        return priceWithVat;
    }

    public void setPriceWithVat(BigDecimal priceWithVat) {
        this.priceWithVat = priceWithVat;
    }

    public ProductDto() {
    }
}
