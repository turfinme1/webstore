package com.webstore.backoffice.crud.configurations;

import com.fasterxml.jackson.databind.JsonNode;
import com.webstore.backoffice.crud.dtos.QueryBuildWrapper;
import com.webstore.backoffice.crud.dtos.FilteredRequestParams;
import com.webstore.backoffice.crud.models.BaseEntity;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GenericSpecificationBuilder<T extends BaseEntity<?>>  {

    public QueryBuildWrapper<T> buildSpecification(JsonNode schema, FilteredRequestParams params) {
        var filterParams = params.getFilterParams();
        Specification<T> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filterParams != null && !filterParams.isEmpty()) {
                filterParams.forEach((field, value) -> {
                    JsonNode propertySchema = schema.get("properties").get(field);
                    if (propertySchema != null) {
                        addPredicate(root, criteriaBuilder, field, value, propertySchema)
                                .ifPresent(predicates::add);
                    }
                });
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };

        Random random = new Random();
        int randomPage = random.nextInt(130) + 1;
        Sort sort = buildSort(params.getOrderParams());
        PageRequest pageRequest = PageRequest.of(randomPage - 1, params.getPageSize(), sort);

        return new QueryBuildWrapper<>(specification, sort, pageRequest);
    }

    private Optional<Predicate> addPredicate(Root<T> root, CriteriaBuilder cb,
                                             String field, Object value, JsonNode propertySchema) {
        if (value == null) {
            return Optional.empty();
        }

        Path<?> path;
        if (field.contains("id")) {
            String entityField = toCamelCase(field.replace("id", ""));
            path = root.get(entityField).get("id");
        } else {
            String entityField = toCamelCase(field);
            path = root.get(entityField);
        }

        boolean isIntegerField = false;
        if (propertySchema.has("type")) {
            JsonNode typeNode = propertySchema.get("type");
            if (typeNode.isArray()) {
                for (JsonNode node : typeNode) {
                    if ("integer".equalsIgnoreCase(node.asText()) || "number".equalsIgnoreCase(node.asText())) {
                        isIntegerField = true;
                        break;
                    }
                }
            }
        }

        if (isIntegerField) {
            Number numberValue = parseNumber(value);
            return Optional.of(cb.equal(path, numberValue));
        }

        if (value instanceof List) {
            return handleListValue(cb, path, (List<?>) value);
        } else if (propertySchema.has("format")) {
            return handleFormattedField(cb, path, value, propertySchema.get("format").asText());
        } else if (value instanceof String) {
            return handleStringValue(cb, path, (String) value);
        } else if (value instanceof Map) {
            return handleRangeValue(cb, path, (Map<String, Object>) value);
        } else {
            return Optional.of(cb.equal(path, value));
        }
    }

    private Optional<Predicate> handleListValue(CriteriaBuilder cb, Path<?> path, List<?> values) {
//        List<Predicate> predicates = values.stream()
//                .map(value -> cb.equal(cb.lower(path.as(String.class)),
//                        value.toString().toLowerCase()))
//                .toList();
        // create predicate property in the list of values
        Path<String> namePath = path.get("name");
        return Optional.of(namePath.in(values));
//        return Optional.of(cb.or(predicates.toArray(new Predicate[0])));
    }

    private Optional<Predicate> handleStringValue(CriteriaBuilder cb, Path<?> path, String value) {
        return Optional.of(cb.like(
                cb.lower(path.as(String.class)),
                "%" + value.toLowerCase() + "%"
        ));
    }

    private Optional<Predicate> handleFormattedField(CriteriaBuilder cb, Path<?> path,
                                                     Object value, String format) {
        return switch (format) {
            case "date-time" -> handleDateTimeField(cb, path, value);
            case "date-time-no-year" -> handleDateTimeNoYearField(cb, path, value);
            default -> Optional.empty();
        };
    }

    private Optional<Predicate> handleDateTimeField(CriteriaBuilder cb, Path<?> path, Object value) {
        if (value instanceof Map) {
            Map<String, Object> dateRange = (Map<String, Object>) value;
            List<Predicate> predicates = new ArrayList<>();

            if (dateRange.containsKey("min")) {
                LocalDateTime minDate = parseDateTime(dateRange.get("min"));
                predicates.add(cb.greaterThanOrEqualTo(path.as(LocalDateTime.class), minDate));
            }

            if (dateRange.containsKey("max")) {
                LocalDateTime maxDate = parseDateTime(dateRange.get("max"));
                predicates.add(cb.lessThanOrEqualTo(path.as(LocalDateTime.class), maxDate));
            }

            return predicates.isEmpty() ? Optional.empty() :
                    Optional.of(cb.and(predicates.toArray(new Predicate[0])));
        } else {
            LocalDateTime date = parseDateTime(value);
            return Optional.of(cb.equal(path, date));
        }
    }

    private Optional<Predicate> handleDateTimeNoYearField(CriteriaBuilder cb, Path<?> path, Object value) {
        LocalDateTime date = parseDateTime(value);
        return Optional.of(cb.and(
                cb.equal(cb.function("EXTRACT", Integer.class, cb.literal("MONTH"), path), date.getMonthValue()),
                cb.equal(cb.function("EXTRACT", Integer.class, cb.literal("DAY"), path), date.getDayOfMonth())
        ));
    }

    private Optional<Predicate> handleRangeValue(CriteriaBuilder cb, Path<?> path, Map<String, Object> rangeValue) {
        List<Predicate> predicates = new ArrayList<>();

        if (rangeValue.containsKey("min")) {
            Number minValue = parseNumber(rangeValue.get("min"));
            // Cast the path to the correct comparable type
            @SuppressWarnings("unchecked")
            Path<Comparable> comparablePath = (Path<Comparable>) path;
            predicates.add(cb.greaterThanOrEqualTo(comparablePath, (Comparable) minValue));
        }

        if (rangeValue.containsKey("max")) {
            Number maxValue = parseNumber(rangeValue.get("max"));
            // Cast the path to the correct comparable type
            @SuppressWarnings("unchecked")
            Path<Comparable> comparablePath = (Path<Comparable>) path;
            predicates.add(cb.lessThanOrEqualTo(comparablePath, (Comparable) maxValue));
        }

        return predicates.isEmpty() ? Optional.empty() :
                Optional.of(cb.and(predicates.toArray(new Predicate[0])));
    }

    private LocalDateTime parseDateTime(Object value) {
        // Add your datetime parsing logic here
        // This is a placeholder - implement based on your date format
        return LocalDateTime.parse(value.toString());
    }

    private Number parseNumber(Object value) {
        if (value instanceof Number) {
            return (Number) value;
        }
        return Double.parseDouble(value.toString());
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
}
