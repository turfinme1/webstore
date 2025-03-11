package com.webstore.backoffice.crud.controllers;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.webstore.backoffice.crud.dtos.BaseDto;
import com.webstore.backoffice.crud.services.GenericAppService;
import com.webstore.backoffice.crud.models.BaseEntity;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@CrossOrigin(origins = "*", allowedHeaders = "*")
public abstract class GenericController<D extends BaseDto<E>, E extends BaseEntity<ID>, ID> {

    private final GenericAppService<D, ?, ID> service;

    protected GenericController(GenericAppService<D, ?, ID> service) {
        this.service = service;
    }

    @Transactional
    @GetMapping("/{id}")
    public ResponseEntity<D> getById(@PathVariable ID id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @Transactional
    @GetMapping("/filtered")
    public ResponseEntity<?> findAll(@RequestParam Map<String,String> allParams) throws JsonProcessingException {
        return ResponseEntity.ok(service.findAll(allParams));
    }

    @Transactional
    @PostMapping
    public ResponseEntity<D> create(@Valid @RequestBody D dto) {
        return ResponseEntity.ok().body(service.create(dto));
    }

    @Transactional
    @PutMapping("/{id}")
    public ResponseEntity<D> update(@PathVariable ID id,@Valid @RequestBody D dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @Transactional
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable ID id) {
        service.delete(id);
        return ResponseEntity.ok().build();
    }
}
