package com.webstore.backoffice.services;

import com.webstore.backoffice.dtos.UserDTO;
import com.webstore.backoffice.models.User;
import com.webstore.backoffice.repositories.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class CrudService {
    private final UserRepository userRepository;

    public CrudService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserDTO getEntityById(Long id) {
//        User user = userRepository.findById(id).orElse(null);
        User userEntity = userRepository.findById(id)
                .map(user -> {
                    if (user.getIsoCountryCode() != null) user.getIsoCountryCode().getId();
                    if (user.getCountry() != null) user.getCountry().getId();
                    if (user.getGender() != null) user.getGender().getId();
                    return user;
                })
                .orElse(null);

        return new UserDTO(userEntity);
    }

}
