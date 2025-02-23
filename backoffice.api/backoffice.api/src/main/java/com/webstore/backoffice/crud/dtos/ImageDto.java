package com.webstore.backoffice.crud.dtos;

import com.webstore.backoffice.crud.constants.CrudConstants;
import com.webstore.backoffice.crud.models.Image;
import jakarta.validation.constraints.NotBlank;

public class ImageDto extends BaseDto<Image> {

    private Long id;

    @NotBlank(message = CrudConstants.PRODUCT_ID_REQUIRED)
    private Long productId;

    @NotBlank(message = CrudConstants.URL_REQUIRED)
    private String url;

    @Override
    public Image toDomainEntity() {
        Image image = new Image();
        image.setId(this.id);
        image.setUrl(this.url);
        return image;
    }

    @Override
    public String getSchemaName() {
        return CrudConstants.IMAGE_SCHEMA_NAME;
    }
}
