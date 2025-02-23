package com.webstore.backoffice.crud.repositories;

import com.webstore.backoffice.crud.models.IsoCountryCode;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IsoCountryCodeRepository extends JpaRepository<IsoCountryCode, Long> {
}
