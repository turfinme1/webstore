package com.webstore.backoffice.configurations;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SchemaRegistry {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, JsonNode> schemas = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() throws IOException {
        ResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath:schemas/*.json");

        for (Resource resource : resources) {
            String filename = resource.getFilename();
            String entityName = filename.substring(0, filename.lastIndexOf('.'));
            schemas.put(entityName, objectMapper.readTree(resource.getInputStream()));
        }
    }

    public JsonNode getSchema(String entityName) {
        return schemas.get(entityName).deepCopy();
    }
}
