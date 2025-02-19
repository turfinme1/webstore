package com.webstore.backoffice.crud.controllers;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.webstore.backoffice.crud.dtos.BaseDto;
import com.webstore.backoffice.crud.services.GenericAppService;
import com.webstore.backoffice.models.BaseEntity;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

//public abstract class GenericController<D extends BaseDto<E>, E extends BaseEntity<ID>, ID> {
//
//    private final GenericAppService<D, E, ID> appService;
//
//    public GenericController(GenericAppService<D, E, ID> appService) {
//        this.appService = appService;
//    }
//
//    public ResponseEntity<D> create(@RequestBody D dto) {
//        return ResponseEntity.ok(appService.create(dto));
//    }
//}

public abstract class GenericController<D extends BaseDto<E>, E extends BaseEntity<ID>, ID> {

    private final GenericAppService<D, ?, ID> service;

    protected GenericController(GenericAppService<D, ?, ID> service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    @Transactional
    public ResponseEntity<D> getById(@PathVariable ID id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @GetMapping("/filtered")
    @Transactional
    public ResponseEntity<?> findAll(@RequestParam Map<String,String> allParams) throws JsonProcessingException {
        return ResponseEntity.ok(service.findAll(allParams));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<D> create(@Valid @RequestBody D dto) {
        return ResponseEntity.ok().body(service.create(dto));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<D> update(@PathVariable ID id, @RequestBody D dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable ID id) {
        service.delete(id);
        return ResponseEntity.ok().build();
    }
}
