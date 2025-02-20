package com.webstore.backoffice.asserts.repositories;

import com.webstore.backoffice.crud.models.Log;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LogRepository extends JpaRepository<Log, Long> {
}
