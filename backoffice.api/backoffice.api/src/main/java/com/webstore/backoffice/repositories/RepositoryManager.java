package com.webstore.backoffice.repositories;

import com.webstore.backoffice.models.Product;
import com.webstore.backoffice.models.User;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class RepositoryManager {

    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    public RepositoryManager(UserRepository userRepository, ProductRepository productRepository) {
        this.userRepository = userRepository;
        this.productRepository = productRepository;
    }

    @Bean
    public Map<String, JpaSpecificationExecutor<?>> repositories() {
        Map<String, JpaSpecificationExecutor<?>> repos = new HashMap<>();
        repos.put("users", userRepository);
        repos.put("products", productRepository);
        return repos;
    }

    @Bean
    public Map<Class<?>, JpaSpecificationExecutor<?>> typedRepositories() {
        Map<Class<?>, JpaSpecificationExecutor<?>> repos = new HashMap<>();
        repos.put(User.class, userRepository);
        repos.put(Product.class, productRepository);
        return repos;
    }
}
