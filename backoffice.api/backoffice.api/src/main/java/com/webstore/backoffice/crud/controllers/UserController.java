package com.webstore.backoffice.crud.controllers;

import com.webstore.backoffice.crud.dtos.UserDto;
import com.webstore.backoffice.crud.services.UserAppService;
import com.webstore.backoffice.crud.models.User;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/crud/users")
public class UserController extends GenericController<UserDto, User, Long> {

    public UserController(UserAppService service) {
        super(service);
    }
}
