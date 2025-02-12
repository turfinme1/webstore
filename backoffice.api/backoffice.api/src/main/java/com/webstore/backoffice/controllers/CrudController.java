package com.webstore.backoffice.controllers;

import com.webstore.backoffice.dtos.UserDTO;
import com.webstore.backoffice.models.User;
import com.webstore.backoffice.services.CrudService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class CrudController {
    private final CrudService crudService;

    public CrudController(CrudService crudService) {
        this.crudService = crudService;
    }

//    @GetMapping("/{entity}")
//    public List<PromotionsView> getAllEntities() {
//        return crudService.getAllEntities();
//    }
//
//    @GetMapping("/{entity}/{id}")
//    public PromotionsView getEntityById(@PathVariable Long id) {
//        return crudService.getEntityById(id);
//    }

    @GetMapping("/users/{id}")
    public UserDTO getEntityById(@PathVariable Long id) {
        return crudService.getEntityById(id);
    }

//    @PostMapping("/{entity}")
//    public PromotionsView createEntity(@RequestBody PromotionsView promotion) {
//        return crudService.createEntity(promotion);
//    }
//
//    @PutMapping("/{entity}/{id}")
//    public PromotionsView updateEntity(@PathVariable Long id, @RequestBody PromotionsView promotion) {
//        return crudService.updateEntity(id, promotion);
//    }
//
//    @DeleteMapping("/{entity}/{id}")
//    public void deletePromotion(@PathVariable Long id) {
//        crudService.deleteEntity(id);
//    }
}
