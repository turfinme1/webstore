package com.webstore.backoffice.crud.mappers;

import com.webstore.backoffice.crud.dtos.UserDto;
import com.webstore.backoffice.models.Gender;
import com.webstore.backoffice.models.IsoCountryCode;
import com.webstore.backoffice.models.User;
import com.webstore.backoffice.repositories.GenderRepository;
import com.webstore.backoffice.repositories.IsoCountryCodeRepository;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.springframework.beans.factory.annotation.Autowired;

@Mapper(componentModel = "spring")
public abstract class UserMapper {

    @Autowired
    protected IsoCountryCodeRepository isoCountryCodeRepository;

    @Autowired
    protected GenderRepository genderRepository;

    // Map from UserDto to User. We resolve nested fields using custom methods.
    @Mapping(target = "country", source = "countryId", qualifiedByName = "resolveCountry")
    @Mapping(target = "gender", source = "genderId", qualifiedByName = "resolveGender")
    @Mapping(target = "isoCountryCode", source = "isoCountryCodeId", qualifiedByName = "resolveIsoCountryCode")
    public abstract User toDomainEntity(UserDto dto);

    // Map from User to UserDto. Use expressions to check for null before calling getters.
    @Mapping(target = "countryId", expression = "java(user.getCountry() != null ? user.getCountry().getId() : null)")
    @Mapping(target = "genderId", expression = "java(user.getGender() != null ? user.getGender().getId() : null)")
    @Mapping(target = "isoCountryCodeId", expression = "java(user.getIsoCountryCode() != null ? user.getIsoCountryCode().getId() : null)")
    public abstract UserDto toDto(User user);

    // Custom method to resolve the country by its ID
    @Named("resolveCountry")
    public IsoCountryCode resolveCountry(Long countryId) {
        if (countryId == null) {
            return null;
        }
        return isoCountryCodeRepository.findById(countryId).orElse(null);
    }

    // Custom method to resolve the gender by its ID
    @Named("resolveGender")
    public Gender resolveGender(Long genderId) {
        if (genderId == null) {
            return null;
        }
        return genderRepository.findById(genderId).orElse(null);
    }

    @Named("resolveIsoCountryCode")
    public IsoCountryCode resolveIsoCountryCode(Long isoCountryCodeId) {
        if (isoCountryCodeId == null) {
            return null;
        }
        return isoCountryCodeRepository.findById(isoCountryCodeId).orElse(null);
    }
}

