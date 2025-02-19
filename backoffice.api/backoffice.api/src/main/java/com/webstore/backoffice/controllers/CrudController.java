package com.webstore.backoffice.controllers;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.webstore.backoffice.dtos.user.UserDTO;
import com.webstore.backoffice.dtos.user.UserMutateDTO;
import com.webstore.backoffice.services.CrudService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/crud2")
public class CrudController {
    private final CrudService crudService;

    public CrudController(CrudService crudService) {
        this.crudService = crudService;
    }

//    @GetMapping("/{entity}")
//    public List<PromotionsView> getAllEntities() {
//        return crudService.getAllEntities();
//    }

//    @GetMapping("/{entity}/{id}")
//    public PromotionsView getEntityById(@PathVariable Long id) {

//    ASSERT_USER(false, "User not found", new HashMap<>() {{
//            put("code", "USER_CONDITION_FAILED");
//            put("long_description", "User not found");
//        }});
//        return crudService.getEntityById(id);
//    }

    @GetMapping("/{entity}/filtered")
    public ResponseEntity<?> getAllEntitiesFiltered(@PathVariable String entity, @RequestParam Map<String,String> allParams) throws JsonProcessingException {
        var body = crudService.getAllEntitiesFiltered(entity, allParams);
        return ResponseEntity.status(HttpStatus.OK).body(body);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/users/{id}")
    public ResponseEntity<?> getEntityById(@PathVariable Long id) {
        Optional<UserDTO> entity = crudService.getEntityById(id);
        return ResponseEntity.status(HttpStatus.OK).body(entity.get());
    }

    @PostMapping("/users")
    public ResponseEntity<?> createEntity(@Valid @RequestBody UserMutateDTO entityDTO) {
        Optional<UserDTO> entity = crudService.createEntity(entityDTO);
        return ResponseEntity.status(HttpStatus.OK).body(entity.get());
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateEntity(@PathVariable Long id, @Valid @RequestBody UserMutateDTO entityDTO) {
        Optional<UserDTO> entity = crudService.updateEntity(id, entityDTO);
        return ResponseEntity.status(HttpStatus.OK).body(entity.get());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?>  deletePromotion(@PathVariable Long id) {
        crudService.deleteEntity(id);
        return ResponseEntity.noContent().build();
    }
}
