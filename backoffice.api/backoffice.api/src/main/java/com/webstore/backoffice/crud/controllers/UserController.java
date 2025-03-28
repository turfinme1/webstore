package com.webstore.backoffice.crud.controllers;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.webstore.backoffice.asserts.dtos.CustomErrorResponse;
import com.webstore.backoffice.crud.dtos.UserDto;
import com.webstore.backoffice.crud.services.UserService;
import com.webstore.backoffice.crud.models.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/crud/users")
@PreAuthorize("hasRole('ROLE_ADMIN')")
public class UserController extends GenericController<UserDto, User, Long> {

    public UserController(UserService service) {
        super(service);
    }

    @Operation
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User found",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = UserDto.class))
                    }),
            @ApiResponse(responseCode = "400", description = "Invalid input",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class ))
                    }),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class))
                    })
    })
    @Override
    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getById(@PathVariable Long id) {
        return super.getById(id);
    }

    @Operation
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Users found",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = UserDto.class))
                    }),
            @ApiResponse(responseCode = "400", description = "Invalid input",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class ))
                    }),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class))
                    })
    })
    @Override
    @GetMapping("/filtered")
    public ResponseEntity<?> findAll(@RequestParam Map<String, String> allParams) throws JsonProcessingException {
        return super.findAll(allParams);
    }

    @Operation
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Users found",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = UserDto.class))
                    }),
            @ApiResponse(responseCode = "400", description = "Invalid input",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class ))
                    }),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class))
                    })
    })
    @Override
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<UserDto> create(UserDto dto) {
        return super.create(dto);
    }

    @Operation
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Users found",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = UserDto.class))
                    }),
            @ApiResponse(responseCode = "400", description = "Invalid input",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class ))
                    }),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class))
                    })
    })
    @Override
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<UserDto> update(Long aLong, UserDto dto) {
        return super.update(aLong, dto);
    }

    @Operation
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User deleted"),
            @ApiResponse(responseCode = "400", description = "Invalid input",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class ))
                    }),
            @ApiResponse(responseCode = "500", description = "Internal server error",
                    content = {
                            @Content(mediaType = "application/json", schema = @Schema(implementation = CustomErrorResponse.class))
                    })
    })
    @Override
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return super.delete(id);
    }
}
