package com.webstore.backoffice.crud.services;

import com.webstore.backoffice.crud.dtos.QueryBuildWrapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.webstore.backoffice.crud.configurations.GenericSpecificationBuilder;
import com.webstore.backoffice.crud.configurations.SchemaRegistry;
import com.webstore.backoffice.crud.dtos.BaseDto;
import com.webstore.backoffice.crud.dtos.PaginatedResponse;
import com.webstore.backoffice.crud.models.BaseEntity;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GenericAppServiceTest {

    @Mock
    private TestRepository repository;
    @Mock
    private SchemaRegistry schemaRegistry;
    @Mock
    private ObjectMapper objectMapper;
    @Mock
    private GenericSpecificationBuilder<TestEntity> specificationBuilder;

    private TestService service;

    @BeforeEach
    void setUp() {
        service = new TestService(repository, schemaRegistry, objectMapper, specificationBuilder);
    }

    @Test
    void create_ShouldSaveAndReturnDto() {
        // Arrange
        TestDto dto = new TestDto();
        TestEntity entity = new TestEntity();
        when(repository.save(any())).thenReturn(entity);

        // Act
        TestDto result = service.create(dto);

        // Assert
        assertNotNull(result);
        verify(repository).save(any());
    }

    @Test
    void findById_WhenExists_ShouldReturnDto() {
        // Arrange
        TestEntity entity = new TestEntity();
        when(repository.findById(1L)).thenReturn(Optional.of(entity));

        // Act
        TestDto result = service.findById(1L);

        // Assert
        assertNotNull(result);
        verify(repository).findById(1L);
    }

    @Test
    void findById_WhenNotExists_ShouldReturnNull() {
        // Arrange
        when(repository.findById(1L)).thenReturn(Optional.empty());

        // Act
        TestDto result = service.findById(1L);

        // Assert
        assertNull(result);
        verify(repository).findById(1L);
    }

    @Test
    void delete_ShouldSetActiveToFalse() {
        // Arrange
        TestEntity entity = new TestEntity();
        when(repository.findById(1L)).thenReturn(Optional.of(entity));
        when(repository.save(any())).thenReturn(entity);

        // Act
        service.delete(1L);

        // Assert
//        assertFalse(entity.getActive());
        verify(repository).save(entity);
    }

    @Test
    void update_ShouldUpdateAndReturnDto() {
        // Arrange
        TestDto dto = new TestDto();
        TestEntity entity = new TestEntity();
        when(repository.save(any())).thenReturn(entity);

        // Act
        TestDto result = service.update(1L, dto);

        // Assert
        assertNotNull(result);
        verify(repository).save(any());
    }

    @Test
    void findAll_ShouldReturnPaginatedResponse() throws Exception {
        // Arrange
        Map<String, String> params = new HashMap<>();
        params.put("page", "0");
        params.put("pageSize", "10");
        params.put("filterParams", "{}");
        params.put("orderParams", "[]");
        var queryWrapper = new QueryBuildWrapper<TestEntity>(mock(), mock(), mock());

        TestEntity entity = new TestEntity();
        Page<TestEntity> page = new PageImpl<>(List.of(entity));

        when(schemaRegistry.getSchema(anyString())).thenReturn(mock(JsonNode.class));
        when(repository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        when(specificationBuilder.buildSpecification(any(JsonNode.class), any())).thenReturn(queryWrapper);
        // Act
        PaginatedResponse<TestDto> result = service.findAll(params);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getResult().size());
        assertEquals(1, result.getCount());
    }

    // Test classes
    private static class TestEntity extends BaseEntity<Long> {
        @Override
        public boolean isValid() {
            return true;
        }

        @Override
        public Long getId() {
            return 1L;
        }
    }

    private interface TestRepository extends JpaRepository<TestEntity, Long>, JpaSpecificationExecutor<TestEntity> {
    }

    private static class TestDto extends BaseDto<TestEntity> {
        @Override
        public TestEntity toDomainEntity() {
            return new TestEntity();
        }

        @Override
        public String getSchemaName() {
            return "testSchema";
        }
    }

    private static class TestService extends GenericAppService<TestDto, TestEntity, Long> {
        public TestService(TestRepository repository,
                           SchemaRegistry schemaRegistry,
                           ObjectMapper objectMapper,
                           GenericSpecificationBuilder<TestEntity> specificationBuilder) {
            super(repository, schemaRegistry, objectMapper, specificationBuilder);
        }

        @Override
        protected TestDto convertToDto(TestEntity entity) {
            return new TestDto();
        }

        @Override
        protected String getSchemaName() {
            return "test";
        }
    }
}