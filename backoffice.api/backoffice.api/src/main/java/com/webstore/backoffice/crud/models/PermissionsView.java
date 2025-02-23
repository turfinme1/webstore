package com.webstore.backoffice.crud.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/**
 * Mapping for DB view
 */
@Entity
@Immutable
@Table(name = "permissions_view")
public class PermissionsView {
    @Id
    @Column(name = "id")
    private Long id;

    @Column(name = "interface_id")
    private Long interfaceId;

    @Column(name = "name", length = Integer.MAX_VALUE)
    private String name;

    @Column(name = "interface_name", length = Integer.MAX_VALUE)
    private String interfaceName;

    public Long getId() {
        return id;
    }

    public Long getInterfaceId() {
        return interfaceId;
    }

    public String getName() {
        return name;
    }

    public String getInterfaceName() {
        return interfaceName;
    }

    protected PermissionsView() {
    }
}