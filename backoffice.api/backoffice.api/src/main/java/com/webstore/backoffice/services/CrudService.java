package com.webstore.backoffice.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.webstore.backoffice.configurations.SchemaRegistry;
import com.webstore.backoffice.dtos.FilteredRequestParams;
import com.webstore.backoffice.dtos.PaginatedResponse;
import com.webstore.backoffice.dtos.user.UserDTO;
import com.webstore.backoffice.dtos.user.UserMutateDTO;
import com.webstore.backoffice.models.Product;
import com.webstore.backoffice.models.User;
import com.webstore.backoffice.repositories.GenderRepository;
import com.webstore.backoffice.repositories.IsoCountryCodeRepository;
import com.webstore.backoffice.repositories.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class CrudService {

    private final UserRepository userRepository;
    private final GenderRepository genderRepository;
    private final IsoCountryCodeRepository isoCountryCodeRepository;
    private final BCryptPasswordEncoder bCryptPasswordEncoder;
    private final SchemaRegistry schemaRegistry;
    private final ObjectMapper objectMapper;
    private final Map<String, JpaSpecificationExecutor<?>> repositories;
    private final SpecificationBuilder<?> specificationBuilder;
    private final Map<Class<?>, JpaSpecificationExecutor<?>> typedRepositories;

    public CrudService(UserRepository userRepository,
                       GenderRepository genderRepository,
                       IsoCountryCodeRepository isoCountryCodeRepository,
                       BCryptPasswordEncoder bCryptPasswordEncoder,
                       SchemaRegistry schemaRegistry,
                       ObjectMapper objectMapper,
                       Map<String, JpaSpecificationExecutor<?>> repositories,
                       SpecificationBuilder<?> specificationBuilder,
                       Map<Class<?>, JpaSpecificationExecutor<?>> typedRepositories) {
        this.userRepository = userRepository;
        this.genderRepository = genderRepository;
        this.isoCountryCodeRepository = isoCountryCodeRepository;
        this.bCryptPasswordEncoder = bCryptPasswordEncoder;
        this.schemaRegistry = schemaRegistry;
        this.objectMapper = objectMapper;
        this.repositories = repositories;
        this.specificationBuilder = specificationBuilder;
        this.typedRepositories = typedRepositories;
    }

    public PaginatedResponse<?> getAllEntitiesFiltered(String entity, Map<String, String> allParams) throws JsonProcessingException {
        ///  assert entity exists in schema registry

        FilteredRequestParams params = new FilteredRequestParams();
        var pageNumber = Integer.parseInt(allParams.getOrDefault("pageNumber", "1"));
        var pageSize = Integer.parseInt(allParams.getOrDefault("pageSize", "10"));
        params.setPage(Integer.parseInt(allParams.getOrDefault("pageNumber", "1")));
        params.setPageSize(Integer.parseInt(allParams.getOrDefault("pageSize", "10")));
        params.setFilterParams(objectMapper.readValue(allParams.get("filterParams"), new TypeReference<Map<String, Object>>(){}));
        params.setOrderParams(objectMapper.readValue(allParams.get("orderParams"), new com.fasterxml.jackson.core.type.TypeReference<List<List<String>>>() {}));

        JsonNode schema = schemaRegistry.getSchema(entity);
        Class<?> entityClass = resolveEntityClass(entity);

        Specification<?> specification = specificationBuilder.buildSpecification(
                schemaRegistry.getSchema(entity),
                params.getFilterParams()
        );

        Sort sort = buildSort(params.getOrderParams());

        JpaSpecificationExecutor<Object> repository = (JpaSpecificationExecutor<Object>) typedRepositories.get(entityClass);


        PageRequest pageRequest = PageRequest.of(
                params.getPage() - 1,
                params.getPageSize(),
                sort
        );

        Page<Object> result = repository.findAll((Specification<Object>) specification, pageRequest);
        List<UserDTO> userDTOs = result.getContent().stream()
                .map(object -> new UserDTO((User) object))
                .toList();

        return new PaginatedResponse<>(userDTOs, result.getTotalElements());
    }

    private Sort buildSort(List<List<String>> orderParams) {
        if (orderParams.isEmpty()) {
            return Sort.by("id").ascending();
        }

        List<Sort.Order> orders = orderParams.stream()
                .map(params -> {
                    String property = params.get(0);
                    String direction = params.get(1);
                    // Convert the property from snake_case to camelCase:
                    property = toCamelCase(property);
                    return direction.equalsIgnoreCase("desc")
                            ? Sort.Order.desc(property)
                            : Sort.Order.asc(property);
                })
                .collect(Collectors.toList());

        return Sort.by(orders);
    }

    private String toCamelCase(String snakeCase) {
        String[] parts = snakeCase.split("_");
        if (parts.length == 0) return snakeCase;
        StringBuilder camelCase = new StringBuilder(parts[0]);
        for (int i = 1; i < parts.length; i++) {
            if (!parts[i].isEmpty()) {
                camelCase.append(parts[i].substring(0, 1).toUpperCase()).append(parts[i].substring(1));
            }
        }
        return camelCase.toString();
    }
    private Class<?> resolveEntityClass(String entity) {
        return switch (entity.toLowerCase()) {
            case "users" -> User.class;
            case "products" -> Product.class;
            default -> throw new IllegalArgumentException("Unknown entity: " + entity);
        };
    }

    public Optional<UserDTO> getEntityById(Long id) {
        User userEntity = userRepository.findById(id)
                .map(user -> {
                    if (user.getIsoCountryCode() != null) user.getIsoCountryCode().getId();
                    if (user.getCountry() != null) user.getCountry().getId();
                    if (user.getGender() != null) user.getGender().getId();
                    return user;
                })
                .orElse(null);

        return Optional.of(new UserDTO(userEntity));
    }

    public Optional<UserDTO> createEntity(UserMutateDTO entityDTO) {
        User user = new User();
        user.setFirstName(entityDTO.getFirstName());
        user.setLastName(entityDTO.getLastName());
        user.setEmail(entityDTO.getEmail());
        user.setPhone(entityDTO.getPhone());
        user.setBirthDate(entityDTO.getBirthDate());
        user.setAddress(entityDTO.getAddress());
        user.setIsEmailVerified(entityDTO.getIsEmailVerified());

        var isoCountryCode = isoCountryCodeRepository.findById(entityDTO.getIsoCountryCodeId());
        user.setIsoCountryCode(isoCountryCode.get());

        var country = isoCountryCodeRepository.findById(entityDTO.getCountryId());
        user.setCountry(country.get());

        var gender = genderRepository.findById(entityDTO.getGenderId());
        user.setGender(gender.get());

        var password = entityDTO.getPasswordHash();
        var passwordHash = bCryptPasswordEncoder.encode(password);
        user.setPasswordHash(passwordHash);

        return Optional.of(new UserDTO(userRepository.save(user)));
    }

    public Optional<UserDTO> updateEntity(Long id, UserMutateDTO entityDTO) {
        return userRepository.findById(id)
                .map(user -> {
                    if (entityDTO.getFirstName() != null) {
                        user.setFirstName(entityDTO.getFirstName());
                    }
                    if (entityDTO.getLastName() != null) {
                        user.setLastName(entityDTO.getLastName());
                    }
                    if (entityDTO.getEmail() != null) {
                        user.setEmail(entityDTO.getEmail());
                    }
                    if (entityDTO.getPhone() != null) {
                        user.setPhone(entityDTO.getPhone());
                    }
                    if (entityDTO.getBirthDate() != null) {
                        user.setBirthDate(entityDTO.getBirthDate());
                    }
                    if (entityDTO.getAddress() != null) {
                        user.setAddress(entityDTO.getAddress());
                    }
                    if (entityDTO.getIsEmailVerified() != null) {
                        user.setIsEmailVerified(entityDTO.getIsEmailVerified());
                    }

                    isoCountryCodeRepository.findById(entityDTO.getIsoCountryCodeId())
                            .ifPresent(user::setIsoCountryCode);
                    isoCountryCodeRepository.findById(entityDTO.getCountryId())
                            .ifPresent(user::setCountry);
                    genderRepository.findById(entityDTO.getGenderId())
                            .ifPresent(user::setGender);

                    if (entityDTO.getPasswordHash() != null && !entityDTO.getPasswordHash().isEmpty()) {
                        String hashedPassword = bCryptPasswordEncoder.encode(entityDTO.getPasswordHash());
                        user.setPasswordHash(hashedPassword);
                    }

                    User updatedUser = userRepository.save(user);
                    return new UserDTO(updatedUser);
                });
    }

    public void deleteEntity(Long id) {
        userRepository.findById(id)
                .ifPresent(user -> {
                    user.setIsActive(false);
                    userRepository.save(user);
                });
    }
}
