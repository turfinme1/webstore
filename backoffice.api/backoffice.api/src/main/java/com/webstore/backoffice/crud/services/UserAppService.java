package com.webstore.backoffice.crud.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.webstore.backoffice.configurations.SchemaRegistry;
import com.webstore.backoffice.crud.configurations.GenericSpecificationBuilder;
import com.webstore.backoffice.crud.dtos.UserDto;
import com.webstore.backoffice.crud.mappers.UserMapper;
import com.webstore.backoffice.models.User;
import com.webstore.backoffice.repositories.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserAppService extends GenericAppService<UserDto, User, Long> {

    private final BCryptPasswordEncoder bCryptPasswordEncoder;
    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public UserAppService(UserRepository repository,
                          SchemaRegistry schemaRegistry,
                          ObjectMapper objectMapper,
                          GenericSpecificationBuilder<User> specificationBuilder,
                          BCryptPasswordEncoder bCryptPasswordEncoder, UserRepository userRepository,
                          UserMapper userMapper) {
        super(repository, schemaRegistry, objectMapper, specificationBuilder);
        this.bCryptPasswordEncoder = bCryptPasswordEncoder;
        this.userRepository = userRepository;
        this.userMapper = userMapper;
    }

    @Override
    protected UserDto convertToDto(User entity) {
       return new UserDto(entity);

    }

    @Override
    protected String getSchemaName() {
        return "users";
    }

    @Override
    public UserDto update(Long id, UserDto dto) {
        dto.setPasswordHash(bCryptPasswordEncoder.encode(dto.getPasswordHash()));
        dto.setId(id);
        User entity = userMapper.toDomainEntity(dto);
        User updated = userRepository.save(entity);
        return convertToDto(updated);
    }

    @Override
    public UserDto create(UserDto dto) {
        dto.setPasswordHash(bCryptPasswordEncoder.encode(dto.getPasswordHash()));
        var entity = userMapper.toDomainEntity(dto);
        var savedEntity = userRepository.save(entity);
        return convertToDto(savedEntity);
    }
}
