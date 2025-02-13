package com.webstore.backoffice.repositories;

import com.webstore.backoffice.models.Log;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LogRepository extends JpaRepository<Log, Long> {
}
