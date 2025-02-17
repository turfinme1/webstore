package com.webstore.backoffice.repositories;

import com.webstore.backoffice.models.IsoCountryCode;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IsoCountryCodeRepository extends JpaRepository<IsoCountryCode, Long> {
}
