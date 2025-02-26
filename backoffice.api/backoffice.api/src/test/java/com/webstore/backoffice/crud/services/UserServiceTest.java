package com.webstore.backoffice.crud.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.webstore.backoffice.crud.configurations.GenericSpecificationBuilder;
import com.webstore.backoffice.crud.configurations.SchemaRegistry;
import com.webstore.backoffice.crud.constants.CrudConstants;
import com.webstore.backoffice.crud.dtos.UserDto;
import com.webstore.backoffice.crud.mappers.UserMapper;
import com.webstore.backoffice.crud.models.User;

import com.webstore.backoffice.crud.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private SchemaRegistry schemaRegistry;
    @Mock
    private ObjectMapper objectMapper;
    @Mock
    private GenericSpecificationBuilder<User> specificationBuilder;
    @Mock
    private BCryptPasswordEncoder bCryptPasswordEncoder;
    @Mock
    private UserMapper userMapper;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(
                userRepository,
                schemaRegistry,
                objectMapper,
                specificationBuilder,
                bCryptPasswordEncoder,
                userRepository,
                userMapper
        );
    }

    @Test
    void convertToDto_ShouldConvertUserToDto() {
        // Arrange
        User user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        user.setPasswordHash("hashedPassword");

        // Act
        UserDto result = userService.convertToDto(user);

        // Assert
        assertNotNull(result);
        assertEquals(user.getId(), result.getId());
        assertEquals(user.getEmail(), result.getEmail());
    }

    @Test
    void getSchemaName_ShouldReturnUserSchemaName() {
        // Act
        String result = userService.getSchemaName();

        // Assert
        assertEquals(CrudConstants.USER_SCHEMA_NAME, result);
    }

    @Test
    void update_ShouldUpdateUserAndEncodePassword() {
        // Arrange
        Long userId = 1L;
        String rawPassword = "newPassword";
        String encodedPassword = "encodedPassword";

        UserDto dto = new UserDto();
        dto.setEmail("test@example.com");
        dto.setPasswordHash(rawPassword);

        User user = new User();
        user.setId(userId);
        user.setEmail("test@example.com");
        user.setPasswordHash(encodedPassword);

        when(bCryptPasswordEncoder.encode(rawPassword)).thenReturn(encodedPassword);
        when(userMapper.toDomainEntity(any(UserDto.class))).thenReturn(user);
        when(userRepository.save(any(User.class))).thenReturn(user);

        // Act
        UserDto result = userService.update(userId, dto);

        // Assert
        assertNotNull(result);
        assertEquals(userId, result.getId());
        assertEquals(dto.getEmail(), result.getEmail());
        verify(bCryptPasswordEncoder).encode(rawPassword);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void create_ShouldCreateUserAndEncodePassword() {
        // Arrange
        String rawPassword = "newPassword";
        String encodedPassword = "encodedPassword";

        UserDto dto = new UserDto();
        dto.setEmail("test@example.com");
        dto.setPasswordHash(rawPassword);

        User user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        user.setPasswordHash(encodedPassword);

        when(bCryptPasswordEncoder.encode(rawPassword)).thenReturn(encodedPassword);
        when(userMapper.toDomainEntity(any(UserDto.class))).thenReturn(user);
        when(userRepository.save(any(User.class))).thenReturn(user);

        // Act
        UserDto result = userService.create(dto);

        // Assert
        assertNotNull(result);
        assertEquals(user.getId(), result.getId());
        assertEquals(dto.getEmail(), result.getEmail());
        verify(bCryptPasswordEncoder).encode(rawPassword);
        verify(userRepository).save(any(User.class));
    }
}