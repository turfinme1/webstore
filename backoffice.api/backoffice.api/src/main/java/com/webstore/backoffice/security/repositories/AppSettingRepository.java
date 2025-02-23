package com.webstore.backoffice.security.repositories;

import com.webstore.backoffice.crud.models.AppSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppSettingRepository extends JpaRepository<AppSetting, Long> {
}
