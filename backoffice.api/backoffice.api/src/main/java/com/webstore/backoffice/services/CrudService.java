package com.webstore.backoffice.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.webstore.backoffice.configurations.SchemaRegistry;
import com.webstore.backoffice.dtos.user.UserDTO;
import com.webstore.backoffice.dtos.user.UserMutateDTO;
import com.webstore.backoffice.models.User;
import com.webstore.backoffice.repositories.GenderRepository;
import com.webstore.backoffice.repositories.IsoCountryCodeRepository;
import com.webstore.backoffice.repositories.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CrudService {

    private final UserRepository userRepository;
    private final GenderRepository genderRepository;
    private final IsoCountryCodeRepository isoCountryCodeRepository;
    private final BCryptPasswordEncoder bCryptPasswordEncoder;
    private final SchemaRegistry schemaRegistry;

    public CrudService(UserRepository userRepository,
                       GenderRepository genderRepository,
                       IsoCountryCodeRepository isoCountryCodeRepository,
                       BCryptPasswordEncoder bCryptPasswordEncoder,
                       SchemaRegistry schemaRegistry) {
        this.userRepository = userRepository;
        this.genderRepository = genderRepository;
        this.isoCountryCodeRepository = isoCountryCodeRepository;
        this.bCryptPasswordEncoder = bCryptPasswordEncoder;
        this.schemaRegistry = schemaRegistry;
    }

    public Optional<?> getAllEntitiesFiltered(String entity, Map<String, String> allParams) {
        return Optional.empty();
    }

    public void buildQuery(String entityName, FilterRequest request) {
        JsonNode schema = schemaRegistry.getSchema(entityName);
        JsonNode properties = schema.get("properties");

        List<Object> params = new ArrayList<>();
        List<String> conditions = new ArrayList<>();

        // Process filters
        request.getFilterParams().forEach((field, value) -> {
            JsonNode fieldSchema = properties.get(field);
            if (fieldSchema != null) {
                processFilter(field, value, fieldSchema, conditions, params);
            }
        });

        // Build base query from schema
        String view = schema.get("views").asText();
        String orderBy = buildOrderBy(request, schema);

        String baseQuery = String.format("SELECT * FROM %s", view);
        String whereClause = conditions.isEmpty() ? "" : "WHERE " + String.join(" AND ", conditions);
        String paginatedQuery = String.format("%s %s ORDER BY %s LIMIT ? OFFSET ?",
                baseQuery, whereClause, orderBy);

        String countQuery = String.format("SELECT COUNT(*) FROM %s %s", view, whereClause);

    }

    private void processFilter(String field,
                               Object value,
                               JsonNode fieldSchema,
                               List<String> conditions,
                               List<Object> params) {

        String format = fieldSchema.path("format").asText();
        String type = fieldSchema.path("type").asText();

        if (format.equals("date-time-no-year")) {
            conditions.add(String.format(
                    "(EXTRACT(MONTH FROM %1$s), EXTRACT(DAY FROM %1$s) = " +
                            "(EXTRACT(MONTH FROM ?::date), EXTRACT(DAY FROM ?::date))", field));
            params.add(value);
            params.add(value);
        }
        else if (format.equals("date-time")) {
            // Handle date range logic
        }
        else if (type.equals("string")) {
            conditions.add(String.format("LOWER(%s) LIKE LOWER(?)", field));
            params.add("%" + value + "%");
        }
        // Add other type handlers...
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
