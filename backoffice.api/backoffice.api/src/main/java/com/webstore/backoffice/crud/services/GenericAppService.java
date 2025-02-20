package com.webstore.backoffice.crud.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.webstore.backoffice.crud.configurations.SchemaRegistry;
import com.webstore.backoffice.crud.configurations.GenericSpecificationBuilder;
import com.webstore.backoffice.crud.constants.CrudConstants;
import com.webstore.backoffice.crud.dtos.BaseDto;
import com.webstore.backoffice.crud.dtos.FilteredRequestParams;
import com.webstore.backoffice.crud.dtos.PaginatedResponse;
import com.webstore.backoffice.crud.models.BaseEntity;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import static com.webstore.backoffice.asserts.AssertUtil.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public abstract class GenericAppService<D extends BaseDto<E>, E extends BaseEntity<ID>, ID> {

    private final JpaRepository<E, ID> repository;
    private final JpaSpecificationExecutor<E> specExecutor;
    private final SchemaRegistry schemaRegistry;
    private final ObjectMapper objectMapper;
    private final GenericSpecificationBuilder<?> specificationBuilder;

    public GenericAppService(JpaRepository<E, ID> repository,
                             SchemaRegistry schemaRegistry,
                             ObjectMapper objectMapper,
                             GenericSpecificationBuilder<E> specificationBuilder) {
        this.repository = repository;
        this.specExecutor = (JpaSpecificationExecutor<E>) repository;
        this.schemaRegistry = schemaRegistry;
        this.objectMapper = objectMapper;
        this.specificationBuilder = specificationBuilder;
    }

    public D create(D dto) {
        E entity = dto.toDomainEntity();
        return convertToDto(repository.save(entity));
    }

    public D findById(ID id) {
        return repository.findById(id)
                .map(this::convertToDto)
                .orElse(null);
    }

    public void delete(ID id) {
        var entity = repository.findById(id).orElseThrow();
        entity.setActive(false);
        repository.save(entity);
    }

    public D update(ID id, D dto) {
        E entity = dto.toDomainEntity();
        entity.setId(id);
        return convertToDto(repository.save(entity));
    }

    public PaginatedResponse<D> findAll(Map<String, String> allParams) throws JsonProcessingException {
        JsonNode schema = schemaRegistry.getSchema(getSchemaName());
        var params = parseFilterParams(allParams);
        var queryWrapper = specificationBuilder.buildSpecification(schema, params);
        var result = specExecutor.findAll((Specification<E>) queryWrapper.getSpecification(), queryWrapper.getPageRequest());
        List<D> resultElements = result.getContent().stream().map(this::convertToDto).toList();
        return new PaginatedResponse<>(resultElements, result.getTotalElements());
    }

    protected abstract D convertToDto(E entity);
    protected abstract String getSchemaName();

    private FilteredRequestParams parseFilterParams(Map<String, String> allParams) throws JsonProcessingException {
        ASSERT_USER(allParams != null && allParams.containsKey(CrudConstants.FILTER_PARAM_PAGE), CrudConstants.PAGE_REQUIRED,
                new HashMap<>() {{
                    put("code", "APP_SRV_00002_PAGE_REQUIRED");
                    put("long_description", CrudConstants.PAGE_REQUIRED);
                }});

        ASSERT_USER(allParams.containsKey(CrudConstants.FILTER_PARAM_SIZE), CrudConstants.PAGE_SIZE_REQUIRED,
                new HashMap<>() {{
                    put("code", "APP_SRV_00003_PAGE_SIZE_REQUIRED");
                    put("long_description", CrudConstants.PAGE_SIZE_REQUIRED);
                }});

        ASSERT_USER(allParams.containsKey(CrudConstants.FILTER_PARAM_FILTERS), CrudConstants.FILTER_PARAMS_REQUIRED,
                new HashMap<>() {{
                    put("code", "APP_SRV_00004_FILTER_PARAMS_REQUIRED");
                    put("long_description", CrudConstants.FILTER_PARAMS_REQUIRED);
                }});

        ASSERT_USER(allParams.containsKey(CrudConstants.FILTER_PARAM_ORDERS), CrudConstants.ORDER_PARAMS_REQUIRED,
                new HashMap<>() {{
                    put("code", "APP_SRV_00005_ORDER_PARAMS_REQUIRED");
                    put("long_description", CrudConstants.ORDER_PARAMS_REQUIRED);
                }});
        FilteredRequestParams params = new FilteredRequestParams();
        params.setPage(Integer.parseInt(allParams.getOrDefault(CrudConstants.FILTER_PARAM_PAGE, CrudConstants.FILTER_PARAM_PAGE_DEFAULT)));
        params.setPageSize(Integer.parseInt(allParams.getOrDefault(CrudConstants.FILTER_PARAM_SIZE, CrudConstants.FILTER_PARAM_SIZE_DEFAULT)));
        params.setFilterParams(objectMapper.readValue(allParams.get(CrudConstants.FILTER_PARAM_FILTERS), new TypeReference<Map<String, Object>>(){}));
        params.setOrderParams(objectMapper.readValue(allParams.get(CrudConstants.FILTER_PARAM_ORDERS), new com.fasterxml.jackson.core.type.TypeReference<List<List<String>>>() {}));
        return params;
    }
}
